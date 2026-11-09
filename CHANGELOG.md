# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-11-09

### Added
- DevWorklog Specification v1 (`docs/WORKLOG-SPECIFICATION.md`, `spec/vocabulary.json`, `spec/config.schema.json`).
- Canonical Agent Skill (`skill/devworklog/SKILL.md`) and fallback instruction block (`templates/instruction-block.md`).
- Zero-dependency CLI (`devworklog`) with `init`, `validate`, `version`, and `help` commands.
- Adapters for Claude Code, OpenAI Codex CLI, Cursor, GitHub Copilot, Gemini CLI / Antigravity, OpenCode, and DeepSeek (`AGENTS.md`).
- Idempotent HTML comment marker merge (`<!-- devworklog:start/end -->`) preserving existing user instructions and CRLF/LF line endings.
- 17 worklog validation rules (`WL001`–`WL050`) with `--date`, `--strict`, and `--json` support.
