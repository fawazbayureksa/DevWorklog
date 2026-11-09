import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { detectEol, mergeBlock, normalizeEol } from "./markers.js";

export type FileOp =
  | {
      kind: "write";
      to: string; // relative to project root
      content: string;
      overwrite: "never" | "always" | "if-different";
    }
  | {
      kind: "merge-block";
      to: string; // relative to project root
      block: string;
    };

export type OpStatus = "created" | "updated" | "skipped" | "error";

export interface OpReport {
  file: string;
  status: OpStatus;
  detail?: string;
}

export function executeFileOps(
  projectRoot: string,
  ops: FileOp[],
  options: { dryRun?: boolean } = {}
): OpReport[] {
  const reports: OpReport[] = [];
  const dryRun = Boolean(options.dryRun);

  for (const op of ops) {
    const absTarget = resolve(projectRoot, op.to);
    try {
      if (op.kind === "write") {
        const exists = existsSync(absTarget);
        if (exists && op.overwrite === "never") {
          reports.push({ file: op.to, status: "skipped", detail: "already exists" });
          continue;
        }
        const existingContent = exists ? readFileSync(absTarget, "utf8") : null;
        const eol = existingContent !== null ? detectEol(existingContent) : "\n";
        const normalizedContent = normalizeEol(op.content, eol);

        if (exists && op.overwrite === "if-different" && existingContent === normalizedContent) {
          reports.push({ file: op.to, status: "skipped", detail: "up to date" });
          continue;
        }

        if (!dryRun) {
          mkdirSync(dirname(absTarget), { recursive: true });
          writeFileSync(absTarget, normalizedContent, "utf8");
        }
        reports.push({
          file: op.to,
          status: exists ? "updated" : "created",
        });
      } else if (op.kind === "merge-block") {
        const exists = existsSync(absTarget);
        const existingContent = exists ? readFileSync(absTarget, "utf8") : null;
        const result = mergeBlock(existingContent, op.block);

        if (result.action === "unchanged") {
          reports.push({ file: op.to, status: "skipped", detail: "marker block up to date" });
          continue;
        }

        if (!dryRun) {
          mkdirSync(dirname(absTarget), { recursive: true });
          writeFileSync(absTarget, result.content, "utf8");
        }
        reports.push({
          file: op.to,
          status: result.action === "created" ? "created" : "updated",
          detail: result.action,
        });
      }
    } catch (err) {
      reports.push({
        file: op.to,
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return reports;
}
