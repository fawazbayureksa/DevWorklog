import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { loadVocabulary } from "./vocabulary.js";

export interface DevWorklogConfig {
  $schema?: string;
  version: number;
  timezone: string;
  worklogDir: string;
  language: string;
  agents: string[];
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export const CONFIG_FILENAME = "devworklog.config.json";

export const DEFAULT_CONFIG: DevWorklogConfig = {
  $schema: "https://unpkg.com/devworklog/assets/spec/config.schema.json",
  version: 1,
  timezone: "Asia/Jakarta",
  worklogDir: "developer-worklog",
  language: "en",
  agents: ["claude-code", "codex"],
};

export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidLanguage(lang: string): boolean {
  if (!lang || typeof lang !== "string" || lang.trim().length < 2) return false;
  try {
    const canonical = Intl.getCanonicalLocales(lang);
    return canonical.length > 0;
  } catch {
    return false;
  }
}

export function validateConfigObject(raw: unknown): DevWorklogConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ConfigError("Configuration must be a JSON object.");
  }

  const obj = raw as Record<string, unknown>;
  const allowedKeys = new Set(["$schema", "version", "timezone", "worklogDir", "language", "agents"]);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      throw new ConfigError(`Unknown configuration property: "${key}".`);
    }
  }

  const version = obj.version ?? DEFAULT_CONFIG.version;
  if (version !== 1) {
    throw new ConfigError(`Unsupported config version: ${String(version)}. Expected 1.`);
  }

  const timezone = obj.timezone ?? DEFAULT_CONFIG.timezone;
  if (typeof timezone !== "string" || !isValidTimezone(timezone)) {
    throw new ConfigError(`Invalid IANA timezone: "${String(timezone)}".`);
  }

  const worklogDir = obj.worklogDir ?? DEFAULT_CONFIG.worklogDir;
  if (typeof worklogDir !== "string" || worklogDir.trim().length === 0 || isAbsolute(worklogDir)) {
    throw new ConfigError(`"worklogDir" must be a non-empty relative path.`);
  }

  const language = obj.language ?? DEFAULT_CONFIG.language;
  if (typeof language !== "string" || !isValidLanguage(language)) {
    throw new ConfigError(`Invalid BCP-47 language tag: "${String(language)}".`);
  }

  const vocab = loadVocabulary();
  const validAgents = new Set(vocab.agents);
  const agentsRaw = obj.agents ?? DEFAULT_CONFIG.agents;
  if (!Array.isArray(agentsRaw) || !agentsRaw.every((a) => typeof a === "string")) {
    throw new ConfigError(`"agents" must be an array of agent ID strings.`);
  }

  const seenAgents = new Set<string>();
  for (const agent of agentsRaw as string[]) {
    if (!validAgents.has(agent)) {
      throw new ConfigError(
        `Unknown agent ID "${agent}". Supported agents: ${vocab.agents.join(", ")}.`
      );
    }
    if (seenAgents.has(agent)) {
      throw new ConfigError(`Duplicate agent ID "${agent}" in configuration.`);
    }
    seenAgents.add(agent);
  }

  return {
    ...(typeof obj.$schema === "string" ? { $schema: obj.$schema } : { $schema: DEFAULT_CONFIG.$schema }),
    version: 1,
    timezone,
    worklogDir: worklogDir.replace(/\\/g, "/").replace(/\/+$/, ""),
    language,
    agents: agentsRaw as string[],
  };
}

export function loadConfig(projectRoot: string): { config: DevWorklogConfig; exists: boolean; path: string } {
  const configPath = resolve(projectRoot, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return {
      config: { ...DEFAULT_CONFIG, agents: [...DEFAULT_CONFIG.agents] },
      exists: false,
      path: configPath,
    };
  }

  let parsed: unknown;
  try {
    const content = readFileSync(configPath, "utf8");
    parsed = JSON.parse(content);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse ${CONFIG_FILENAME}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return {
    config: validateConfigObject(parsed),
    exists: true,
    path: configPath,
  };
}
