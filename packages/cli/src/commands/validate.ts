import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { loadConfig } from "../core/config.js";
import {
  CalendarDate,
  compareDates,
  parseIsoDate,
  parseWorklogPath,
  worklogPath,
} from "../core/paths.js";
import { parseWorklogMarkdown, WorklogDay } from "../validator/parser.js";
import { formatValidationReport, ValidationSummary } from "../validator/reporter.js";
import { Diagnostic, validateWorklogDay } from "../validator/rules.js";

export interface ValidateOptions {
  projectRoot?: string;
  targetPath?: string;
  date?: string;
  json?: boolean;
  strict?: boolean;
}

function collectMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const stat = statSync(dir);
  if (stat.isFile()) {
    return dir.endsWith(".md") ? [dir] : [];
  }
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results.sort();
}

export function runValidate(options: ValidateOptions = {}): {
  exitCode: number;
  summary: ValidationSummary;
  output: string;
} {
  const projectRoot = options.projectRoot ?? process.cwd();
  const { config } = loadConfig(projectRoot);
  const worklogRoot = resolve(projectRoot, config.worklogDir);

  const allWorklogFiles = collectMarkdownFiles(worklogRoot);

  // Parse all worklog files in worklogDir to build cross-file slug history
  const parsedByAbsPath = new Map<
    string,
    { day: WorklogDay; relToWorklog: string; date: CalendarDate | null }
  >();
  const slugHistory = new Map<string, CalendarDate[]>();

  for (const absFile of allWorklogFiles) {
    const relToRoot = relative(projectRoot, absFile).replace(/\\/g, "/");
    const relToWorklog = relative(worklogRoot, absFile).replace(/\\/g, "/");
    const content = readFileSync(absFile, "utf8");
    const day = parseWorklogMarkdown(content, relToRoot);
    const date = parseWorklogPath(relToWorklog);
    parsedByAbsPath.set(absFile, { day, relToWorklog, date });

    if (date) {
      for (const entry of day.entries) {
        if (entry.id) {
          const list = slugHistory.get(entry.id) ?? [];
          if (!list.some((d) => compareDates(d, date) === 0)) {
            list.push(date);
          }
          slugHistory.set(entry.id, list);
        }
      }
    }
  }

  // Determine which files to validate
  let filesToValidate: string[] = [];
  if (options.date) {
    const parsedDate = parseIsoDate(options.date);
    if (!parsedDate) {
      throw new Error(`Invalid --date value "${options.date}". Expected YYYY-MM-DD.`);
    }
    const relExpected = worklogPath(config, parsedDate);
    const absExpected = resolve(projectRoot, relExpected);
    if (!existsSync(absExpected)) {
      throw new Error(`Worklog file for ${options.date} not found at ${relExpected}.`);
    }
    filesToValidate = [absExpected];
  } else if (options.targetPath) {
    const absTarget = resolve(projectRoot, options.targetPath);
    if (!existsSync(absTarget)) {
      throw new Error(`Target path not found: ${options.targetPath}`);
    }
    filesToValidate = collectMarkdownFiles(absTarget);
  } else {
    filesToValidate = allWorklogFiles;
  }

  const diagnostics: Diagnostic[] = [];

  for (const absFile of filesToValidate) {
    let record = parsedByAbsPath.get(absFile);
    if (!record) {
      const relToRoot = relative(projectRoot, absFile).replace(/\\/g, "/");
      const relToWorklog = relative(worklogRoot, absFile).replace(/\\/g, "/");
      const content = readFileSync(absFile, "utf8");
      const day = parseWorklogMarkdown(content, relToRoot);
      const date = parseWorklogPath(relToWorklog);
      record = { day, relToWorklog, date };
    }
    const fileDiags = validateWorklogDay(record.day, record.relToWorklog, { slugHistory });
    diagnostics.push(...fileDiags);
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  const summary: ValidationSummary = {
    filesChecked: filesToValidate.length,
    errorCount,
    warningCount,
    diagnostics,
  };

  const output = formatValidationReport(summary, { json: options.json });
  const hasFailure = errorCount > 0 || (Boolean(options.strict) && warningCount > 0);

  return {
    exitCode: hasFailure ? 1 : 0,
    summary,
    output,
  };
}
