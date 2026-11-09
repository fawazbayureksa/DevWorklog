import { Diagnostic } from "./rules.js";

export interface ValidationSummary {
  filesChecked: number;
  errorCount: number;
  warningCount: number;
  diagnostics: Diagnostic[];
}

export function formatValidationReport(
  summary: ValidationSummary,
  options: { json?: boolean } = {}
): string {
  if (options.json) {
    return JSON.stringify(summary, null, 2);
  }

  const lines: string[] = [];
  for (const d of summary.diagnostics) {
    const label = d.severity === "error" ? "ERROR" : "WARN ";
    lines.push(`${d.file}:${d.line}  ${label}  [${d.code}] ${d.message}`);
  }

  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(
    `Checked ${summary.filesChecked} worklog file(s): ${summary.errorCount} error(s), ${summary.warningCount} warning(s).`
  );

  return lines.join("\n");
}
