---
name: devworklog
description: Record development work in the project's daily Markdown worklog. Use after completing, pausing, or getting blocked on any task that changed files in this repository, or when the user asks to log work.
---

# DevWorklog

You maintain a daily development worklog for this project. Write it truthfully, once per task per turn, at the end of the work.

## 1. When to write

Write or update the worklog when any of these is true:
- You finished a task that changed files → `Completed`
- You are ending your turn with unfinished work → `In Progress`
- You cannot continue (missing info, blocked dependency, needs a user decision) → `Blocked`
- The user asks you to log

Do **not** log: Q&A without file changes, changes the user rejected or you reverted, or edits to worklog files themselves.

## 2. Where to write

1. Read `devworklog.config.json` if it exists. Defaults: `timezone: "Asia/Jakarta"`, `worklogDir: "developer-worklog"`, `language: "en"`.
2. Get today's date **in that timezone**.
3. Path: `<worklogDir>/<YYYY>/<month>/<DD>.md`. `month` is the English lowercase month name (for example `november`), and `DD` is zero-padded.
   Example: `developer-worklog/2026/november/09.md`
4. If the file does not exist, create it starting with `# <Month> <DD>, <YYYY>` (for example `# November 09, 2026`).

## 3. New entry or update?

- Today's file already has an entry for this same task → **update that entry in place**.
- The most recent previous worklog file has this task with status In Progress or Blocked → **append** a new entry to today's file with the **same id** and `- **Continued From:** YYYY-MM-DD`.
- Otherwise → **append** a new entry with a new id.
- Unrelated pieces of work → separate entries.
- If unsure whether it is the same task, create a new entry.

Never edit files for past days. Never modify, reorder, or delete other entries.

## 4. Entry template

```md
<!-- devworklog:id=<kebab-case-slug> -->
## <Imperative title, ≤ 80 chars>

- **Category:** <Feature Development | Bug Fixing | Refactoring | Maintenance | Technical Improvement>
- **Status:** <Completed | In Progress | Blocked>
- **Scope:** <e.g. Backend, Frontend, Database, API, Infrastructure, CI/CD, Documentation, Testing>
- **Continued From:** <YYYY-MM-DD>   ← only when continuing a task from an earlier day
- **Blocker:** <one line>            ← only when Status is Blocked

### Summary
<1–5 sentences: what changed and why>

### Files
- <repo/relative/path.ext>
- <path> (added) | (deleted) | (renamed from <old>)

### Validation
- <command actually run> <observed result>

### Next Steps                       ← only when In Progress or Blocked
- <what remains>
```

Rules:
- The id is lowercase letters, digits, and hyphens. It is set once and never changed, and it is unique within the file.
- Leave out the optional lines (`Continued From`, `Blocker`, `Next Steps`) when they do not apply.
- No file changes → `- None.` under Files. No checks run → `- Not run.` under Validation.
- Field names, categories, and statuses are always in English. Title, Summary, Validation notes, and Next Steps use the configured `language`.

## 5. Choosing values

**Category** (choose the dominant goal, checked in this order): Bug Fixing → Feature Development → Technical Improvement → Refactoring → Maintenance.

**Status:**
- `Completed` only when all intended changes are done and no known check is failing.
- When torn between Completed and In Progress, choose In Progress.

**Updating an existing entry:**
- Refresh Status and Summary.
- Merge Files (union).
- Append new Validation results.
- Update Next Steps, or remove it when Completed.

## 6. Truthfulness (non-negotiable)

- List only files you actually changed. Prefer `git status` or `git diff --name-only` to confirm.
- List only commands you actually ran, with their real outcome.
- Never write secrets, tokens, credentials, `.env` values, or personal data.
- Do not paste code blocks. Short inline identifiers are fine.

## 7. After writing

- Keep the file's existing line endings.
- If the `devworklog` CLI is available, you may run `npx devworklog validate --date <YYYY-MM-DD>` and fix any errors in **your** entry.
- Tell the user in one line, for example:
  `Worklog updated: developer-worklog/2026/november/09.md (Implement Login Controller — Completed)`
