import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FileOp } from "../core/fileops.js";
import { getAssetsDir } from "../core/vocabulary.js";
import { AgentAdapter, InstallContext } from "./types.js";

function hasAnyPath(root: string, relPaths: string[]): boolean {
  return relPaths.some((p) => existsSync(resolve(root, p)));
}

const claudeCodeAdapter: AgentAdapter = {
  id: "claude-code",
  displayName: "Claude Code",
  detect: (root) => hasAnyPath(root, [".claude", "CLAUDE.md"]),
  install: (ctx) => [
    {
      kind: "write",
      to: ".claude/skills/devworklog/SKILL.md",
      content: ctx.skillContent,
      overwrite: "if-different",
    },
    {
      kind: "merge-block",
      to: "CLAUDE.md",
      block: ctx.instructionBlock,
    },
  ],
};

const codexAdapter: AgentAdapter = {
  id: "codex",
  displayName: "OpenAI Codex CLI",
  detect: (root) => hasAnyPath(root, [".agents", "AGENTS.md"]),
  install: (ctx) => [
    {
      kind: "write",
      to: ".agents/skills/devworklog/SKILL.md",
      content: ctx.skillContent,
      overwrite: "if-different",
    },
    {
      kind: "merge-block",
      to: "AGENTS.md",
      block: ctx.instructionBlock,
    },
  ],
};

const cursorAdapter: AgentAdapter = {
  id: "cursor",
  displayName: "Cursor",
  detect: (root) => hasAnyPath(root, [".cursor", ".cursorrules"]),
  install: (ctx) => {
    const cursorRuleContent = ctx.cursorRuleTemplate.replace(
      "{{INSTRUCTION_BLOCK}}",
      ctx.instructionBlock.trim()
    );
    return [
      {
        kind: "write",
        to: ".cursor/rules/devworklog.mdc",
        content: cursorRuleContent,
        overwrite: "if-different",
      },
      {
        kind: "merge-block",
        to: "AGENTS.md",
        block: ctx.instructionBlock,
      },
    ];
  },
};

const copilotAdapter: AgentAdapter = {
  id: "copilot",
  displayName: "GitHub Copilot",
  detect: (root) => hasAnyPath(root, [".github/copilot-instructions.md", ".github/skills"]),
  install: (ctx) => [
    {
      kind: "write",
      to: ".github/skills/devworklog/SKILL.md",
      content: ctx.skillContent,
      overwrite: "if-different",
    },
    {
      kind: "merge-block",
      to: ".github/copilot-instructions.md",
      block: ctx.instructionBlock,
    },
  ],
};

const geminiAdapter: AgentAdapter = {
  id: "gemini",
  displayName: "Gemini CLI / Antigravity",
  detect: (root) => hasAnyPath(root, [".gemini", ".agent", "GEMINI.md"]),
  install: (ctx) => [
    {
      kind: "write",
      to: ".agents/skills/devworklog/SKILL.md",
      content: ctx.skillContent,
      overwrite: "if-different",
    },
    {
      kind: "merge-block",
      to: "GEMINI.md",
      block: ctx.instructionBlock,
    },
    {
      kind: "merge-block",
      to: "AGENTS.md",
      block: ctx.instructionBlock,
    },
  ],
};

const opencodeAdapter: AgentAdapter = {
  id: "opencode",
  displayName: "OpenCode",
  detect: (root) => hasAnyPath(root, [".opencode"]),
  install: (ctx) => [
    {
      kind: "write",
      to: ".opencode/skills/devworklog/SKILL.md",
      content: ctx.skillContent,
      overwrite: "if-different",
    },
    {
      kind: "merge-block",
      to: "AGENTS.md",
      block: ctx.instructionBlock,
    },
  ],
};

const deepseekAdapter: AgentAdapter = {
  id: "deepseek",
  displayName: "DeepSeek (AGENTS.md)",
  detect: () => false,
  install: (ctx) => [
    {
      kind: "merge-block",
      to: "AGENTS.md",
      block: ctx.instructionBlock,
    },
  ],
};

export const ADAPTERS: AgentAdapter[] = [
  claudeCodeAdapter,
  codexAdapter,
  cursorAdapter,
  copilotAdapter,
  geminiAdapter,
  opencodeAdapter,
  deepseekAdapter,
];

export function getAdapter(id: string): AgentAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

export function detectAgents(projectRoot: string): string[] {
  return ADAPTERS.filter((a) => a.detect(projectRoot)).map((a) => a.id);
}

export function loadInstallTemplates(): Pick<
  InstallContext,
  "skillContent" | "instructionBlock" | "cursorRuleTemplate"
> {
  const assetsDir = getAssetsDir();
  return {
    skillContent: readFileSync(resolve(assetsDir, "skill/devworklog/SKILL.md"), "utf8"),
    instructionBlock: readFileSync(resolve(assetsDir, "templates/instruction-block.md"), "utf8"),
    cursorRuleTemplate: readFileSync(resolve(assetsDir, "templates/cursor-rule.mdc"), "utf8"),
  };
}

/**
 * Builds a deduplicated list of FileOps across selected agent adapters.
 */
export function buildAgentInstallPlan(agentIds: string[], ctx: InstallContext): FileOp[] {
  const ops: FileOp[] = [];
  const seenTargets = new Set<string>();

  for (const id of agentIds) {
    const adapter = getAdapter(id);
    if (!adapter) {
      throw new Error(`Unknown agent adapter: "${id}"`);
    }
    for (const op of adapter.install(ctx)) {
      const key = `${op.kind}:${op.to}`;
      if (!seenTargets.has(key)) {
        seenTargets.add(key);
        ops.push(op);
      }
    }
  }

  return ops;
}
