import type { Lesson } from "../db/lessons";

export type CalendarFeedKind = "ADMIN" | "STUDENT";

export const CALENDAR_PAST_DAYS = 90;
export const CALENDAR_FUTURE_DAYS = 365;

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Calendar event timestamp is invalid.");
  return date.toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function foldLine(line: string): string {
  const codePoints = Array.from(line);
  const output: string[] = [];
  let remaining = codePoints;
  let first = true;
  while (remaining.length) {
    const limit = first ? 75 : 74;
    let bytes = 0;
    let count = 0;
    for (const codePoint of remaining) {
      const size = new TextEncoder().encode(codePoint).byteLength;
      if (count > 0 && bytes + size > limit) break;
      if (count === 0 && size > limit) throw new Error("Calendar property contains an unsupported value.");
      bytes += size;
      count += 1;
    }
    output.push((first ? "" : " ") + remaining.slice(0, count).join(""));
    remaining = remaining.slice(count);
    first = false;
  }
  return output.join("\r\n");
}

function statusValue(status: Lesson["status"]): "CONFIRMED" | "CANCELLED" {
  return status === "cancelled" ? "CANCELLED" : "CONFIRMED";
}

function eventDescription(lesson: Lesson, kind: CalendarFeedKind): string {
  const status = `Status: ${lesson.status}`;
  if (kind === "ADMIN") return `FoxTutor lesson\\n${status}`;
  return `FoxTutor lesson\\n${status}`;
}

function eventSummary(lesson: Lesson, kind: CalendarFeedKind): string {
  return kind === "ADMIN" && lesson.student_name ? `Lesson - ${lesson.student_name}` : "FoxTutor lesson";
}

function eventLines(lesson: Lesson, kind: CalendarFeedKind): string[] {
  const updated = timestamp(lesson.updated_at);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(`${lesson.id}@foxtutor.org`)}`,
    `DTSTAMP:${updated}`,
    `LAST-MODIFIED:${updated}`,
    `DTSTART:${timestamp(lesson.start_at)}`,
    `DTEND:${timestamp(lesson.end_at)}`,
    `SUMMARY:${escapeIcsText(eventSummary(lesson, kind))}`,
    `STATUS:${statusValue(lesson.status)}`,
    `DESCRIPTION:${eventDescription(lesson, kind)}`
  ];
  if (lesson.external_url && /^https:\/\//i.test(lesson.external_url)) lines.push(`URL:${lesson.external_url}`);
  lines.push("END:VEVENT");
  return lines;
}

export function generateIcs(lessons: Lesson[], kind: CalendarFeedKind, calendarName?: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FoxTutor//FoxTutor Learn//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName ?? (kind === "ADMIN" ? "FoxTutor - Teaching Calendar" : "FoxTutor - My Lessons"))}`
  ];
  for (const lesson of lessons) lines.push(...eventLines(lesson, kind));
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function feedRange(now = new Date()): { startAt: string; endAt: string } {
  const start = new Date(now.getTime() - CALENDAR_PAST_DAYS * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + CALENDAR_FUTURE_DAYS * 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
