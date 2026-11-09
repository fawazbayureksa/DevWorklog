export interface ParsedField {
  name: string;
  value: string;
  line: number;
}

export interface ParsedSection {
  name: string;
  lines: string[];
  bullets: string[];
  line: number;
}

export interface ParsedEntry {
  id: string | null;
  idLine: number | null;
  title: string;
  titleLine: number;
  fields: ParsedField[];
  sections: ParsedSection[];
  unexpectedH3s: { name: string; line: number }[];
}

export interface WorklogDay {
  filePath: string; // repo-relative or worklogDir-relative normalized with /
  h1: string | null;
  h1Line: number | null;
  extraH1s: { text: string; line: number }[];
  entries: ParsedEntry[];
  orphanIdMarkers: { raw: string; line: number }[];
}

const ID_MARKER_RE = /^<!--\s*devworklog:id=(.*?)\s*-->$/;
const FIELD_RE = /^-\s+\*\*([^*]+):\*\*\s*(.*)$/;

export function parseWorklogMarkdown(content: string, filePath: string): WorklogDay {
  const rawLines = content.split(/\r?\n/);
  let h1: string | null = null;
  let h1Line: number | null = null;
  const extraH1s: { text: string; line: number }[] = [];
  const entries: ParsedEntry[] = [];
  const orphanIdMarkers: { raw: string; line: number }[] = [];

  let pendingId: { id: string; line: number; raw: string } | null = null;
  let currentEntry: ParsedEntry | null = null;
  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Check ID marker
    const idMatch = ID_MARKER_RE.exec(trimmed);
    if (idMatch) {
      if (pendingId !== null) {
        orphanIdMarkers.push({ raw: pendingId.raw, line: pendingId.line });
      }
      pendingId = { id: idMatch[1].trim(), line: lineNum, raw: trimmed };
      continue;
    }

    // Check H1
    if (/^#\s+/.test(rawLine)) {
      if (h1 === null && lineNum === 1) {
        h1 = rawLine.trim();
        h1Line = lineNum;
      } else if (h1 === null) {
        h1 = rawLine.trim();
        h1Line = lineNum;
      } else {
        extraH1s.push({ text: rawLine.trim(), line: lineNum });
      }
      continue;
    }

    // Check H2 (Entry start)
    if (/^##\s+/.test(rawLine)) {
      const title = rawLine.replace(/^##\s+/, "").trim();
      const id = pendingId && pendingId.line === lineNum - 1 ? pendingId.id : null;
      const idLine = pendingId && pendingId.line === lineNum - 1 ? pendingId.line : null;

      if (pendingId && pendingId.line !== lineNum - 1) {
        // ID marker was not on the line directly above H2, still attach it to entry so WL010 can check or report
        orphanIdMarkers.push({ raw: pendingId.raw, line: pendingId.line });
      }
      pendingId = null;

      currentEntry = {
        id,
        idLine,
        title,
        titleLine: lineNum,
        fields: [],
        sections: [],
        unexpectedH3s: [],
      };
      entries.push(currentEntry);
      currentSection = null;
      continue;
    }

    // Check H3 (Section start)
    if (/^###\s+/.test(rawLine)) {
      if (!currentEntry) {
        continue;
      }
      const secName = rawLine.replace(/^###\s+/, "").trim();
      currentSection = {
        name: secName,
        lines: [],
        bullets: [],
        line: lineNum,
      };
      currentEntry.sections.push(currentSection);
      continue;
    }

    // Inside an entry
    if (currentEntry) {
      if (!currentSection) {
        // Metadata region before first H3
        const fieldMatch = FIELD_RE.exec(trimmed);
        if (fieldMatch) {
          currentEntry.fields.push({
            name: fieldMatch[1].trim(),
            value: fieldMatch[2].trim(),
            line: lineNum,
          });
        }
      } else {
        // Inside an H3 section
        if (trimmed.length > 0) {
          currentSection.lines.push(trimmed);
          if (trimmed.startsWith("- ")) {
            currentSection.bullets.push(trimmed.slice(2).trim());
          }
        }
      }
    }
  }

  if (pendingId !== null) {
    orphanIdMarkers.push({ raw: pendingId.raw, line: pendingId.line });
  }

  return {
    filePath: filePath.replace(/\\/g, "/"),
    h1,
    h1Line,
    extraH1s,
    entries,
    orphanIdMarkers,
  };
}
