import { createInterface } from "node:readline/promises";
import {
  ADAPTERS,
  buildAgentInstallPlan,
  detectAgents,
  loadInstallTemplates,
} from "../agents/registry.js";
import {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  DevWorklogConfig,
  loadConfig,
  validateConfigObject,
} from "../core/config.js";
import { executeFileOps, FileOp } from "../core/fileops.js";

export interface InitOptions {
  projectRoot?: string;
  agents?: string;
  timezone?: string;
  language?: string;
  worklogDir?: string;
  dryRun?: boolean;
  yes?: boolean;
  interactive?: boolean;
}

async function promptForAgents(): Promise<string[]> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    console.log("Available AI coding agents:");
    ADAPTERS.forEach((a, idx) => {
      console.log(`  ${idx + 1}. ${a.id} (${a.displayName})`);
    });
    const answer = await rl.question(
      `Enter comma-separated agent IDs [default: ${DEFAULT_CONFIG.agents.join(",")}]: `
    );
    const trimmed = answer.trim();
    if (!trimmed) {
      return [...DEFAULT_CONFIG.agents];
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } finally {
    rl.close();
  }
}

export async function runInit(options: InitOptions = {}): Promise<number> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const existing = loadConfig(projectRoot);

  let selectedAgents: string[];
  if (options.agents) {
    selectedAgents = options.agents
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (existing.exists) {
    selectedAgents = existing.config.agents;
  } else {
    const detected = detectAgents(projectRoot);
    if (detected.length > 0) {
      selectedAgents = detected;
    } else if (!options.yes && (options.interactive ?? Boolean(process.stdin.isTTY))) {
      selectedAgents = await promptForAgents();
    } else {
      selectedAgents = [...DEFAULT_CONFIG.agents];
    }
  }

  const candidateConfig: DevWorklogConfig = validateConfigObject({
    $schema: existing.config.$schema ?? DEFAULT_CONFIG.$schema,
    version: 1,
    timezone: options.timezone ?? existing.config.timezone,
    worklogDir: options.worklogDir ?? existing.config.worklogDir,
    language: options.language ?? existing.config.language,
    agents: selectedAgents,
  });

  const templates = loadInstallTemplates();
  const ops: FileOp[] = [];

  // 1. devworklog.config.json (never overwrite existing unless flags explicitly changed it, or create if missing)
  const shouldUpdateConfig =
    !existing.exists ||
    Boolean(options.agents || options.timezone || options.language || options.worklogDir);

  ops.push({
    kind: "write",
    to: CONFIG_FILENAME,
    content: `${JSON.stringify(candidateConfig, null, 2)}\n`,
    overwrite: shouldUpdateConfig ? "if-different" : "never",
  });

  // 2. <worklogDir>/.gitkeep
  ops.push({
    kind: "write",
    to: `${candidateConfig.worklogDir}/.gitkeep`,
    content: "",
    overwrite: "never",
  });

  // 3. Agent adapter operations
  const agentOps = buildAgentInstallPlan(candidateConfig.agents, {
    projectRoot,
    config: candidateConfig,
    ...templates,
  });
  ops.push(...agentOps);

  const reports = executeFileOps(projectRoot, ops, { dryRun: options.dryRun });

  const prefix = options.dryRun ? "[dry-run] " : "";
  for (const r of reports) {
    const detailStr = r.detail ? ` (${r.detail})` : "";
    console.log(`${prefix}${r.status.toUpperCase().padEnd(8)} ${r.file}${detailStr}`);
  }

  const hasError = reports.some((r) => r.status === "error");
  if (hasError) {
    return 1;
  }

  console.log(
    `\n${prefix}DevWorklog initialized for agent(s): ${candidateConfig.agents.join(", ")}.`
  );
  return 0;
}
