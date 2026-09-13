import type { LessonReport } from "../db/reports";

export interface StudentLessonReportViewModel {
  pupilName: string;
  level: string;
  lessonDate: string;
  lessonTime: string;
  lessonTimezone: string;
  thisLessonsFocus: string;
  nextLessonsFocus: string;
  writingPractice: string;
  homeLearningTask: string;
  notes: string;
  evenBetterIf: string;
}

function dateFromSnapshot(value: string): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function timeFromInstant(value: string, timezone: string): string {
  if (!value || !timezone) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date(value));
}

export function reportViewModel(report: LessonReport): StudentLessonReportViewModel {
  const start = timeFromInstant(report.lesson_start_at, report.lesson_timezone);
  const end = timeFromInstant(report.lesson_end_at, report.lesson_timezone);
  return {
    pupilName: report.pupil_name,
    level: report.level,
    lessonDate: dateFromSnapshot(report.lesson_date),
    lessonTime: start && end ? `${start}–${end}` : "",
    lessonTimezone: report.lesson_timezone,
    thisLessonsFocus: report.this_lessons_focus || report.summary,
    nextLessonsFocus: report.next_lessons_focus,
    writingPractice: report.writing_practice,
    homeLearningTask: report.home_learning_task || report.homework,
    notes: report.notes || report.additional_notes,
    evenBetterIf: report.even_better_if
  };
}
