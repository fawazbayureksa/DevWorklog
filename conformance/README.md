# DevWorklog Conformance Test Suite (S1–S10)

This directory contains scenarios and fixtures used to verify that AI coding agents and the DevWorklog validator adhere to `docs/AGENT-SKILL-SPECIFICATION.md` (§9) and `docs/WORKLOG-SPECIFICATION.md`.

## Scenarios

| ID | Scenario | Fixture / Automated Check |
|---|---|---|
| **S1** | Implement small feature, tests pass (`Feature Development`, `Completed`) | `packages/cli/test/conformance.test.ts` |
| **S2** | Same task continued later the same day (in-place update, no duplicate slug) | `packages/cli/test/conformance.test.ts` |
| **S3** | Task started yesterday as `In Progress`, finished today (`Continued From`) | `packages/cli/test/conformance.test.ts` |
| **S4** | Agent hits missing credential (`Blocked`, `Blocker` + `Next Steps` present) | `packages/cli/test/conformance.test.ts` |
| **S5** | No tests run (`Validation` has `- Not run.`) | `packages/cli/test/conformance.test.ts` |
| **S6** | Two unrelated changes in one turn (two separate entries) | `packages/cli/test/conformance.test.ts` |
| **S7** | Pure Q&A without file changes (no worklog file created or modified) | `packages/cli/test/conformance.test.ts` |
| **S8** | Existing entries from other tasks present (untouched byte-for-byte) | `packages/cli/test/conformance.test.ts` |
| **S9** | `language: "id"` configured (English labels, Indonesian free text) | `packages/cli/test/conformance.test.ts` |
| **S10** | Output passes `devworklog validate` with exit code `0` | `packages/cli/test/conformance.test.ts` |
