import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(__dirname, "..");
const repoRoot = resolve(cliRoot, "../..");
const assetsDir = resolve(cliRoot, "assets");

rmSync(assetsDir, { recursive: true, force: true });
mkdirSync(assetsDir, { recursive: true });

cpSync(resolve(repoRoot, "spec"), resolve(assetsDir, "spec"), { recursive: true });
cpSync(resolve(repoRoot, "skill"), resolve(assetsDir, "skill"), { recursive: true });
cpSync(resolve(repoRoot, "templates"), resolve(assetsDir, "templates"), { recursive: true });

// Also copy README.md and LICENSE for npm packaging
cpSync(resolve(repoRoot, "README.md"), resolve(cliRoot, "README.md"));
cpSync(resolve(repoRoot, "LICENSE"), resolve(cliRoot, "LICENSE"));
