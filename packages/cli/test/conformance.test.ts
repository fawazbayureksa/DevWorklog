import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../src/commands/init.js";
import { runValidate } from "../src/commands/validate.js";

describe("Agent Skill Conformance Scenarios (S1 - S10)", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("validates all 10 conformance scenarios (S1-S10) end-to-end", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dwl-conform-"));
    tempDirs.push(dir);

    await runInit({
      projectRoot: dir,
      language: "id",
      agents: "claude-code,codex",
      yes: true,
    });

    // S7: Pure Q&A without file changes -> 0 worklog files exist, validate passes with 0 files
    const s7Res = runValidate({ projectRoot: dir, strict: true });
    expect(s7Res.exitCode).toBe(0);
    expect(s7Res.summary.filesChecked).toBe(0);

    // Day 1 (2026-11-09):
    // - S1: Feature Development, Completed, real test command
    // - S4: Blocked with Blocker + Next Steps
    // - S5: No tests run -> "- Not run."
    // - S6: Two unrelated changes -> separate entries
    // - S3 (part 1): Task started on Day 1 as In Progress
    const day1Path = join(dir, "developer-worklog/2026/november/09.md");
    mkdirSync(dirname(day1Path), { recursive: true });

    const existingOtherEntry = `<!-- devworklog:id=implement-user-profile -->
## Implement User Profile Endpoint

- **Category:** Feature Development
- **Status:** Completed
- **Scope:** Backend, API

### Summary
Added GET /api/profile endpoint and controller.

### Files
- src/controllers/profile.ts (added)

### Validation
- \`npm test -- profile.test.ts\` passed (3 tests).`;

    const day1Initial = `# November 09, 2026

${existingOtherEntry}

<!-- devworklog:id=oauth-integration -->
## Add OAuth2 Provider Integration

- **Category:** Feature Development
- **Status:** In Progress
- **Scope:** Backend

### Summary
Started OAuth2 client wrapper; callback handler remains.

### Files
- src/auth/oauth.ts (added)

### Validation
- Not run.

### Next Steps
- Implement callback token exchange.

<!-- devworklog:id=payment-webhook -->
## Configure Payment Gateway Webhook

- **Category:** Technical Improvement
- **Status:** Blocked
- **Scope:** Infrastructure
- **Blocker:** Waiting for staging webhook signing key from provider.

### Summary
Prepared webhook route structure.

### Files
- src/routes/webhook.ts (added)

### Validation
- Not run.

### Next Steps
- Verify signature check once staging key is provisioned.
`;
    writeFileSync(day1Path, day1Initial, "utf8");

    // S2 + S8: Continue "oauth-integration" later on the same day (update in place)
    // while keeping `existingOtherEntry` untouched byte-for-byte.
    const day1Updated = day1Initial.replace(
      `### Summary
Started OAuth2 client wrapper; callback handler remains.

### Files
- src/auth/oauth.ts (added)`,
      `### Summary
Implemented OAuth2 client wrapper and token parser; callback route still in progress.

### Files
- src/auth/oauth.ts (added)
- src/auth/token.ts (added)`
    );
    writeFileSync(day1Path, day1Updated, "utf8");

    const day1ContentAfterUpdate = readFileSync(day1Path, "utf8");
    // S8 check: first entry untouched byte-for-byte
    expect(day1ContentAfterUpdate).toContain(existingOtherEntry);

    // Day 2 (2026-11-10):
    // - S3 (part 2): Finish "oauth-integration" from Day 1 with Continued From: 2026-11-09
    // - S9: Indonesian free-text with English structural labels
    const day2Path = join(dir, "developer-worklog/2026/november/10.md");
    const day2Content = `# November 10, 2026

<!-- devworklog:id=oauth-integration -->
## Menyelesaikan Integrasi OAuth2 Callback

- **Category:** Feature Development
- **Status:** Completed
- **Scope:** Backend
- **Continued From:** 2026-11-09

### Summary
Menambahkan handler callback OAuth2 dan pengujian integrasi token.

### Files
- src/auth/oauth.ts
- src/routes/oauth-callback.ts (added)

### Validation
- \`npm test -- oauth.test.ts\` berhasil (5 pengujian lulus).
`;
    writeFileSync(day2Path, day2Content, "utf8");

    // S10: Output passes `devworklog validate --strict` with exit code 0
    const finalValidation = runValidate({ projectRoot: dir, strict: true });
    expect(finalValidation.exitCode).toBe(0);
    expect(finalValidation.summary.filesChecked).toBe(2);
    expect(finalValidation.summary.errorCount).toBe(0);
    expect(finalValidation.summary.warningCount).toBe(0);
  });
});
