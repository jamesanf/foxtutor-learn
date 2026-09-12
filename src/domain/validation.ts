export type LessonStatus = "scheduled" | "completed" | "cancelled";

export interface LessonInput {
  studentId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: LessonStatus;
  notes: string;
  externalUrl: string | null;
}

export interface ValidationResult<T> {
  value?: T;
  error?: string;
}

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 10_000;
const MAX_URL_LENGTH = 2_048;

export function validName(value: string): string | null {
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

export function validEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validNotes(value: string): string | null {
  const notes = value.trim();
  return notes.length <= MAX_NOTES_LENGTH ? notes : null;
}

export function validExternalUrl(value: string): string | null {
  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isLessonStatus(value: string): value is LessonStatus {
  return value === "scheduled" || value === "completed" || value === "cancelled";
}

export function canTransitionLessonStatus(current: LessonStatus, next: LessonStatus): boolean {
  return current === next || (current === "scheduled" && (next === "completed" || next === "cancelled"));
}

export function isValidTimeZone(timezone: string): boolean {
  if (!timezone || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function zonedParts(instant: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute };
}

export function localDateTimeToIso(value: string, timezone: string): ValidationResult<string> {
  if (!isValidTimeZone(timezone)) return { error: "Choose a valid IANA timezone." };
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { error: "Enter a valid date and time." };
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return { error: "Enter a valid date and time." };
  }
  const candidate = Date.UTC(year, month - 1, day, hour, minute);
  const candidateDate = new Date(candidate);
  if (
    candidateDate.getUTCFullYear() !== year ||
    candidateDate.getUTCMonth() !== month - 1 ||
    candidateDate.getUTCDate() !== day ||
    candidateDate.getUTCHours() !== hour ||
    candidateDate.getUTCMinutes() !== minute
  ) {
    return { error: "Enter a valid date and time." };
  }
  const displayed = zonedParts(candidateDate, timezone);
  const displayedAsUtc = Date.UTC(displayed.year, displayed.month - 1, displayed.day, displayed.hour, displayed.minute);
  const instant = new Date(candidate - (displayedAsUtc - candidate));
  const reconstructed = zonedParts(instant, timezone);
  if (
    reconstructed.year !== year ||
    reconstructed.month !== month ||
    reconstructed.day !== day ||
    reconstructed.hour !== hour ||
    reconstructed.minute !== minute
  ) {
    return { error: "That local time does not exist in the selected timezone." };
  }
  return { value: instant.toISOString() };
}

export function isoToLocalDateTime(iso: string, timezone: string): string {
  const parts = zonedParts(new Date(iso), timezone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function validateLessonInput(fields: {
  studentId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: string;
  notes: string;
  externalUrl: string;
}): ValidationResult<LessonInput> {
  if (!fields.studentId) return { error: "Choose a student." };
  if (!isLessonStatus(fields.status)) return { error: "Choose a valid lesson status." };
  const start = localDateTimeToIso(fields.startAt, fields.timezone);
  if (!start.value) return { error: start.error };
  const end = localDateTimeToIso(fields.endAt, fields.timezone);
  if (!end.value) return { error: end.error };
  if (end.value <= start.value) return { error: "The end time must be after the start time." };
  const notes = validNotes(fields.notes);
  if (notes === null) return { error: "Notes must be 10,000 characters or fewer." };
  const externalUrl = fields.externalUrl.trim();
  if (externalUrl && !validExternalUrl(externalUrl)) return { error: "External lesson URL must be a secure HTTPS URL." };
  return {
    value: {
      studentId: fields.studentId,
      startAt: start.value,
      endAt: end.value,
      timezone: fields.timezone,
      status: fields.status,
      notes,
      externalUrl: externalUrl ? validExternalUrl(externalUrl) : null
    }
  };
}
