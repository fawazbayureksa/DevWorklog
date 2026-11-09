export const START_MARKER = "<!-- devworklog:start -->";
export const END_MARKER = "<!-- devworklog:end -->";

export class MarkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkerError";
  }
}

export type MergeAction = "created" | "appended" | "replaced" | "unchanged";

export interface MergeResult {
  content: string;
  action: MergeAction;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

export function detectEol(text: string): "\r\n" | "\n" {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function normalizeEol(text: string, eol: "\r\n" | "\n"): string {
  return text.replace(/\r?\n/g, eol);
}

export function mergeBlock(existingContent: string | null, rawBlock: string): MergeResult {
  const eol = existingContent !== null ? detectEol(existingContent) : "\n";
  const cleanBlock = normalizeEol(rawBlock.trim(), eol);
  const wrappedBlock = `${START_MARKER}${eol}${cleanBlock}${eol}${END_MARKER}`;

  if (existingContent === null) {
    return {
      content: `${wrappedBlock}${eol}`,
      action: "created",
    };
  }

  const startCount = countOccurrences(existingContent, START_MARKER);
  const endCount = countOccurrences(existingContent, END_MARKER);

  if (startCount === 0 && endCount === 0) {
    const trimmedEnd = existingContent.replace(/(\r?\n)+$/, "");
    const prefix = trimmedEnd.length > 0 ? `${trimmedEnd}${eol}${eol}` : "";
    return {
      content: `${prefix}${wrappedBlock}${eol}`,
      action: "appended",
    };
  }

  if (startCount !== 1 || endCount !== 1) {
    throw new MarkerError(
      `Malformed DevWorklog markers: found ${startCount} start marker(s) and ${endCount} end marker(s). Expected exactly 1 of each.`
    );
  }

  const startIdx = existingContent.indexOf(START_MARKER);
  const endIdx = existingContent.indexOf(END_MARKER);

  if (endIdx < startIdx) {
    throw new MarkerError(
      `Malformed DevWorklog markers: end marker appears before start marker.`
    );
  }

  const before = existingContent.slice(0, startIdx);
  const after = existingContent.slice(endIdx + END_MARKER.length);
  const nextContent = `${before}${wrappedBlock}${after}`;

  return {
    content: nextContent,
    action: nextContent === existingContent ? "unchanged" : "replaced",
  };
}
