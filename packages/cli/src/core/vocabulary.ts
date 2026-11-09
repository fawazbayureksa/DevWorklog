import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Vocabulary {
  specVersion: number;
  categories: string[];
  statuses: string[];
  months: string[];
  recommendedScopes: string[];
  agents: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getAssetsDir(): string {
  // Works both from dist/core/vocabulary.js and src/core/vocabulary.ts
  const candidate = resolve(__dirname, "../../assets");
  return candidate;
}

let cachedVocab: Vocabulary | null = null;

export function loadVocabulary(): Vocabulary {
  if (cachedVocab) {
    return cachedVocab;
  }
  const vocabPath = resolve(getAssetsDir(), "spec/vocabulary.json");
  const raw = readFileSync(vocabPath, "utf8");
  cachedVocab = JSON.parse(raw) as Vocabulary;
  return cachedVocab;
}
