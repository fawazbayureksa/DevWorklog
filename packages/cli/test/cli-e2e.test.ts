import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../src/commands/init.js";
import { runValidate } from "../src/commands/validate.js";
import { runCli } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

describe("CLI init, adapters, and E2E example projects", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("initializes all 7 agents cleanly, deduplicates shared files, and is idempotent on re-run", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dwl-init-"));
    tempDirs.push(dir);

    // Pre-create AGENTS.md with user content
    writeFileSync(join(dir, "AGENTS.md"), "# Existing Project Rules\n\nDo not delete this.\n", "utf8");

    const code1 = await runInit({
      projectRoot: dir,
      agents: "claude-code,codex,cursor,copilot,gemini,opencode,deepseek",
      yes: true,
    });
    expect(code1).toBe(0);

    // Verify expected files exist
    expect(existsSync(join(dir, "devworklog.config.json"))).toBe(true);
    expect(existsSync(join(dir, "developer-worklog/.gitkeep"))).toBe(true);
    expect(existsSync(join(dir, ".claude/skills/devworklog/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents/skills/devworklog/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".cursor/rules/devworklog.mdc"))).toBe(true);
    expect(existsSync(join(dir, ".github/skills/devworklog/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".github/copilot-instructions.md"))).toBe(true);
    expect(existsSync(join(dir, ".opencode/skills/devworklog/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, "GEMINI.md"))).toBe(true);

    // Check user content in AGENTS.md was preserved and markers appear once
    const agentsMd = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("# Existing Project Rules\n\nDo not delete this.");
    expect(agentsMd.match(/<!-- devworklog:start -->/g)?.length).toBe(1);

    // Re-running init should succeed with no changes
    const snapshotBefore = readFileSync(join(dir, "AGENTS.md"), "utf8");
    const code2 = await runInit({
      projectRoot: dir,
      yes: true,
    });
    expect(code2).toBe(0);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toBe(snapshotBefore);
  });

  it("runs E2E init and validate on examples/node-app and examples/laravel-app", async () => {
    for (const exampleName of ["node-app", "laravel-app"]) {
      const dir = mkdtempSync(join(tmpdir(), `dwl-${exampleName}-`));
      tempDirs.push(dir);
      cpSync(resolve(repoRoot, "examples", exampleName), dir, { recursive: true });

      const initCode = await runInit({
        projectRoot: dir,
        agents: "claude-code,codex",
        yes: true,
      });
      expect(initCode).toBe(0);

      // Write a valid daily worklog entry
      const worklogFile = join(dir, "developer-worklog/2026/november/09.md");
      mkdirSync(dirname(worklogFile), { recursive: true });
      writeFileSync(
        worklogFile,
        `# November 09, 2026

<!-- devworklog:id=setup-auth -->
## Setup Authentication

- **Category:** Feature Development
- **Status:** Completed
- **Scope:** Backend

### Summary
Implemented initial authentication flow for ${exampleName}.

### Files
- src/auth.ts (added)

### Validation
- Unit tests passed.
`,
        "utf8"
      );

      const valRes = runValidate({ projectRoot: dir, strict: true });
      expect(valRes.exitCode).toBe(0);
      expect(valRes.summary.filesChecked).toBe(1);
      expect(valRes.summary.errorCount).toBe(0);
    }
  });

  it("handles CLI commands version, help, and unknown command exit code 2", async () => {
    expect(await runCli(["version"])).toBe(0);
    expect(await runCli(["help"])).toBe(0);
    expect(await runCli(["help", "init"])).toBe(0);
    expect(await runCli(["help", "validate"])).toBe(0);
    expect(await runCli(["unknown-cmd"])).toBe(2);
  });
});
