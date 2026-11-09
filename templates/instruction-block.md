## DevWorklog Instructions

Maintain the project's daily development worklog in `<worklogDir>/<YYYY>/<month>/<DD>.md` (configured in `devworklog.config.json`, defaults: `worklogDir: "developer-worklog"`, `timezone: "Asia/Jakarta"`, `language: "en"`). If full skill file exists in your skill directory (`devworklog/SKILL.md`), follow it as the primary reference.

### 1. When to Write
Write or update at most once per task at the end of your turn when:
- Task implementation is finished and validated → `Completed`
- Ending turn with unfinished work → `In Progress`
- Blocked by missing info, dependency, or decision → `Blocked`
- User explicitly asks to log work

Do NOT log pure Q&A, reverted/rejected changes, or edits to worklog files themselves.

### 2. File & Entry Format
File path uses 4-digit year, lowercase English month (`january`..`december`), and 2-digit day (`09.md`). Line 1 MUST be `# <Month> <DD>, <YYYY>` (e.g., `# November 09, 2026`).

```md
<!-- devworklog:id=<kebab-case-slug> -->
## <Imperative title, <= 80 chars>

- **Category:** <Feature Development | Bug Fixing | Refactoring | Maintenance | Technical Improvement>
- **Status:** <Completed | In Progress | Blocked>
- **Scope:** <e.g. Backend, Frontend, Database, API, Infrastructure, CI/CD, Documentation, Testing>
- **Continued From:** <YYYY-MM-DD>
- **Blocker:** <one-line reason>

### Summary
<1-5 sentences describing what changed and why>

### Files
- <repo/relative/path.ext>

### Validation
- <command actually run and observed result, or "- Not run.">

### Next Steps
- <remaining work, required ONLY when In Progress or Blocked>
```

### 3. Update & Truthfulness Rules
- **Same task today:** Update the existing entry in place (preserve `devworklog:id`, merge `Files`, update `Status`/`Summary`/`Validation`).
- **Continued from an earlier day:** Do NOT edit past files. Append a new entry today with the same `devworklog:id` and `- **Continued From:** YYYY-MM-DD`.
- **New unrelated task:** Append a new entry with a new unique `devworklog:id`.
- **Conditional fields:** Include `Continued From` only when continuing from an earlier day. Include `Blocker` only when `Status` is `Blocked`. Include `Next Steps` only when `Status` is `In Progress` or `Blocked`.
- **Language:** Structural headings, field names, categories, and statuses MUST remain in English; write Title, Summary, Validation notes, and Next Steps in the configured `language`.
- **Truthfulness:** Record only real file changes (`- None.` if none) and real validation commands (`- Not run.` if none). Never write secrets, credentials, or code blocks.
