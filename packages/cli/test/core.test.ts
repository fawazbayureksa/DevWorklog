import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigError,
  DEFAULT_CONFIG,
  loadConfig,
  validateConfigObject,
} from "../src/core/config.js";
import { executeFileOps } from "../src/core/fileops.js";
import {
  END_MARKER,
  MarkerError,
  mergeBlock,
  START_MARKER,
} from "../src/core/markers.js";
import {
  formatHeading,
  parseHeadingDate,
  parseIsoDate,
  parseWorklogPath,
  todayIn,
  worklogPath,
} from "../src/core/paths.js";

describe("core/config", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("returns default config when file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "dwl-cfg-"));
    tempDirs.push(dir);
    const res = loadConfig(dir);
    expect(res.exists).toBe(false);
    expect(res.config).toEqual(DEFAULT_CONFIG);
  });

  it("rejects invalid timezone, unknown agent, and unknown properties", () => {
    expect(() => validateConfigObject({ timezone: "Invalid/Zone" })).toThrow(ConfigError);
    expect(() => validateConfigObject({ agents: ["unknown-agent"] })).toThrow(ConfigError);
    expect(() => validateConfigObject({ extraKey: true })).toThrow(ConfigError);
    expect(() => validateConfigObject({ version: 2 })).toThrow(ConfigError);
  });

  it("accepts valid custom configuration", () => {
    const cfg = validateConfigObject({
      version: 1,
      timezone: "UTC",
      worklogDir: "logs/work",
      language: "id",
      agents: ["claude-code", "cursor", "deepseek"],
    });
    expect(cfg.timezone).toBe("UTC");
    expect(cfg.worklogDir).toBe("logs/work");
    expect(cfg.language).toBe("id");
    expect(cfg.agents).toEqual(["claude-code", "cursor", "deepseek"]);
  });
});

describe("core/paths", () => {
  it("resolves timezone boundary (23:30 UTC is next day in Asia/Jakarta)", () => {
    const instant = new Date("2026-11-09T23:30:00Z");
    const utcDate = todayIn("UTC", instant);
    const jktDate = todayIn("Asia/Jakarta", instant);

    expect(utcDate).toEqual({ year: 2026, month: 11, day: 9 });
    expect(jktDate).toEqual({ year: 2026, month: 11, day: 10 });
  });

  it("handles leap days and rejects non-leap Feb 29", () => {
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate("2026-02-29")).toBeNull();
  });

  it("formats and parses worklog paths and headings", () => {
    const date = { year: 2026, month: 11, day: 9 };
    const rel = worklogPath({ worklogDir: "developer-worklog" }, date);
    expect(rel).toBe("developer-worklog/2026/november/09.md");

    expect(parseWorklogPath(rel)).toEqual(date);
    expect(parseWorklogPath("2026\\november\\09.md")).toEqual(date);

    const h1 = formatHeading(date);
    expect(h1).toBe("# November 09, 2026");
    expect(parseHeadingDate(h1)).toEqual(date);
  });
});

describe("core/markers", () => {
  it("creates, appends, replaces idempotently and preserves CRLF", () => {
    // 1. Create when null
    const created = mergeBlock(null, "Hello Block");
    expect(created.action).toBe("created");
    expect(created.content).toBe(`${START_MARKER}\nHello Block\n${END_MARKER}\n`);

    // 2. Idempotent second run
    const second = mergeBlock(created.content, "Hello Block");
    expect(second.action).toBe("unchanged");
    expect(second.content).toBe(created.content);

    // 3. Append when markers absent, preserving CRLF
    const existingCrlf = "# Project Guidelines\r\n\r\nKeep code clean.\r\n";
    const appended = mergeBlock(existingCrlf, "Line 1\nLine 2");
    expect(appended.action).toBe("appended");
    expect(appended.content).toContain("\r\n");
    expect(appended.content.startsWith("# Project Guidelines\r\n\r\nKeep code clean.\r\n\r\n")).toBe(
      true
    );

    // 4. Replace between markers without touching outside text
    const replaced = mergeBlock(appended.content, "Updated Line");
    expect(replaced.action).toBe("replaced");
    expect(replaced.content).toContain("# Project Guidelines\r\n\r\nKeep code clean.");
    expect(replaced.content).toContain("Updated Line");
    expect(replaced.content).not.toContain("Line 1");
  });

  it("throws MarkerError on malformed markers", () => {
    expect(() => mergeBlock(`${START_MARKER}\nonly start`, "block")).toThrow(MarkerError);
    expect(() => mergeBlock(`${END_MARKER}\n${START_MARKER}`, "block")).toThrow(MarkerError);
    expect(() =>
      mergeBlock(`${START_MARKER}\n${END_MARKER}\n${START_MARKER}\n${END_MARKER}`, "block")
    ).toThrow(MarkerError);
  });
});

describe("core/fileops", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("supports dryRun without writing files", () => {
    const dir = mkdtempSync(join(tmpdir(), "dwl-fops-"));
    tempDirs.push(dir);

    const dryReports = executeFileOps(
      dir,
      [{ kind: "write", to: "AGENTS.md", content: "hello", overwrite: "always" }],
      { dryRun: true }
    );
    expect(dryReports[0].status).toBe("created");
    expect(() => readFileSync(join(dir, "AGENTS.md"))).toThrow();

    writeFileSync(join(dir, "AGENTS.md"), "existing\n", "utf8");
    const skipReports = executeFileOps(dir, [
      { kind: "write", to: "AGENTS.md", content: "new", overwrite: "never" },
    ]);
    expect(skipReports[0].status).toBe("skipped");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toBe("existing\n");
  });
});
