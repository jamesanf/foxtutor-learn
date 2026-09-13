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
  studentId?: string;
  lessonId?: string;
  contentTypes?: string[];
  createdAfter?: string;
  sort?: "newest" | "oldest" | "filename-asc" | "filename-desc";
}

export interface ResourceSuggestion {
  id: string;
  label: string;
  detail: string;
  kind: "file" | "student" | "lesson";
  value?: string;
  studentId?: string;
}

const resourceColumns = `
  r.id, r.student_id, r.lesson_id, r.uploaded_by_user_id, r.original_filename,
  r.storage_key, r.content_type, r.size_bytes, r.sha256, r.page_count, r.status,
  r.created_at, r.updated_at, r.deleted_at, r.retention_until,
  s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at
`;

export async function listResources(db: D1Database, options: ResourceListOptions): Promise<Resource[]> {
  const clauses = ["r.deleted_at IS NULL", "r.status = 'available'"];
  const bindings: (string | number)[] = [];
  if (options.search) {
    clauses.push("(LOWER(r.original_filename) LIKE LOWER(?) ESCAPE '\\' OR LOWER(s.name) LIKE LOWER(?) ESCAPE '\\' OR LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\')");
    const search = `%${options.search.replace(/[%_]/g, (character) => `\\${character}`)}%`;
    bindings.push(search, search, search);
  }
  if (options.studentId) {
    clauses.push("r.student_id = ?");
    bindings.push(options.studentId);
  }
  if (options.lessonId) {
    clauses.push("r.lesson_id = ?");
    bindings.push(options.lessonId);
  }
  if (options.contentTypes?.length) {
    clauses.push(`r.content_type IN (${options.contentTypes.map(() => "?").join(", ")})`);
    bindings.push(...options.contentTypes);
  }
  if (options.createdAfter) {
    clauses.push("r.created_at >= ?");
    bindings.push(options.createdAfter);
  }
  const orderBy = options.sort === "oldest"
    ? "r.created_at ASC, r.id ASC"
    : options.sort === "filename-asc"
      ? "LOWER(r.original_filename) ASC, r.id ASC"
      : options.sort === "filename-desc"
        ? "LOWER(r.original_filename) DESC, r.id DESC"
        : "r.created_at DESC, r.id DESC";
  bindings.push(options.limit, options.offset);
  const result = await db
    .prepare(
      `SELECT ${resourceColumns}
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings)
    .all<Resource>();
  return result.results;
}

export async function countResources(db: D1Database, options: Omit<ResourceListOptions, "limit" | "offset" | "sort">): Promise<number> {
  const clauses = ["r.deleted_at IS NULL", "r.status = 'available'"];
  const bindings: string[] = [];
  if (options.search) {
    clauses.push("(LOWER(r.original_filename) LIKE LOWER(?) ESCAPE '\\' OR LOWER(s.name) LIKE LOWER(?) ESCAPE '\\' OR LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\')");
    const search = `%${options.search.replace(/[%_]/g, (character) => `\\${character}`)}%`;
    bindings.push(search, search, search);
  }
  if (options.studentId) {
    clauses.push("r.student_id = ?");
    bindings.push(options.studentId);
  }
  if (options.lessonId) {
    clauses.push("r.lesson_id = ?");
    bindings.push(options.lessonId);
  }
  if (options.contentTypes?.length) {
    clauses.push(`r.content_type IN (${options.contentTypes.map(() => "?").join(", ")})`);
    bindings.push(...options.contentTypes);
  }
  if (options.createdAfter) {
    clauses.push("r.created_at >= ?");
    bindings.push(options.createdAfter);
  }
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE ${clauses.join(" AND ")}`
    )
    .bind(...bindings)
    .first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

function escapedSearch(value: string): string {
  return `%${value.trim().slice(0, 100).replace(/[%_]/g, (character) => `\\${character}`)}%`;
}

export async function listResourceSuggestions(db: D1Database, query: string, limit = 5, studentId?: string): Promise<{
  files: ResourceSuggestion[];
  students: ResourceSuggestion[];
  lessons: ResourceSuggestion[];
}> {
  const trimmed = query.trim().slice(0, 100);
  if (trimmed.length < 2) return { files: [], students: [], lessons: [] };
  const pattern = escapedSearch(trimmed);
  const prefix = `${trimmed.replace(/[%_]/g, (character) => `\\${character}`)}%`;
  const bounded = Math.max(1, Math.min(limit, 5));
  const [files, students, lessons] = await Promise.all([
    db.prepare(
      `SELECT r.id, r.original_filename AS label, s.name AS detail
       FROM resources r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN lessons l ON l.id = r.lesson_id
       WHERE r.deleted_at IS NULL AND r.status = 'available'
         AND (LOWER(r.original_filename) LIKE LOWER(?) ESCAPE '\\'
           OR LOWER(s.name) LIKE LOWER(?) ESCAPE '\\'
           OR LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\')
       ORDER BY CASE
         WHEN LOWER(r.original_filename) = LOWER(?) THEN 0
         WHEN LOWER(r.original_filename) LIKE LOWER(?) ESCAPE '\\' THEN 1
         WHEN LOWER(s.name) = LOWER(?) THEN 2
         ELSE 3 END,
         r.created_at DESC, r.id DESC
       LIMIT ?`
    ).bind(pattern, pattern, pattern, trimmed, prefix, trimmed, bounded).all<{ id: string; label: string; detail: string | null }>(),
    db.prepare(
      `SELECT s.id, s.name AS label, COUNT(r.id) AS detail
       FROM students s
       JOIN resources r ON r.student_id = s.id
       WHERE s.status = 'ACTIVE' AND r.deleted_at IS NULL AND r.status = 'available'
         AND LOWER(s.name) LIKE LOWER(?) ESCAPE '\\'
       GROUP BY s.id, s.name
       ORDER BY CASE WHEN LOWER(s.name) = LOWER(?) THEN 0 WHEN LOWER(s.name) LIKE LOWER(?) ESCAPE '\\' THEN 1 ELSE 2 END, LOWER(s.name)
       LIMIT ?`
    ).bind(pattern, trimmed, prefix, bounded).all<{ id: string; label: string; detail: number | string }>(),
    db.prepare(
      `SELECT l.id, l.student_id, s.name AS student_name, l.start_at, l.notes
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       WHERE s.status = 'ACTIVE'
         AND (? = '' OR l.student_id = ?)
         AND (LOWER(s.name) LIKE LOWER(?) ESCAPE '\\' OR LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\')
       ORDER BY CASE WHEN LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\' THEN 0 ELSE 1 END, l.start_at DESC, l.id DESC
       LIMIT ?`
    ).bind(studentId ?? "", studentId ?? "", pattern, pattern, prefix, bounded).all<{ id: string; student_name: string; start_at: string; notes: string; student_id: string }>()
  ]);
  return {
    files: files.results.map((item) => ({ id: item.id, label: item.label, detail: item.detail ?? "Resource", kind: "file" })),
    students: students.results.map((item) => ({ id: item.id, label: item.label, detail: `${Number(item.detail)} resource${Number(item.detail) === 1 ? "" : "s"}`, kind: "student", value: item.id })),
    lessons: lessons.results.map((item) => ({
      id: item.id,
      label: `${item.student_name} · ${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(item.start_at))}`,
      detail: item.notes.trim().split(/\s+/).slice(0, 5).join(" ") || "Lesson context",
      kind: "lesson",
      value: item.id,
      studentId: item.student_id
    }))
  };
}

export async function activeResourceBytesForLesson(db: D1Database, lessonId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM resources WHERE lesson_id = ? AND deleted_at IS NULL AND status IN ('uploading', 'available')")
    .bind(lessonId)
    .first<{ bytes: number | string }>();
  return Number(result?.bytes ?? 0);
}

export async function listResourcesForStudent(db: D1Database, userId: string, search?: string): Promise<Resource[]> {
  const searchClause = search?.trim()
    ? "AND (LOWER(r.original_filename) LIKE LOWER(?) ESCAPE '\\' OR LOWER(COALESCE(l.notes, '')) LIKE LOWER(?) ESCAPE '\\')"
    : "";
  const bindings: (string | number)[] = [userId, userId, userId];
  if (search?.trim()) {
    const pattern = escapedSearch(search);
    bindings.push(pattern, pattern);
  }
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
         ) ${searchClause}
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .bind(...bindings)
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
