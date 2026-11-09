import {
  CalendarDate,
  compareDates,
  formatHeading,
  parseHeadingDate,
  parseIsoDate,
  parseWorklogPath,
} from "../core/paths.js";
import { loadVocabulary } from "../core/vocabulary.js";
import { WorklogDay } from "./parser.js";

export type Severity = "error" | "warning";

export interface Diagnostic {
  code: string;
  severity: Severity;
  file: string;
  line: number;
  message: string;
}

export interface ValidationContext {
  /**
   * Maps slug -> earliest/previous CalendarDates where this slug appeared.
   */
  slugHistory: Map<string, CalendarDate[]>;
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KNOWN_SECTIONS = ["Summary", "Files", "Validation", "Next Steps", "Notes"];

const SECRET_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Private Key header", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "GitHub Token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { label: "Password assignment", regex: /\b(?:password|passwd|secret|api_key|apikey)\s*=\s*['"]?[^\s'"]{6,}/i },
];

export function validateWorklogDay(
  day: WorklogDay,
  relToWorklogDir: string,
  ctx: ValidationContext
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const vocab = loadVocabulary();
  const validCategories = new Set(vocab.categories);
  const validStatuses = new Set(vocab.statuses);

  // WL001: File path does not match YYYY/<month>/DD.md
  const pathDate = parseWorklogPath(relToWorklogDir);
  if (!pathDate) {
    diagnostics.push({
      code: "WL001",
      severity: "error",
      file: day.filePath,
      line: 1,
      message: `File path "${relToWorklogDir}" does not match expected pattern YYYY/<month>/DD.md.`,
    });
  }

  // WL002: Missing or malformed H1 date heading, or extra H1s
  let headingDate: CalendarDate | null = null;
  if (!day.h1 || day.h1Line !== 1) {
    diagnostics.push({
      code: "WL002",
      severity: "error",
      file: day.filePath,
      line: day.h1Line ?? 1,
      message: `Line 1 must be an H1 date heading in format "# <Month> <DD>, <YYYY>".`,
    });
  } else {
    headingDate = parseHeadingDate(day.h1);
    if (!headingDate) {
      diagnostics.push({
        code: "WL002",
        severity: "error",
        file: day.filePath,
        line: day.h1Line,
        message: `Malformed H1 date heading "${day.h1}". Expected "# <Month> <DD>, <YYYY>".`,
      });
    }
  }

  for (const extra of day.extraH1s) {
    diagnostics.push({
      code: "WL002",
      severity: "error",
      file: day.filePath,
      line: extra.line,
      message: `Unexpected additional H1 heading "${extra.text}". Only one H1 is allowed on line 1.`,
    });
  }

  // WL003: H1 date does not match file path
  if (pathDate && headingDate && compareDates(pathDate, headingDate) !== 0) {
    diagnostics.push({
      code: "WL003",
      severity: "error",
      file: day.filePath,
      line: day.h1Line ?? 1,
      message: `H1 heading "${day.h1}" does not match file date (${formatHeading(pathDate)}).`,
    });
  }

  const effectiveDate = pathDate ?? headingDate;

  // Orphan ID markers -> WL010
  for (const orphan of day.orphanIdMarkers) {
    diagnostics.push({
      code: "WL010",
      severity: "error",
      file: day.filePath,
      line: orphan.line,
      message: `ID marker "${orphan.raw}" must be placed on the line directly above an H2 entry heading.`,
    });
  }

  const seenSlugsInFile = new Set<string>();

  for (const entry of day.entries) {
    // WL050: Title longer than 80 characters
    if (entry.title.length > 80) {
      diagnostics.push({
        code: "WL050",
        severity: "warning",
        file: day.filePath,
        line: entry.titleLine,
        message: `Entry title is ${entry.title.length} characters long (maximum recommended is 80).`,
      });
    }

    // WL010: Entry missing ID marker, or invalid slug
    if (entry.id === null) {
      diagnostics.push({
        code: "WL010",
        severity: "error",
        file: day.filePath,
        line: entry.titleLine,
        message: `Entry "## ${entry.title}" is missing a preceding "<!-- devworklog:id=<slug> -->" marker.`,
      });
    } else if (!SLUG_RE.test(entry.id)) {
      diagnostics.push({
        code: "WL010",
        severity: "error",
        file: day.filePath,
        line: entry.idLine ?? entry.titleLine,
        message: `Invalid task ID slug "${entry.id}". Must match lowercase kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$).`,
      });
    } else {
      // WL011: Duplicate slug within the same file
      if (seenSlugsInFile.has(entry.id)) {
        diagnostics.push({
          code: "WL011",
          severity: "error",
          file: day.filePath,
          line: entry.idLine ?? entry.titleLine,
          message: `Duplicate task ID slug "${entry.id}" within the same file.`,
        });
      }
      seenSlugsInFile.add(entry.id);
    }

    // Metadata fields
    const fieldMap = new Map<string, { value: string; line: number }>();
    for (const f of entry.fields) {
      fieldMap.set(f.name, { value: f.value, line: f.line });
    }

    // WL020: Required metadata field missing (Category, Status, Scope)
    for (const reqField of ["Category", "Status", "Scope"]) {
      const f = fieldMap.get(reqField);
      if (!f || f.value.length === 0) {
        diagnostics.push({
          code: "WL020",
          severity: "error",
          file: day.filePath,
          line: entry.titleLine,
          message: `Entry "## ${entry.title}" is missing required metadata field "${reqField}".`,
        });
      }
    }

    // WL021: Unknown category
    const categoryField = fieldMap.get("Category");
    if (categoryField && categoryField.value.length > 0 && !validCategories.has(categoryField.value)) {
      diagnostics.push({
        code: "WL021",
        severity: "error",
        file: day.filePath,
        line: categoryField.line,
        message: `Unknown Category "${categoryField.value}". Allowed values: ${vocab.categories.join(", ")}.`,
      });
    }

    // WL022: Unknown status
    const statusField = fieldMap.get("Status");
    const statusVal = statusField?.value ?? "";
    if (statusField && statusVal.length > 0 && !validStatuses.has(statusVal)) {
      diagnostics.push({
        code: "WL022",
        severity: "error",
        file: day.filePath,
        line: statusField.line,
        message: `Unknown Status "${statusVal}". Allowed values: ${vocab.statuses.join(", ")}.`,
      });
    }

    // WL023: Blocker missing for Blocked, or present otherwise
    const blockerField = fieldMap.get("Blocker");
    if (statusVal === "Blocked") {
      if (!blockerField || blockerField.value.length === 0) {
        diagnostics.push({
          code: "WL023",
          severity: "error",
          file: day.filePath,
          line: statusField?.line ?? entry.titleLine,
          message: `Entry with Status "Blocked" must include a non-empty "Blocker" metadata field.`,
        });
      }
    } else if (blockerField) {
      diagnostics.push({
        code: "WL023",
        severity: "error",
        file: day.filePath,
        line: blockerField.line,
        message: `"Blocker" field is only allowed when Status is "Blocked" (current Status: "${statusVal || "missing"}").`,
      });
    }

    // WL024: Continued From invalid date, or not earlier than file date
    const continuedField = fieldMap.get("Continued From");
    if (continuedField) {
      const cfDate = parseIsoDate(continuedField.value);
      if (!cfDate) {
        diagnostics.push({
          code: "WL024",
          severity: "error",
          file: day.filePath,
          line: continuedField.line,
          message: `Invalid "Continued From" date "${continuedField.value}". Expected YYYY-MM-DD.`,
        });
      } else if (effectiveDate && compareDates(cfDate, effectiveDate) >= 0) {
        diagnostics.push({
          code: "WL024",
          severity: "error",
          file: day.filePath,
          line: continuedField.line,
          message: `"Continued From" date (${continuedField.value}) must be earlier than the file's date.`,
        });
      }
    }

    // WL025: Slug exists on an earlier day but Continued From is missing
    if (entry.id && effectiveDate) {
      const priorDates = ctx.slugHistory.get(entry.id) ?? [];
      const hasEarlierDay = priorDates.some((d) => compareDates(d, effectiveDate) < 0);
      if (hasEarlierDay && !continuedField) {
        diagnostics.push({
          code: "WL025",
          severity: "warning",
          file: day.filePath,
          line: entry.titleLine,
          message: `Task ID "${entry.id}" appeared on an earlier day, but "Continued From" metadata field is missing.`,
        });
      }
    }

    // Sections validation
    const sectionMap = new Map<string, { lines: string[]; bullets: string[]; line: number }>();
    let lastKnownIdx = -1;
    let outOfOrderReported = false;

    for (const sec of entry.sections) {
      const knownIdx = KNOWN_SECTIONS.indexOf(sec.name);
      if (knownIdx === -1) {
        diagnostics.push({
          code: "WL032",
          severity: "warning",
          file: day.filePath,
          line: sec.line,
          message: `Unknown H3 section "### ${sec.name}". Allowed sections: ${KNOWN_SECTIONS.join(", ")}.`,
        });
      } else {
        if (knownIdx < lastKnownIdx && !outOfOrderReported) {
          diagnostics.push({
            code: "WL032",
            severity: "warning",
            file: day.filePath,
            line: sec.line,
            message: `Section "### ${sec.name}" is out of order. Expected order: ${KNOWN_SECTIONS.join(" -> ")}.`,
          });
          outOfOrderReported = true;
        }
        lastKnownIdx = Math.max(lastKnownIdx, knownIdx);
      }
      sectionMap.set(sec.name, sec);
    }

    // WL030: Required section missing or empty (Summary, Files, Validation)
    for (const reqSec of ["Summary", "Files", "Validation"]) {
      const sec = sectionMap.get(reqSec);
      if (!sec || sec.lines.length === 0) {
        diagnostics.push({
          code: "WL030",
          severity: "error",
          file: day.filePath,
          line: sec?.line ?? entry.titleLine,
          message: `Entry "## ${entry.title}" is missing required section "### ${reqSec}" or its content is empty.`,
        });
      }
    }

    // WL031: Next Steps missing for In Progress/Blocked, or present for Completed
    const nextStepsSec = sectionMap.get("Next Steps");
    if (statusVal === "In Progress" || statusVal === "Blocked") {
      if (!nextStepsSec || nextStepsSec.lines.length === 0) {
        diagnostics.push({
          code: "WL031",
          severity: "error",
          file: day.filePath,
          line: entry.titleLine,
          message: `Entry with Status "${statusVal}" must include a non-empty "### Next Steps" section.`,
        });
      }
    } else if (statusVal === "Completed" && nextStepsSec) {
      diagnostics.push({
        code: "WL031",
        severity: "error",
        file: day.filePath,
        line: nextStepsSec.line,
        message: `"### Next Steps" section is not allowed when Status is "Completed".`,
      });
    }

    // WL040: File path in Files uses backslashes or is absolute
    const filesSec = sectionMap.get("Files");
    if (filesSec) {
      for (const bullet of filesSec.bullets) {
        if (bullet === "None." || bullet === "None") continue;
        // Strip optional suffix like (added), (deleted), (renamed from ...)
        const cleanPath = bullet.replace(/\s+\((?:added|deleted|renamed from [^)]+)\)$/, "").trim();
        const isAbs =
          cleanPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(cleanPath);
        const hasBackslash = cleanPath.includes("\\");
        if (isAbs || hasBackslash) {
          diagnostics.push({
            code: "WL040",
            severity: "warning",
            file: day.filePath,
            line: filesSec.line,
            message: `File entry "${cleanPath}" must be a repository-relative path using forward slashes.`,
          });
        }
      }
    }

    // WL041: Possible secret detected across fields and sections
    const linesToScan: { text: string; line: number }[] = [
      { text: entry.title, line: entry.titleLine },
      ...entry.fields.map((f) => ({ text: f.value, line: f.line })),
      ...entry.sections.flatMap((s) => s.lines.map((l) => ({ text: l, line: s.line }))),
    ];

    for (const item of linesToScan) {
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(item.text)) {
          diagnostics.push({
            code: "WL041",
            severity: "warning",
            file: day.filePath,
            line: item.line,
            message: `Possible secret detected (${pat.label}). Never store credentials or secrets in worklogs.`,
          });
        }
      }
    }
  }

  return diagnostics;
}
