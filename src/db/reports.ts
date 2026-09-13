export type LessonReportStatus = "DRAFT" | "SENT";

export interface LessonReport {
  id: string;
  lesson_id: string;
  student_id: string;
  created_by_user_id: string;
  pupil_name: string;
  level: string;
  lesson_date: string;
  lesson_start_at: string;
  lesson_end_at: string;
  lesson_timezone: string;
  this_lessons_focus: string;
  next_lessons_focus: string;
  writing_practice: string;
  home_learning_task: string;
  notes: string;
  even_better_if: string;
  summary: string;
  homework: string;
  additional_notes: string;
  status: LessonReportStatus;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

const reportColumns = `id, lesson_id, student_id, created_by_user_id,
  pupil_name, level, lesson_date, lesson_start_at, lesson_end_at, lesson_timezone,
  this_lessons_focus, next_lessons_focus, writing_practice, home_learning_task, notes, even_better_if,
  summary, homework, additional_notes, status, created_at, updated_at, sent_at`;

export async function findLessonReport(db: D1Database, lessonId: string): Promise<LessonReport | null> {
  return db.prepare(`SELECT ${reportColumns} FROM lesson_reports WHERE lesson_id = ?`).bind(lessonId).first<LessonReport>();
}

export async function findLessonReportById(db: D1Database, id: string): Promise<LessonReport | null> {
  return db.prepare(`SELECT ${reportColumns} FROM lesson_reports WHERE id = ?`).bind(id).first<LessonReport>();
}

export async function upsertLessonReport(
  db: D1Database,
  report: {
    id: string;
    lesson_id: string;
    student_id: string;
    created_by_user_id: string;
    pupil_name: string;
    level: string;
    lesson_date: string;
    lesson_start_at: string;
    lesson_end_at: string;
    lesson_timezone: string;
    this_lessons_focus: string;
    next_lessons_focus: string;
    writing_practice: string;
    home_learning_task: string;
    notes: string;
    even_better_if: string;
    now: string;
    status: LessonReportStatus;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO lesson_reports(
       id, lesson_id, student_id, created_by_user_id, pupil_name, level, lesson_date, lesson_start_at, lesson_end_at, lesson_timezone,
       this_lessons_focus, next_lessons_focus, writing_practice, home_learning_task, notes, even_better_if,
       summary, homework, additional_notes, status, created_at, updated_at, sent_at
     )
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(lesson_id) DO UPDATE SET
       pupil_name = CASE WHEN lesson_reports.pupil_name = '' THEN excluded.pupil_name ELSE lesson_reports.pupil_name END,
       level = CASE WHEN lesson_reports.level = '' THEN excluded.level ELSE lesson_reports.level END,
       lesson_date = CASE WHEN lesson_reports.lesson_date = '' THEN excluded.lesson_date ELSE lesson_reports.lesson_date END,
       lesson_start_at = CASE WHEN lesson_reports.lesson_start_at = '' THEN excluded.lesson_start_at ELSE lesson_reports.lesson_start_at END,
       lesson_end_at = CASE WHEN lesson_reports.lesson_end_at = '' THEN excluded.lesson_end_at ELSE lesson_reports.lesson_end_at END,
       lesson_timezone = CASE WHEN lesson_reports.lesson_timezone = '' THEN excluded.lesson_timezone ELSE lesson_reports.lesson_timezone END,
       this_lessons_focus = excluded.this_lessons_focus,
       next_lessons_focus = excluded.next_lessons_focus,
       writing_practice = excluded.writing_practice,
       home_learning_task = excluded.home_learning_task,
       notes = excluded.notes,
       even_better_if = excluded.even_better_if,
       updated_at = excluded.updated_at
     WHERE lesson_reports.status = 'DRAFT'`
  ).bind(
    report.id, report.lesson_id, report.student_id, report.created_by_user_id,
    report.pupil_name, report.level, report.lesson_date, report.lesson_start_at, report.lesson_end_at, report.lesson_timezone,
    report.this_lessons_focus, report.next_lessons_focus, report.writing_practice, report.home_learning_task, report.notes, report.even_better_if,
    report.this_lessons_focus, report.home_learning_task, report.notes, report.status, report.now, report.now
  ).run();
}

export async function markLessonReportSent(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE lesson_reports SET status = 'SENT', sent_at = ?, updated_at = ? WHERE id = ? AND status = 'DRAFT'").bind(now, now, id).run();
}

export async function findSentLessonReportForStudent(db: D1Database, lessonId: string, userId: string): Promise<LessonReport | null> {
  return db.prepare(
    `SELECT ${reportColumns}
     FROM lesson_reports r
     JOIN lessons l ON l.id = r.lesson_id AND l.student_id = r.student_id
     JOIN students s ON s.id = l.student_id AND s.learn_user_id = ?
     JOIN users u ON u.id = s.learn_user_id AND u.role = 'STUDENT' AND u.status = 'ACTIVE'
     WHERE r.lesson_id = ? AND r.status = 'SENT' AND l.status = 'completed'`
  ).bind(userId, lessonId).first<LessonReport>();
}
