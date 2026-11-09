import { describe, expect, it } from "vitest";
import { parseWorklogMarkdown } from "../src/validator/parser.js";
import { validateWorklogDay } from "../src/validator/rules.js";

const VALID_SAMPLE = `# November 10, 2026

<!-- devworklog:id=implement-login-controller -->
## Implement Login Controller

- **Category:** Feature Development
- **Status:** Completed
- **Scope:** Backend
- **Continued From:** 2026-11-09

### Summary
Added rate limiting and finished remaining login error handling.

### Files
- app/Http/Controllers/LoginController.php
- app/Http/Middleware/LoginThrottle.php (added)

### Validation
- \`php artisan test --filter=LoginTest\` passed (6 tests).

<!-- devworklog:id=fix-session-timeout -->
## Fix Session Timeout on Dashboard

- **Category:** Bug Fixing
- **Status:** Blocked
- **Scope:** Frontend, API
- **Blocker:** Waiting for confirmation of expected timeout value from product owner.

### Summary
Reproduced premature logout; root cause is token refresh not triggered on idle tabs.

### Files
- None.

### Validation
- Not run.

### Next Steps
- Implement refresh-on-focus once timeout value is confirmed.
`;

describe("validator rules (WL001 - WL050)", () => {
  it("passes a valid worklog file with zero errors and zero warnings", () => {
    const day = parseWorklogMarkdown(VALID_SAMPLE, "developer-worklog/2026/november/10.md");
    const slugHistory = new Map([
      ["implement-login-controller", [{ year: 2026, month: 11, day: 9 }]],
    ]);
    const diags = validateWorklogDay(day, "2026/november/10.md", { slugHistory });
    expect(diags).toEqual([]);
  });

  it("detects WL001, WL002, and WL003 (path and heading errors)", () => {
    const badPathDay = parseWorklogMarkdown(
      "# November 09, 2026\n",
      "developer-worklog/2026/11/09.md"
    );
    const diags1 = validateWorklogDay(badPathDay, "2026/11/09.md", { slugHistory: new Map() });
    expect(diags1.map((d) => d.code)).toContain("WL001");

    const mismatchDay = parseWorklogMarkdown(
      "# November 08, 2026\n\n# Extra H1\n",
      "developer-worklog/2026/november/09.md"
    );
    const diags2 = validateWorklogDay(mismatchDay, "2026/november/09.md", {
      slugHistory: new Map(),
    });
    expect(diags2.map((d) => d.code)).toContain("WL003");
    expect(diags2.map((d) => d.code)).toContain("WL002");
  });

  it("detects WL010 and WL011 (missing/invalid/duplicate slug)", () => {
    const md = `# November 09, 2026

## Missing Slug Entry

- **Category:** Maintenance
- **Status:** Completed
- **Scope:** Docs

### Summary
Done.

### Files
- None.

### Validation
- Not run.

<!-- devworklog:id=Invalid_Slug -->
## Bad Slug

- **Category:** Maintenance
- **Status:** Completed
- **Scope:** Docs

### Summary
Done.

### Files
- None.

### Validation
- Not run.
`;
    const day = parseWorklogMarkdown(md, "developer-worklog/2026/november/09.md");
    const diags = validateWorklogDay(day, "2026/november/09.md", { slugHistory: new Map() });
    expect(diags.filter((d) => d.code === "WL010").length).toBe(2);

    const dupMd = `# November 09, 2026

<!-- devworklog:id=same-slug -->
## First

- **Category:** Maintenance
- **Status:** Completed
- **Scope:** Docs

### Summary
1.

### Files
- None.

### Validation
- Not run.

<!-- devworklog:id=same-slug -->
## Second

- **Category:** Maintenance
- **Status:** Completed
- **Scope:** Docs

### Summary
2.

### Files
- None.

### Validation
- Not run.
`;
    const dupDay = parseWorklogMarkdown(dupMd, "developer-worklog/2026/november/09.md");
    const dupDiags = validateWorklogDay(dupDay, "2026/november/09.md", { slugHistory: new Map() });
    expect(dupDiags.map((d) => d.code)).toContain("WL011");
  });

  it("detects WL020, WL021, WL022, WL023, WL024, WL025 (metadata rules)", () => {
    const md = `# November 09, 2026

<!-- devworklog:id=meta-check -->
## Meta Check

- **Category:** UnknownCat
- **Status:** Completed
- **Blocker:** Should not be here
- **Continued From:** 2026-11-10

### Summary
Summary text.

### Files
- None.

### Validation
- Not run.
`;
    const day = parseWorklogMarkdown(md, "developer-worklog/2026/november/09.md");
    const diags = validateWorklogDay(day, "2026/november/09.md", { slugHistory: new Map() });
    const codes = diags.map((d) => d.code);
    expect(codes).toContain("WL020"); // Scope missing
    expect(codes).toContain("WL021"); // UnknownCat
    expect(codes).toContain("WL023"); // Blocker on Completed
    expect(codes).toContain("WL024"); // Continued From not earlier than 2026-11-09

    // Check WL022 + WL025
    const md2 = `# November 09, 2026

<!-- devworklog:id=prior-task -->
## Prior Task

- **Category:** Bug Fixing
- **Status:** BadStatus
- **Scope:** API

### Summary
Summary.

### Files
- None.

### Validation
- Not run.
`;
    const day2 = parseWorklogMarkdown(md2, "developer-worklog/2026/november/09.md");
    const slugHistory = new Map([["prior-task", [{ year: 2026, month: 11, day: 8 }]]]);
    const diags2 = validateWorklogDay(day2, "2026/november/09.md", { slugHistory });
    expect(diags2.map((d) => d.code)).toContain("WL022");
    expect(diags2.map((d) => d.code)).toContain("WL025");
  });

  it("detects WL030, WL031, WL032, WL040, WL041, WL050 (sections, paths, secrets, title length)", () => {
    const longTitle = "A".repeat(85);
    const md = `# November 09, 2026

<!-- devworklog:id=sec-check -->
## ${longTitle}

- **Category:** Feature Development
- **Status:** In Progress
- **Scope:** Backend

### Files
- C:\\absolute\\windows\\path.ts

### Summary
Password assignment password=supersecret12345 in summary.

### CustomSection
- Unexpected.
`;
    const day = parseWorklogMarkdown(md, "developer-worklog/2026/november/09.md");
    const diags = validateWorklogDay(day, "2026/november/09.md", { slugHistory: new Map() });
    const codes = diags.map((d) => d.code);
    expect(codes).toContain("WL030"); // Missing Validation
    expect(codes).toContain("WL031"); // Missing Next Steps for In Progress
    expect(codes).toContain("WL032"); // Out of order Files -> Summary & CustomSection
    expect(codes).toContain("WL040"); // Absolute backslash path
    expect(codes).toContain("WL041"); // Secret detected
    expect(codes).toContain("WL050"); // Long title
  });
});
