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
}

const lessonColumns = "l.id, l.student_id, l.start_at, l.end_at, l.timezone, l.status, l.notes, l.external_url, l.created_at, l.updated_at";
const studentLessonColumns = "l.id, l.student_id, l.start_at, l.end_at, l.timezone, l.status, l.external_url, l.created_at, l.updated_at";

export async function listLessons(db: D1Database): Promise<Lesson[]> {
  const result = await db
    .prepare(`SELECT ${lessonColumns}, s.name AS student_name FROM lessons l JOIN students s ON s.id = l.student_id ORDER BY l.start_at ASC`)
    .all<Lesson>();
  return result.results;
}

export async function listLessonsForUser(db: D1Database, userId: string): Promise<Lesson[]> {
  const result = await db
    .prepare(
      `SELECT ${studentLessonColumns}
       FROM lessons l JOIN students s ON s.id = l.student_id
       JOIN users u ON u.id = s.learn_user_id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
       ORDER BY l.start_at ASC`
    )
    .bind(userId)
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
