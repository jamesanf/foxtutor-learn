import { isoToLocalDateTime } from "./validation";

export const FOX_TUTOR_TIMEZONE = "Europe/London";
export const CALENDAR_TIMEZONE = FOX_TUTOR_TIMEZONE;

export function currentCalendarDate(now = new Date(), _legacyTimezone?: string): string {
  return isoToLocalDateTime(now.toISOString(), FOX_TUTOR_TIMEZONE).slice(0, 10);
}

export function lessonCalendarDate(startAt: string, _legacyTimezone?: string): string {
  return isoToLocalDateTime(startAt, FOX_TUTOR_TIMEZONE).slice(0, 10);
}
