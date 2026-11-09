# DevWorklog

**An open-source, AI-agent-friendly developer worklog system.**

DevWorklog gives AI coding agents standardized instructions and a strict Markdown format so they automatically document your daily software development tasks inside your repository—without databases, external APIs, or manual daily reports.

## Key Features

- **Agent-First:** Native Agent Skills (`SKILL.md`) plus idempotent `AGENTS.md` / instruction blocks for Claude Code, Codex CLI, Cursor, GitHub Copilot, Gemini CLI / Antigravity, OpenCode, and DeepSeek-based agents.
- **Git-Friendly Markdown:** Stored in `developer-worklog/YYYY/<month>/DD.md`.
- **Zero Runtime Dependencies:** Lightweight CLI requiring only Node.js >= 18.17.
- **Built-in Validator:** Check worklog structure, metadata, task continuation, and secret hygiene via `npx devworklog validate`.

## Quick Start

Initialize DevWorklog in your project:

```bash
npx devworklog init
```

Options:
- `--agents <list>` — Comma-separated agent IDs (`claude-code`, `codex`, `cursor`, `copilot`, `gemini`, `opencode`, `deepseek`)
- `--timezone <tz>` — IANA timezone (default: `Asia/Jakarta`)
- `--language <lang>` — Free-text language tag (default: `en`)
- `--dry-run` — Preview planned file operations without writing
- `--yes` — Skip interactive prompts and use defaults/detected agents

Validate your worklogs:

```bash
npx devworklog validate
npx devworklog validate --date 2026-11-09 --strict
npx devworklog validate --json
```

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Worklog Specification](docs/WORKLOG-SPECIFICATION.md)
- [Agent Skill Specification](docs/AGENT-SKILL-SPECIFICATION.md)
- [Agent Compatibility Matrix](docs/AGENT-COMPATIBILITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](docs/CONTRIBUTING.md)

## License

[MIT](LICENSE)
