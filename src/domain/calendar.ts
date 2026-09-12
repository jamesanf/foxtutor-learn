import { isoToLocalDateTime } from "./validation";

export const CALENDAR_TIMEZONE = "Europe/London";

export function currentCalendarDate(now = new Date(), timezone = CALENDAR_TIMEZONE): string {
  return isoToLocalDateTime(now.toISOString(), timezone).slice(0, 10);
}

export function lessonCalendarDate(startAt: string, calendarTimezone: string): string {
  return isoToLocalDateTime(startAt, calendarTimezone).slice(0, 10);
}
