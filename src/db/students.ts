import type { AppUser } from "../auth/authorization";
import { normalizeEmail } from "../auth/identity";
import { currentAcademicYear, type StudentAcademicSystem } from "../domain/student-profile";

export type StudentStatus = "ACTIVE" | "INACTIVE";

export interface Student {
  id: string;
  name: string;
  email: string;
  level: string | null;
  international: number;
  parent_name: string;
  parent_email: string;
  billing_address: string;
  additional_support_needs: string;
  academic_year_system: StudentAcademicSystem;
  academic_year: string;
  academic_year_anchor_date: string | null;
  class_texts: string;
  learn_user_email?: string | null;
  learn_user_id: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

const studentColumns = "s.id, s.name, s.email, s.level, s.international, s.parent_name, s.parent_email, s.billing_address, s.additional_support_needs, s.academic_year_system, s.academic_year, s.academic_year_anchor_date, s.class_texts, s.learn_user_id, u.email AS learn_user_email, s.status, s.created_at, s.updated_at";

async function syncAcademicYear(db: D1Database, student: Student, now = new Date().toISOString()): Promise<Student> {
  const current = currentAcademicYear(student.academic_year_system, student.academic_year, student.academic_year_anchor_date, now);
  if (current.value === student.academic_year && current.anchorDate === student.academic_year_anchor_date) return student;
  await db.prepare("UPDATE students SET academic_year = ?, academic_year_anchor_date = ?, updated_at = ? WHERE id = ?").bind(current.value, current.anchorDate, now, student.id).run();
  return { ...student, academic_year: current.value, academic_year_anchor_date: current.anchorDate, updated_at: now };
}

export async function listStudents(db: D1Database): Promise<Student[]> {
  const result = await db.prepare(`SELECT ${studentColumns} FROM students s LEFT JOIN users u ON u.id = s.learn_user_id ORDER BY s.status ASC, s.name ASC`).all<Student>();
  return Promise.all(result.results.map((student) => syncAcademicYear(db, student)));
}

export async function listActiveStudentsForResourceFilter(db: D1Database, selectedId?: string, limit = 20): Promise<Student[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  const result = await db
    .prepare(
      `SELECT ${studentColumns}
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
  const student = await db.prepare(`SELECT ${studentColumns} FROM students s LEFT JOIN users u ON u.id = s.learn_user_id WHERE s.id = ?`).bind(id).first<Student>();
  return student ? syncAcademicYear(db, student) : null;
}

export async function findActiveStudentRecipient(db: D1Database, id: string): Promise<Student | null> {
  const student = await db
    .prepare(
      `SELECT ${studentColumns}
       FROM students s JOIN users u ON u.id = s.learn_user_id
       WHERE s.id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'`
    )
    .bind(id)
    .first<Student>();
  return student ? syncAcademicYear(db, student) : null;
}

export async function listInternationalStudentRecipients(db: D1Database): Promise<Student[]> {
  const result = await db
    .prepare(
      `SELECT ${studentColumns}
       FROM students s JOIN users u ON u.id = s.learn_user_id
       WHERE s.international = 1 AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
       ORDER BY s.id ASC`
    )
    .all<Student>();
  return result.results;
}

export async function findActiveStudentForUser(db: D1Database, userId: string): Promise<Student | null> {
  const student = await db
    .prepare(
      `SELECT ${studentColumns}
       FROM students s JOIN users u ON u.id = s.learn_user_id
       WHERE s.learn_user_id = ? AND s.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.role = 'STUDENT'`
    )
    .bind(userId)
    .first<Student>();
  return student ? syncAcademicYear(db, student) : null;
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
  const student = await db.prepare(`SELECT ${studentColumns} FROM students s LEFT JOIN users u ON u.id = s.learn_user_id WHERE s.learn_user_id = ?`).bind(userId).first<Student>();
  return student ? syncAcademicYear(db, student) : null;
}

type StudentProfileInput = {
  id: string;
  name: string;
  email: string;
  level?: string | null;
  international?: boolean;
  parentName?: string;
  parentEmail?: string;
  billingAddress?: string;
  additionalSupportNeeds?: string;
  academicYearSystem: StudentAcademicSystem;
  academicYear: string;
  academicYearAnchorDate?: string | null;
  classTexts?: string;
  learnUserId: string | null;
  now: string;
};

export async function insertStudent(db: D1Database, student: StudentProfileInput): Promise<void> {
  await db
    .prepare(
      "INSERT INTO students(id, name, email, level, international, parent_name, parent_email, billing_address, additional_support_needs, academic_year_system, academic_year, academic_year_anchor_date, class_texts, learn_user_id, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)"
    )
    .bind(student.id, student.name, student.email, student.level ?? null, student.international ? 1 : 0, student.parentName ?? "", student.parentEmail ?? "", student.billingAddress ?? "", student.additionalSupportNeeds ?? "", student.academicYearSystem, student.academicYear, student.academicYearAnchorDate === undefined ? student.now.slice(0, 10) : student.academicYearAnchorDate, student.classTexts ?? "", student.learnUserId, student.now, student.now)
    .run();
}

export async function updateStudent(db: D1Database, student: StudentProfileInput): Promise<void> {
  await db
    .prepare(
      "UPDATE students SET name = ?, email = ?, level = ?, international = ?, parent_name = ?, parent_email = ?, billing_address = ?, additional_support_needs = ?, academic_year_system = ?, academic_year = ?, academic_year_anchor_date = ?, class_texts = ?, learn_user_id = ?, updated_at = ? WHERE id = ?"
    )
    .bind(student.name, student.email, student.level ?? null, student.international ? 1 : 0, student.parentName ?? "", student.parentEmail ?? "", student.billingAddress ?? "", student.additionalSupportNeeds ?? "", student.academicYearSystem, student.academicYear, student.academicYearAnchorDate === undefined ? student.now.slice(0, 10) : student.academicYearAnchorDate, student.classTexts ?? "", student.learnUserId, student.now, student.id)
    .run();
}

export async function updateStudentLevel(db: D1Database, id: string, level: string, now: string): Promise<void> {
  await db.prepare("UPDATE students SET level = ?, updated_at = ? WHERE id = ?").bind(level || null, now, id).run();
}

export async function deactivateStudent(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE students SET status = 'INACTIVE', updated_at = ? WHERE id = ?").bind(now, id).run();
}
