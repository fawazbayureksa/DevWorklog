#!/usr/bin/env node
import { parseArgs } from "node:util";
import { runHelp } from "./commands/help.js";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { runVersion } from "./commands/version.js";
import { ConfigError } from "./core/config.js";

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        agents: { type: "string" },
        timezone: { type: "string" },
        language: { type: "string" },
        "worklog-dir": { type: "string" },
        "dry-run": { type: "boolean", default: false },
        yes: { type: "boolean", short: "y", default: false },
        date: { type: "string" },
        json: { type: "boolean", default: false },
        strict: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });

    const command = positionals[0];

    if (values.version || command === "version") {
      return runVersion();
    }

    if (values.help || !command || command === "help") {
      const sub = command === "help" ? positionals[1] : command;
      return runHelp(sub);
    }

    if (command === "init") {
      return await runInit({
        agents: values.agents,
        timezone: values.timezone,
        language: values.language,
        worklogDir: values["worklog-dir"],
        dryRun: values["dry-run"],
        yes: values.yes,
      });
    }

    if (command === "validate") {
      const result = runValidate({
        targetPath: positionals[1],
        date: values.date,
        json: values.json,
        strict: values.strict,
      });
      console.log(result.output);
      return result.exitCode;
    }

    console.error(`Unknown command: "${command}". Run "devworklog help" for usage.`);
    return 2;
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`Configuration error: ${err.message}`);
      return 2;
    }
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }
}

// Execute when run directly as CLI bin
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("index.js") || process.argv[1].endsWith("devworklog"));

if (isMain) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
