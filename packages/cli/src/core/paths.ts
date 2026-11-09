import { posix } from "node:path";
import { DevWorklogConfig } from "./config.js";
import { loadVocabulary } from "./vocabulary.js";

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export function todayIn(timezone: string, now: Date = new Date()): CalendarDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function parseIsoDate(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate({ year, month, day })) return null;
  return { year, month, day };
}

export function isValidCalendarDate(date: CalendarDate): boolean {
  const { year, month, day } = date;
  if (year < 1970 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function formatIsoDate(date: CalendarDate): string {
  const y = String(date.year).padStart(4, "0");
  const m = String(date.month).padStart(2, "0");
  const d = String(date.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function monthName(month: number): string {
  const vocab = loadVocabulary();
  const name = vocab.months[month - 1];
  if (!name) {
    throw new Error(`Invalid month number: ${month}`);
  }
  return name;
}

export function capitalize(str: string): string {
  return str.length === 0 ? str : str[0].toUpperCase() + str.slice(1).toLowerCase();
}

export function formatHeading(date: CalendarDate): string {
  const mName = capitalize(monthName(date.month));
  const dStr = String(date.day).padStart(2, "0");
  return `# ${mName} ${dStr}, ${date.year}`;
}

export function parseHeadingDate(headingLine: string): CalendarDate | null {
  const match = /^# ([A-Z][a-z]+) (\d{2}), (\d{4})$/.exec(headingLine.trim());
  if (!match) return null;
  const mLower = match[1].toLowerCase();
  const vocab = loadVocabulary();
  const mIndex = vocab.months.indexOf(mLower);
  if (mIndex === -1) return null;
  const date: CalendarDate = {
    year: Number(match[3]),
    month: mIndex + 1,
    day: Number(match[2]),
  };
  return isValidCalendarDate(date) ? date : null;
}

export function worklogPath(
  cfg: Pick<DevWorklogConfig, "worklogDir">,
  date: CalendarDate
): string {
  const dir = cfg.worklogDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const mName = monthName(date.month);
  const dStr = String(date.day).padStart(2, "0");
  return posix.join(dir, String(date.year), mName, `${dStr}.md`);
}

/**
 * Parses a path relative to worklogDir (or containing YYYY/<month>/DD.md at the end).
 */
export function parseWorklogPath(relPath: string): CalendarDate | null {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const match = /(?:^|\/)(\d{4})\/([a-z]+)\/(\d{2})\.md$/.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const monthStr = match[2];
  const day = Number(match[3]);
  const vocab = loadVocabulary();
  const monthIndex = vocab.months.indexOf(monthStr);
  if (monthIndex === -1) return null;
  const date: CalendarDate = { year, month: monthIndex + 1, day };
  return isValidCalendarDate(date) ? date : null;
}
