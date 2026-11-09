import { DevWorklogConfig } from "../core/config.js";
import { FileOp } from "../core/fileops.js";

export interface InstallContext {
  projectRoot: string;
  config: DevWorklogConfig;
  skillContent: string;
  instructionBlock: string;
  cursorRuleTemplate: string;
}

export interface AgentAdapter {
  id: string;
  displayName: string;
  detect(projectRoot: string): boolean;
  install(ctx: InstallContext): FileOp[];
}
