export type ResourceStatus = "uploading" | "available" | "failed" | "deleted";

export interface Resource {
  id: string;
  student_id: string | null;
  lesson_id: string | null;
  uploaded_by_user_id: string;
  original_filename: string;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  sha256: string | null;
  page_count: number | null;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  retention_until: string;
  student_name?: string | null;
  lesson_start_at?: string | null;
  lesson_end_at?: string | null;
}

export interface ResourceListOptions {
  limit: number;
  offset: number;
  search?: string;
}

const resourceColumns = `
  r.id, r.student_id, r.lesson_id, r.uploaded_by_user_id, r.original_filename,
  r.storage_key, r.content_type, r.size_bytes, r.sha256, r.page_count, r.status,
  r.created_at, r.updated_at, r.deleted_at, r.retention_until,
  s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at
`;

export async function listResources(db: D1Database, options: ResourceListOptions): Promise<Resource[]> {
  const clauses = ["r.deleted_at IS NULL"];
  const bindings: (string | number)[] = [];
  if (options.search) {
    clauses.push("(LOWER(r.original_filename) LIKE LOWER(?) OR LOWER(s.name) LIKE LOWER(?))");
    const search = `%${options.search}%`;
    bindings.push(search, search);
  }
  bindings.push(options.limit, options.offset);
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings)
    .all<Resource>();
  return result.results;
}

export async function countResources(db: D1Database, options: Pick<ResourceListOptions, "search">): Promise<number> {
  const clauses = ["r.deleted_at IS NULL"];
  const bindings: string[] = [];
  if (options.search) {
    clauses.push("(LOWER(r.original_filename) LIKE LOWER(?) OR LOWER(s.name) LIKE LOWER(?))");
    const search = `%${options.search}%`;
    bindings.push(search, search);
  }
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       WHERE ${clauses.join(" AND ")}`
    )
    .bind(...bindings)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function listResourcesForStudent(db: D1Database, userId: string): Promise<Resource[]> {
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       LEFT JOIN students lesson_student ON lesson_student.id = l.student_id
       JOIN users u ON u.id = ?
       WHERE r.deleted_at IS NULL AND r.status = 'available'
         AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND (
           (s.learn_user_id = ? AND s.status = 'ACTIVE')
           OR (lesson_student.learn_user_id = ? AND lesson_student.status = 'ACTIVE')
         )
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .bind(userId, userId, userId)
    .all<Resource>();
  return result.results;
}

export async function listResourcesForLessonForStudent(db: D1Database, lessonId: string, userId: string): Promise<Resource[]> {
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       JOIN students owner_student ON owner_student.id = l.student_id
       JOIN users u ON u.id = ?
       WHERE r.lesson_id = ? AND r.deleted_at IS NULL AND r.status = 'available'
         AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND owner_student.learn_user_id = ? AND owner_student.status = 'ACTIVE'`
    )
    .bind(userId, lessonId, userId)
    .all<Resource>();
  return result.results;
}

export async function listResourcesForLesson(db: D1Database, lessonId: string): Promise<Resource[]> {
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE r.lesson_id = ? AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .bind(lessonId)
    .all<Resource>();
  return result.results;
}

export async function listResourcesForStudentRecord(db: D1Database, studentId: string): Promise<Resource[]> {
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE r.student_id = ? AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .bind(studentId)
    .all<Resource>();
  return result.results;
}

export async function findResource(db: D1Database, id: string): Promise<Resource | null> {
  return db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE r.id = ?`
    )
    .bind(id)
    .first<Resource>();
}

export async function findResourceForStudent(db: D1Database, id: string, userId: string): Promise<Resource | null> {
  return db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       LEFT JOIN students lesson_student ON lesson_student.id = l.student_id
       JOIN users u ON u.id = ?
       WHERE r.id = ? AND r.deleted_at IS NULL AND r.status = 'available'
         AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
         AND (
           (s.learn_user_id = ? AND s.status = 'ACTIVE')
           OR (lesson_student.learn_user_id = ? AND lesson_student.status = 'ACTIVE')
         )`
    )
    .bind(userId, id, userId, userId)
    .first<Resource>();
}

export async function findResourceByIdempotencyKey(db: D1Database, key: string): Promise<Resource | null> {
  return db
    .prepare("SELECT id, student_id, lesson_id, uploaded_by_user_id, original_filename, storage_key, content_type, size_bytes, sha256, page_count, status, created_at, updated_at, deleted_at, retention_until FROM resources WHERE idempotency_key = ?")
    .bind(key)
    .first<Resource>();
}

export async function insertUploadingResource(
  db: D1Database,
  resource: Omit<Resource, "student_name" | "lesson_start_at" | "deleted_at"> & { idempotency_key: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO resources
       (id, student_id, lesson_id, uploaded_by_user_id, original_filename, storage_key,
        content_type, size_bytes, sha256, page_count, status, idempotency_key,
        created_at, updated_at, deleted_at, retention_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploading', ?, ?, ?, NULL, ?)`
    )
    .bind(
      resource.id,
      resource.student_id,
      resource.lesson_id,
      resource.uploaded_by_user_id,
      resource.original_filename,
      resource.storage_key,
      resource.content_type,
      resource.size_bytes,
      resource.sha256,
      resource.page_count,
      resource.idempotency_key,
      resource.created_at,
      resource.updated_at,
      resource.retention_until
    )
    .run();
}

export async function markResourceAvailable(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE resources SET status = 'available', updated_at = ? WHERE id = ? AND status = 'uploading'").bind(now, id).run();
}

export async function markResourceFailed(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE resources SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'uploading'").bind(now, id).run();
}

export async function deleteResourceMetadata(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare("UPDATE resources SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind(now, now, id).run();
}
