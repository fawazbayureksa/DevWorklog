import { ADAPTERS } from "../agents/registry.js";
import { getVersion } from "./version.js";

export function runHelp(command?: string): number {
  const agentIds = ADAPTERS.map((a) => a.id).join(", ");

  if (command === "init") {
    console.log(`Usage: devworklog init [options]

Initialize DevWorklog in the current project.

Options:
  --agents <list>     Comma-separated agent IDs (${agentIds})
  --timezone <tz>     IANA timezone (default: Asia/Jakarta)
  --language <lang>   BCP-47 language tag for free-text content (default: en)
  --worklog-dir <dir> Worklog directory path (default: developer-worklog)
  --dry-run           Preview planned file operations without modifying disk
  --yes, -y           Non-interactive mode; accept detected or default settings
`);
    return 0;
  }

  if (command === "validate") {
    console.log(`Usage: devworklog validate [path] [options]

Validate worklog Markdown files against the DevWorklog Specification v1.

Options:
  --date <YYYY-MM-DD> Validate only the worklog file for a specific date
  --strict            Treat warnings as errors (exit code 1)
  --json              Output diagnostics as JSON
`);
    return 0;
  }

  console.log(`DevWorklog CLI v${getVersion()}

Usage: devworklog <command> [options]

Commands:
  init                Initialize DevWorklog in the current project
  validate [path]     Validate worklog Markdown files
  version             Display installed version
  help [command]      Display help for a command

Run "devworklog help <command>" for detailed options.`);
  return 0;
}
