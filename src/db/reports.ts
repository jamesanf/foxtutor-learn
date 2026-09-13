export type LessonReportStatus = "DRAFT" | "SENT";

export interface LessonReport {
  id: string;
  lesson_id: string;
  student_id: string;
  created_by_user_id: string;
  summary: string;
  homework: string;
  additional_notes: string;
  status: LessonReportStatus;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export async function findLessonReport(db: D1Database, lessonId: string): Promise<LessonReport | null> {
  return db.prepare("SELECT id, lesson_id, student_id, created_by_user_id, summary, homework, additional_notes, status, created_at, updated_at, sent_at FROM lesson_reports WHERE lesson_id = ?").bind(lessonId).first<LessonReport>();
}

export async function findLessonReportById(db: D1Database, id: string): Promise<LessonReport | null> {
  return db.prepare("SELECT id, lesson_id, student_id, created_by_user_id, summary, homework, additional_notes, status, created_at, updated_at, sent_at FROM lesson_reports WHERE id = ?").bind(id).first<LessonReport>();
}

export async function upsertLessonReport(
  db: D1Database,
  report: Omit<LessonReport, "created_at" | "updated_at" | "sent_at" | "status"> & { now: string; status: LessonReportStatus }
): Promise<void> {
  await db.prepare(
    `INSERT INTO lesson_reports(id, lesson_id, student_id, created_by_user_id, summary, homework, additional_notes, status, created_at, updated_at, sent_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(lesson_id) DO UPDATE SET summary = excluded.summary, homework = excluded.homework,
       additional_notes = excluded.additional_notes, updated_at = excluded.updated_at
     WHERE lesson_reports.status = 'DRAFT'`
  ).bind(report.id, report.lesson_id, report.student_id, report.created_by_user_id, report.summary, report.homework, report.additional_notes, report.status, report.now, report.now).run();
}

export async function markLessonReportSent(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE lesson_reports SET status = 'SENT', sent_at = ?, updated_at = ? WHERE id = ? AND status = 'DRAFT'").bind(now, now, id).run();
}
