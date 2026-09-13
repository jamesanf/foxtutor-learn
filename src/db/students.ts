import type { AppUser } from "../auth/authorization";
import { normalizeEmail } from "../auth/identity";

export type StudentStatus = "ACTIVE" | "INACTIVE";

export interface Student {
  id: string;
  name: string;
  email: string;
  learn_user_email?: string | null;
  learn_user_id: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export async function listStudents(db: D1Database): Promise<Student[]> {
  const result = await db.prepare("SELECT s.id, s.name, s.email, s.learn_user_id, u.email AS learn_user_email, s.status, s.created_at, s.updated_at FROM students s LEFT JOIN users u ON u.id = s.learn_user_id ORDER BY s.status ASC, s.name ASC").all<Student>();
  return result.results;
}

export async function listActiveStudentsForResourceFilter(db: D1Database, selectedId?: string, limit = 20): Promise<Student[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  const result = await db
    .prepare(
      `SELECT s.id, s.name, s.email, s.learn_user_id, u.email AS learn_user_email, s.status, s.created_at, s.updated_at
       FROM students s
       LEFT JOIN users u ON u.id = s.learn_user_id
       WHERE s.status = 'ACTIVE'
       ORDER BY CASE WHEN s.id = ? THEN 0 ELSE 1 END, LOWER(s.name), s.id
       LIMIT ?`
    )
    .bind(selectedId ?? "", boundedLimit)
    .all<Student>();
  return result.results;
}

export async function findStudent(db: D1Database, id: string): Promise<Student | null> {
  return db.prepare("SELECT s.id, s.name, s.email, s.learn_user_id, u.email AS learn_user_email, s.status, s.created_at, s.updated_at FROM students s LEFT JOIN users u ON u.id = s.learn_user_id WHERE s.id = ?").bind(id).first<Student>();
}

export async function findActiveStudentRecipient(db: D1Database, id: string): Promise<Student | null> {
  return db
    .prepare(
      `SELECT s.id, s.name, s.email, s.learn_user_id, u.email AS learn_user_email, s.status, s.created_at, s.updated_at
       FROM students s JOIN users u ON u.id = s.learn_user_id
       WHERE s.id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'`
    )
    .bind(id)
    .first<Student>();
}

export async function findActiveStudentForUser(db: D1Database, userId: string): Promise<Student | null> {
  return db
    .prepare(
      `SELECT s.id, s.name, s.email, s.learn_user_id, s.status, s.created_at, s.updated_at
       FROM students s JOIN users u ON u.id = s.learn_user_id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'`
    )
    .bind(userId)
    .first<Student>();
}

export async function findStudentAccount(db: D1Database, email: string): Promise<AppUser | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return db
    .prepare("SELECT id, email, display_name, role, status FROM users WHERE email = ? AND role = 'STUDENT' AND status = 'ACTIVE'")
    .bind(normalized)
    .first<AppUser>();
}

export async function findStudentLinkedToUser(db: D1Database, userId: string): Promise<Student | null> {
  return db.prepare("SELECT id, name, email, learn_user_id, status, created_at, updated_at FROM students WHERE learn_user_id = ?").bind(userId).first<Student>();
}

export async function insertStudent(
  db: D1Database,
  student: { id: string; name: string; email: string; learnUserId: string | null; now: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO students(id, name, email, learn_user_id, status, created_at, updated_at) VALUES(?, ?, ?, ?, 'ACTIVE', ?, ?)"
    )
    .bind(student.id, student.name, student.email, student.learnUserId, student.now, student.now)
    .run();
}

export async function updateStudent(
  db: D1Database,
  student: { id: string; name: string; email: string; learnUserId: string | null; now: string }
): Promise<void> {
  await db
    .prepare("UPDATE students SET name = ?, email = ?, learn_user_id = ?, updated_at = ? WHERE id = ?")
    .bind(student.name, student.email, student.learnUserId, student.now, student.id)
    .run();
}

export async function deactivateStudent(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE students SET status = 'INACTIVE', updated_at = ? WHERE id = ?").bind(now, id).run();
}
