import type { LessonInput, LessonStatus } from "../domain/validation";

export interface Lesson {
  id: string;
  student_id: string;
  student_name?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: LessonStatus;
  notes: string;
  external_url: string | null;
  created_at: string;
  updated_at: string;
  recurring_series_id?: string | null;
  report_id?: string | null;
  report_status?: "DRAFT" | "SENT" | null;
}

const lessonColumns = "l.id, l.student_id, l.start_at, l.end_at, l.timezone, l.status, l.notes, l.external_url, l.created_at, l.updated_at";
const studentLessonColumns = "l.id, l.student_id, l.start_at, l.end_at, l.timezone, l.status, l.external_url, l.created_at, l.updated_at, l.recurring_series_id";

export async function listLessons(db: D1Database): Promise<Lesson[]> {
  const result = await db
    .prepare(`SELECT ${lessonColumns}, s.name AS student_name FROM lessons l JOIN students s ON s.id = l.student_id ORDER BY l.start_at ASC`)
    .all<Lesson>();
  return result.results;
}

export async function listLessonsForStudentRecord(db: D1Database, studentId: string, limit: number, offset: number): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name, r.id AS report_id, r.status AS report_status
       FROM lessons l JOIN students s ON s.id = l.student_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE l.student_id = ?
       ORDER BY l.start_at ASC, l.id ASC
       LIMIT ? OFFSET ?`
    )
    .bind(studentId, limit, offset)
    .all<Lesson>();
  return result.results;
}

export async function countLessonsForStudentRecord(db: D1Database, studentId: string): Promise<number> {
  const result = await db.prepare("SELECT COUNT(*) AS count FROM lessons WHERE student_id = ?").bind(studentId).first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listLessonsForResourceFilter(db: D1Database, studentId: string, selectedId?: string, limit = 20): Promise<Lesson[]> {
  if (!studentId) return [];
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       WHERE s.status = 'ACTIVE' AND l.student_id = ?
       ORDER BY CASE WHEN l.id = ? THEN 0 ELSE 1 END, l.start_at DESC, l.id DESC
       LIMIT ?`
    )
    .bind(studentId, selectedId ?? "", boundedLimit)
    .all<Lesson>();
  return result.results;
}

export async function listUpcomingLessons(
  db: D1Database,
  now: string,
  limit: number,
  offset: number
): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name
       FROM lessons l JOIN students s ON s.id = l.student_id
       WHERE l.status = 'scheduled' AND l.start_at > ?
       ORDER BY l.start_at ASC, l.id ASC
       LIMIT ? OFFSET ?`
    )
    .bind(now, limit, offset)
    .all<Lesson>();
  return result.results;
}

export async function countUpcomingLessons(db: D1Database, now: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) AS count FROM lessons WHERE status = 'scheduled' AND start_at > ?")
    .bind(now)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listPastLessons(
  db: D1Database,
  now: string,
  limit: number,
  offset: number
): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name, r.id AS report_id, r.status AS report_status
       FROM lessons l JOIN students s ON s.id = l.student_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE l.status != 'scheduled' OR l.start_at <= ?
       ORDER BY l.start_at DESC, l.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(now, limit, offset)
    .all<Lesson>();
  return result.results;
}

export async function countPastLessons(db: D1Database, now: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) AS count FROM lessons WHERE status != 'scheduled' OR start_at <= ?")
    .bind(now)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function markElapsedScheduledLessonsCompleted(db: D1Database, now: string): Promise<number> {
  const result = await db
    .prepare("UPDATE lessons SET status = 'completed', updated_at = ? WHERE status = 'scheduled' AND end_at <= ?")
    .bind(now, now)
    .run();
  return result.meta.changes;
}

export async function listStartedLessonsNeedingReports(db: D1Database, now: string, limit: number): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name, r.id AS report_id, r.status AS report_status
       FROM lessons l JOIN students s ON s.id = l.student_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE l.status != 'cancelled' AND l.start_at <= ? AND (r.id IS NULL OR r.status = 'DRAFT')
       ORDER BY l.start_at DESC, l.id DESC
       LIMIT ?`
    )
    .bind(now, limit)
    .all<Lesson>();
  return result.results;
}

export async function countActiveStudents(db: D1Database): Promise<number> {
  const result = await db.prepare("SELECT COUNT(*) AS count FROM students WHERE status = 'ACTIVE'").first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listLessonsInRange(db: D1Database, startAt: string, endAt: string): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${lessonColumns}, s.name AS student_name
       FROM lessons l JOIN students s ON s.id = l.student_id
       WHERE l.start_at < ? AND l.end_at > ?
       ORDER BY l.start_at ASC, l.id ASC`
    )
    .bind(endAt, startAt)
    .all<Lesson>();
  return result.results;
}

export async function listLessonsForUser(db: D1Database, userId: string): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${studentLessonColumns}, r.id AS report_id, r.status AS report_status
       FROM lessons l JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
       ORDER BY l.start_at ASC`
    )
    .bind(userId)
    .all<Lesson>();
  return result.results;
}

export async function listUpcomingLessonsForUser(
  db: D1Database,
  userId: string,
  now: string,
  limit: number,
  offset: number
): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${studentLessonColumns}, r.id AS report_id, r.status AS report_status
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND l.status = 'scheduled' AND l.start_at >= ?
       ORDER BY l.start_at ASC, l.id ASC
       LIMIT ? OFFSET ?`
    )
    .bind(userId, now, limit, offset)
    .all<Lesson>();
  return result.results;
}

export async function countUpcomingLessonsForUser(db: D1Database, userId: string, now: string): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND l.status = 'scheduled' AND l.start_at >= ?`
    )
    .bind(userId, now)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listPastLessonsForUser(
  db: D1Database,
  userId: string,
  now: string,
  limit: number,
  offset: number
): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${studentLessonColumns}, r.id AS report_id, r.status AS report_status
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND l.status != 'cancelled' AND (l.status != 'scheduled' OR l.start_at < ?)
       ORDER BY l.start_at DESC, l.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(userId, now, limit, offset)
    .all<Lesson>();
  return result.results;
}

export async function countPastLessonsForUser(db: D1Database, userId: string, now: string): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND l.status != 'cancelled' AND (l.status != 'scheduled' OR l.start_at < ?)`
    )
    .bind(userId, now)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listLessonsForUserInRange(
  db: D1Database,
  userId: string,
  startAt: string,
  endAt: string
): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${studentLessonColumns}, r.id AS report_id, r.status AS report_status
       FROM lessons l JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       LEFT JOIN lesson_reports r ON r.lesson_id = l.id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND l.start_at < ? AND l.end_at > ?
       ORDER BY l.start_at ASC, l.id ASC`
    )
    .bind(userId, endAt, startAt)
    .all<Lesson>();
  return result.results;
}

export async function findLesson(db: D1Database, id: string): Promise<Lesson | null> {
  return db
    .prepare(`SELECT ${lessonColumns}, s.name AS student_name FROM lessons l JOIN students s ON s.id = l.student_id WHERE l.id = ?`)
    .bind(id)
    .first<Lesson>();
}

export async function findLessonForUser(db: D1Database, id: string, userId: string): Promise<Lesson | null> {
  return db
    .prepare(
      `SELECT ${studentLessonColumns}
       FROM lessons l JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       WHERE l.id = ? AND s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'`
    )
    .bind(id, userId)
    .first<Lesson>();
}

export async function hasOverlappingLesson(
  db: D1Database,
  studentId: string,
  startAt: string,
  endAt: string,
  excludeId?: string
): Promise<boolean> {
  const query = excludeId
    ? "SELECT id FROM lessons WHERE student_id = ? AND status != 'cancelled' AND id != ? AND start_at < ? AND end_at > ? LIMIT 1"
    : "SELECT id FROM lessons WHERE student_id = ? AND status != 'cancelled' AND start_at < ? AND end_at > ? LIMIT 1";
  const bindings = excludeId ? [studentId, excludeId, endAt, startAt] : [studentId, endAt, startAt];
  const row = await db.prepare(query).bind(...bindings).first<{ id: string }>();
  return Boolean(row);
}

export async function insertLesson(db: D1Database, lesson: LessonInput & { id: string; now: string }): Promise<void> {
  await db
    .prepare(
      "INSERT INTO lessons(id, student_id, start_at, end_at, timezone, status, notes, external_url, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(lesson.id, lesson.studentId, lesson.startAt, lesson.endAt, lesson.timezone, lesson.status, lesson.notes, lesson.externalUrl, lesson.now, lesson.now)
    .run();
}

export async function updateLesson(
  db: D1Database,
  lesson: LessonInput & { id: string; now: string }
): Promise<void> {
  await db
    .prepare(
      "UPDATE lessons SET student_id = ?, start_at = ?, end_at = ?, timezone = ?, notes = ?, external_url = ?, updated_at = ? WHERE id = ?"
    )
    .bind(lesson.studentId, lesson.startAt, lesson.endAt, lesson.timezone, lesson.notes, lesson.externalUrl, lesson.now, lesson.id)
    .run();
}

export async function updateLessonStatus(db: D1Database, id: string, status: LessonStatus, now: string): Promise<void> {
  await db.prepare("UPDATE lessons SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
}
