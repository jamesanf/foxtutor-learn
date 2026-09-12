import type { AppUser, LearnRoute, Role } from "../auth/authorization";
import { canAccess, classifyLearnRoute, requiredRole } from "../auth/authorization";
import { identityEmail } from "../auth/identity";
import { findActiveUser } from "../db/users";
import {
  deactivateStudent,
  findStudent,
  findStudentAccount,
  findStudentLinkedToUser,
  insertStudent,
  listStudents,
  updateStudent,
  type Student
} from "../db/students";
import {
  findLesson,
  findLessonForUser,
  hasOverlappingLesson,
  insertLesson,
  listLessons,
  listLessonsForUser,
  updateLesson,
  updateLessonStatus,
  type Lesson
} from "../db/lessons";
import {
  canTransitionLessonStatus,
  isoToLocalDateTime,
  isLessonStatus,
  validEmail,
  validName,
  validateLessonInput,
  type LessonStatus
} from "../domain/validation";
import { privateHeaders } from "../security/headers";
import { clearSessionCookies, createSession, csrfValid, readSession, type ActiveSession } from "../security/session";

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  ENVIRONMENT?: string;
  PUBLIC_ORIGIN?: string;
  MAIL_API_URL?: string;
  MAIL_API_TOKEN?: string;
  MAIL_API_FROM?: string;
  MAIL_API_ACCESS_CLIENT_ID?: string;
  MAIL_API_ACCESS_CLIENT_SECRET?: string;
}

function htmlDocument(title: string, body: string): Response {
  const headers = privateHeaders("text/html; charset=utf-8");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><title>${escapeHtml(title)} | Foxtutor Learn</title><link rel="stylesheet" href="/learn/assets/learn.css"></head><body>${body}</body></html>`,
    { headers }
  );
}

function messagePage(title: string, message: string, status: number): Response {
  return new Response(
    htmlDocument(
      title,
      `<main class="centered"><div class="card"><p class="eyebrow">FOXTUTOR LEARN</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a class="button" href="/learn">Return to Learn</a></div></main>`
    ).body,
    { status, headers: htmlDocument(title, "").headers }
  );
}

function redirect(location: string, setCookies: string[] = []): Response {
  const headers = privateHeaders();
  headers.set("Location", location);
  for (const value of setCookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function navigation(role: Role): string {
  const links = role === "ADMIN"
    ? [["/learn/admin", "Dashboard"], ["/learn/admin/students", "Students"], ["/learn/admin/lessons", "Lessons"]]
    : [["/learn/student", "Dashboard"], ["/learn/student/lessons", "My lessons"]];
  return links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("");
}

function appPage(user: AppUser, csrfToken: string, title: string, content: string): Response {
  const body = `<div class="app-shell"><header class="topbar"><a class="brand" href="/learn"><span class="brand-mark">F</span><span>Foxtutor <strong>Learn</strong></span></a><div class="identity"><span>${escapeHtml(user.display_name)}<small>${user.role}</small></span><form method="post" action="/learn/logout"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><button type="submit" class="link-button">Log out</button></form></div></header><div class="layout"><nav aria-label="Primary navigation">${navigation(user.role)}</nav><main class="content">${content}</main></div></div>`;
  return htmlDocument(title, body);
}

function withSessionCookies(response: Response, setCookies: string[] | undefined): Response {
  for (const value of setCookies ?? []) response.headers.append("Set-Cookie", value);
  return response;
}

function buttonLink(href: string, label: string): string {
  return `<a class="button" href="${href}">${escapeHtml(label)}</a>`;
}

function statusLabel(status: LessonStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatLessonTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: lesson.timezone });
  return `${formatter.format(new Date(lesson.start_at))} - ${formatter.format(new Date(lesson.end_at))} (${lesson.timezone})`;
}

function lessonRow(lesson: Lesson, basePath: string, showStudent: boolean): string {
  return `<tr><td>${showStudent ? `<a href="/learn/admin/students/${encodeURIComponent(lesson.student_id)}">${escapeHtml(lesson.student_name ?? "Student")}</a>` : "Lesson"}</td><td><a href="${basePath}/${encodeURIComponent(lesson.id)}">${escapeHtml(formatLessonTime(lesson))}</a></td><td><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></td></tr>`;
}

function lessonTable(lessons: Lesson[], basePath: string, showStudent: boolean): string {
  if (!lessons.length) return `<p class="muted">No lessons yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr>${showStudent ? "<th>Student</th>" : "<th>Lesson</th>"}<th>Date and time</th><th>Status</th></tr></thead><tbody>${lessons.map((lesson) => lessonRow(lesson, basePath, showStudent)).join("")}</tbody></table></div>`;
}

function studentRows(students: Student[]): string {
  if (!students.length) return `<p class="muted">No students yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>${students.map((student) => `<tr><td><a href="/learn/admin/students/${encodeURIComponent(student.id)}">${escapeHtml(student.name)}</a></td><td>${escapeHtml(student.email)}</td><td><span class="status status-${student.status.toLowerCase()}">${student.status === "ACTIVE" ? "Active" : "Inactive"}</span></td><td><a href="/learn/admin/students/${encodeURIComponent(student.id)}/edit">Edit</a></td></tr>`).join("")}</tbody></table></div>`;
}

function hiddenCsrf(csrfToken: string): string {
  return `<input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}">`;
}

function inputField(label: string, name: string, value: string, type = "text", required = false): string {
  return `<label>${escapeHtml(label)}<input type="${type}" name="${name}" value="${escapeHtml(value)}"${required ? " required" : ""}></label>`;
}

function studentForm(csrfToken: string, action: string, student?: Student, error?: string): string {
  return `<section class="card form-card"><p class="eyebrow">STUDENT RECORD</p><h1>${student ? "Edit student" : "Create student"}</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}${inputField("Name", "name", student?.name ?? "", "text", true)}${inputField("Contact email", "email", student?.email ?? "", "email", true)}${inputField("Learn account email (optional explicit link)", "learnAccountEmail", student?.learn_user_email ?? "", "email")}<p class="help">Only an active STUDENT Learn account can be linked. Matching contact email alone never grants access.</p><button class="button" type="submit">Save student</button> <a class="button secondary" href="/learn/admin/students">Cancel</a></form></section>`;
}

function lessonForm(
  csrfToken: string,
  action: string,
  students: Student[],
  error?: string,
  lesson?: Lesson,
  selectedStudent?: string
): string {
  const studentId = lesson?.student_id ?? selectedStudent ?? "";
  const timezone = lesson?.timezone ?? "Europe/London";
  const start = lesson ? isoToLocalDateTime(lesson.start_at, timezone) : "";
  const end = lesson ? isoToLocalDateTime(lesson.end_at, timezone) : "";
  return `<section class="card form-card"><p class="eyebrow">LESSON RECORD</p><h1>${lesson ? "Edit lesson" : "Create lesson"}</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}<label>Student<select name="studentId" required><option value="">Choose a student</option>${students.filter((student) => student.status === "ACTIVE").map((student) => `<option value="${escapeHtml(student.id)}"${student.id === studentId ? " selected" : ""}>${escapeHtml(student.name)} (${escapeHtml(student.email)})</option>`).join("")}</select></label>${inputField("Start", "startAt", start, "datetime-local", true)}${inputField("End", "endAt", end, "datetime-local", true)}${inputField("Timezone (IANA)", "timezone", timezone, "text", true)}${inputField("External lesson URL (HTTPS)", "externalUrl", lesson?.external_url ?? "", "url")}<label>Notes<textarea name="notes" rows="7" maxlength="10000">${escapeHtml(lesson?.notes ?? "")}</textarea></label><input type="hidden" name="status" value="${escapeHtml(lesson?.status ?? "scheduled")}"><p class="help">Times are entered in the selected timezone and stored as UTC instants. Status changes are separate and explicit.</p><button class="button" type="submit">Save lesson</button> <a class="button secondary" href="/learn/admin/lessons">Cancel</a></form></section>`;
}

async function parseForm(request: Request): Promise<FormData | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) return null;
  const body = await request.clone().arrayBuffer();
  if (body.byteLength > 32_768) return null;
  try {
    return await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function studentIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/admin\/students\/([^/]+)(?:\/(?:edit|deactivate))?$/.exec(pathname.replace(/\/+$/, ""));
  return match ? decodePathSegment(match[1]) : null;
}

function lessonIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/(?:admin\/lessons|student\/lessons)\/([^/]+)(?:\/(?:edit|status))?$/.exec(pathname.replace(/\/+$/, ""));
  return match ? decodePathSegment(match[1]) : null;
}

function decodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

async function requireApplicationSession(request: Request, env: Env): Promise<{ active: ActiveSession | null; response?: Response; setCookies?: string[] }> {
  if (!env.DB) return { active: null, response: messagePage("Service unavailable", "The Learn database is not configured for this environment.", 503) };
  const email = identityEmail(request, env.ENVIRONMENT);
  if (!email) return { active: null, response: messagePage("Authentication required", "Use the configured Google account to enter the private Learn portal.", 401) };
  const user = await findActiveUser(env.DB, email);
  if (!user) return { active: null, response: messagePage("Account not provisioned", "This Google identity is authenticated but has not been invited to Foxtutor Learn.", 403) };
  const existing = await readSession(request, env.DB);
  if (existing && existing.user.id === user.id) return { active: existing };
  const created = await createSession(env.DB, user, env.ENVIRONMENT === "production");
  return { active: created.active, setCookies: created.setCookies };
}

function adminDashboard(user: AppUser, csrfToken: string): Response {
  return appPage(user, csrfToken, "Admin dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Admin dashboard</h1><p class="lede">Manage students and lessons from one private workspace.</p><div class="quick-links"><a class="card" href="/learn/admin/students"><h2>Students</h2><p>View, create, edit and deactivate student records.</p></a><a class="card" href="/learn/admin/lessons"><h2>Lessons</h2><p>Create lessons, manage notes and update lifecycle status.</p></a></div>`);
}

async function handleAdmin(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const url = new URL(request.url);
  const csrfToken = active.csrfToken;
  if (route === "admin") return adminDashboard(active.user, csrfToken);
  if (route === "admin-students") {
    return appPage(active.user, csrfToken, "Students", `<div class="page-heading"><div><p class="eyebrow">STUDENT MANAGEMENT</p><h1>Students</h1></div>${buttonLink("/learn/admin/students/new", "Create student")}</div>${studentRows(await listStudents(db))}`);
  }
  if (route === "admin-student-form") {
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new"));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const name = validName(formText(form, "name"));
    const email = validEmail(formText(form, "email"));
    const accountEmailRaw = formText(form, "learnAccountEmail").trim();
    const accountEmail = accountEmailRaw ? validEmail(accountEmailRaw) : null;
    if (!name || !email || (accountEmailRaw && !accountEmail)) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, "Enter a valid name, contact email and optional Learn account email."));
    const account = accountEmail ? await findStudentAccount(db, accountEmail) : null;
    if (accountEmail && !account) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, "The Learn account email must belong to an active STUDENT account."));
    if (account && await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    await insertStudent(db, { id: crypto.randomUUID(), name, email, learnUserId: account?.id ?? null, now: new Date().toISOString() });
    return redirect("/learn/admin/students");
  }
  if (route === "admin-student" || route === "admin-student-edit" || route === "admin-student-deactivate") {
    const id = studentIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That student record does not exist.", 404);
    const student = await findStudent(db, id);
    if (!student) return messagePage("Not found", "That student record does not exist.", 404);
    if (route === "admin-student") {
      const lessons = (await listLessons(db)).filter((lesson) => lesson.student_id === student.id);
      return appPage(active.user, csrfToken, "Student", `<p class="eyebrow">STUDENT RECORD</p><div class="page-heading"><div><h1>${escapeHtml(student.name)}</h1><p class="lede">${escapeHtml(student.email)}</p></div>${buttonLink(`/learn/admin/lessons/new?student=${encodeURIComponent(student.id)}`, "Create lesson")}</div><section class="card detail-grid"><p><strong>Status</strong><br>${student.status === "ACTIVE" ? "Active" : "Inactive"}</p><p><strong>Learn account</strong><br>${student.learn_user_id ? "Explicitly linked" : "Not linked"}</p><p><strong>Created</strong><br>${escapeHtml(student.created_at)}</p><p><strong>Updated</strong><br>${escapeHtml(student.updated_at)}</p></section><div class="page-heading"><h2>Lessons</h2>${buttonLink(`/learn/admin/students/${encodeURIComponent(student.id)}/edit`, "Edit student")}</div>${lessonTable(lessons, "/learn/admin/lessons", true)}${student.status === "ACTIVE" ? `<form method="post" action="/learn/admin/students/${encodeURIComponent(student.id)}/deactivate" class="inline-form">${hiddenCsrf(csrfToken)}<button class="button danger" type="submit">Deactivate student</button></form>` : ""}`);
    }
    if (route === "admin-student-deactivate") {
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      await deactivateStudent(db, student.id, new Date().toISOString());
      return redirect(`/learn/admin/students/${encodeURIComponent(student.id)}`);
    }
    if (request.method === "GET") return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, `${url.pathname}`, student));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const name = validName(formText(form, "name"));
    const email = validEmail(formText(form, "email"));
    const accountEmailRaw = formText(form, "learnAccountEmail").trim();
    const accountEmail = accountEmailRaw ? validEmail(accountEmailRaw) : null;
    if (!name || !email || (accountEmailRaw && !accountEmail)) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, "Enter a valid name, contact email and optional Learn account email."));
    const account = accountEmail ? await findStudentAccount(db, accountEmail) : null;
    if (accountEmail && !account) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, "The Learn account email must belong to an active STUDENT account."));
    if (account && account.id !== student.learn_user_id && await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    await updateStudent(db, { id: student.id, name, email, learnUserId: account?.id ?? null, now: new Date().toISOString() });
    return redirect(`/learn/admin/students/${encodeURIComponent(student.id)}`);
  }
  if (route === "admin-lessons") {
    return appPage(active.user, csrfToken, "Lessons", `<div class="page-heading"><div><p class="eyebrow">LESSON MANAGEMENT</p><h1>Lessons</h1></div>${buttonLink("/learn/admin/lessons/new", "Create lesson")}</div>${lessonTable(await listLessons(db), "/learn/admin/lessons", true)}`);
  }
  if (route === "admin-lesson-form") {
    const students = await listStudents(db);
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, undefined, undefined, url.searchParams.get("student") ?? undefined));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const fields = { studentId: formText(form, "studentId"), startAt: formText(form, "startAt"), endAt: formText(form, "endAt"), timezone: formText(form, "timezone").trim(), status: formText(form, "status"), notes: formText(form, "notes"), externalUrl: formText(form, "externalUrl") };
    const validation = validateLessonInput(fields);
    if (!validation.value || validation.value.status !== "scheduled") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, validation.error ?? "New lessons must start as scheduled.", undefined, fields.studentId));
    const student = await findStudent(db, validation.value.studentId);
    if (!student || student.status !== "ACTIVE") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, "Choose an active student.", undefined, fields.studentId));
    if (await hasOverlappingLesson(db, validation.value.studentId, validation.value.startAt, validation.value.endAt)) return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, "This student already has an overlapping active lesson.", undefined, fields.studentId));
    await insertLesson(db, { ...validation.value, id: crypto.randomUUID(), now: new Date().toISOString() });
    return redirect("/learn/admin/lessons");
  }
  if (route === "admin-lesson" || route === "admin-lesson-edit" || route === "admin-lesson-status") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLesson(db, id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    if (route === "admin-lesson") {
      return appPage(active.user, csrfToken, "Lesson", `<p class="eyebrow">LESSON RECORD</p><div class="page-heading"><div><h1>${escapeHtml(lesson.student_name ?? "Lesson")}</h1><p class="lede">${escapeHtml(formatLessonTime(lesson))}</p></div>${buttonLink(`${url.pathname}/edit`, "Edit lesson")}</div><section class="card detail-grid"><p><strong>Status</strong><br><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></p><p><strong>External lesson URL</strong><br>${lesson.external_url ? `<a href="${escapeHtml(lesson.external_url)}" rel="noreferrer">${escapeHtml(lesson.external_url)}</a>` : "Not set"}</p><p class="full-width"><strong>Private notes</strong><br>${lesson.notes ? escapeHtml(lesson.notes).replace(/\n/g, "<br>") : "No notes"}</p></section><form method="post" action="${url.pathname}/status" class="inline-form">${hiddenCsrf(csrfToken)}<label>Change status<select name="status">${(["scheduled", "completed", "cancelled"] as LessonStatus[]).map((status) => `<option value="${status}"${status === lesson.status ? " selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></label><button class="button" type="submit">Save status</button></form>`);
    }
    if (route === "admin-lesson-status") {
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      const form = await parseForm(request);
      const nextStatus = form ? formText(form, "status") : "";
      if (!isLessonStatus(nextStatus) || !canTransitionLessonStatus(lesson.status, nextStatus)) return messagePage("Invalid status change", "That lesson lifecycle transition is not allowed.", 409);
      await updateLessonStatus(db, lesson.id, nextStatus, new Date().toISOString());
      return redirect(`/learn/admin/lessons/${encodeURIComponent(lesson.id)}`);
    }
    const students = await listStudents(db);
    if (request.method === "GET") return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, undefined, lesson));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const fields = { studentId: formText(form, "studentId"), startAt: formText(form, "startAt"), endAt: formText(form, "endAt"), timezone: formText(form, "timezone").trim(), status: lesson.status, notes: formText(form, "notes"), externalUrl: formText(form, "externalUrl") };
    const validation = validateLessonInput(fields);
    if (!validation.value) return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, validation.error, lesson));
    const student = await findStudent(db, validation.value.studentId);
    if (!student || student.status !== "ACTIVE") return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "Choose an active student.", lesson));
    if (await hasOverlappingLesson(db, validation.value.studentId, validation.value.startAt, validation.value.endAt, lesson.id)) return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "This student already has an overlapping active lesson.", lesson));
    await updateLesson(db, { ...validation.value, id: lesson.id, now: new Date().toISOString() });
    return redirect(`/learn/admin/lessons/${encodeURIComponent(lesson.id)}`);
  }
  return messagePage("Not found", "That Learn route does not exist.", 404);
}

function studentDashboard(user: AppUser, csrfToken: string): Response {
  return appPage(user, csrfToken, "Student dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Student dashboard</h1><p class="lede">Your private lesson schedule is available here.</p><section class="card"><h2>My lessons</h2><p>View upcoming, completed and cancelled lessons assigned to your account.</p>${buttonLink("/learn/student/lessons", "View my lessons")}</section>`);
}

async function handleStudent(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const csrfToken = active.csrfToken;
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (route === "student" && pathname === "/learn/student") return studentDashboard(active.user, csrfToken);
  if (route === "student" || route === "student-lessons") {
    const lessons = await listLessonsForUser(db, active.user.id);
    const now = Date.now();
    const upcoming = lessons.filter((lesson) => lesson.status === "scheduled" && new Date(lesson.start_at).getTime() >= now);
    const past = lessons.filter((lesson) => lesson.status !== "cancelled" && (lesson.status === "completed" || new Date(lesson.start_at).getTime() < now));
    const cancelled = lessons.filter((lesson) => lesson.status === "cancelled");
    return appPage(active.user, csrfToken, "My lessons", `<p class="eyebrow">STUDENT SCHEDULE</p><h1>My lessons</h1><section class="card"><h2>Upcoming</h2>${lessonTable(upcoming, "/learn/student/lessons", false)}</section><section class="card"><h2>Past</h2>${lessonTable(past, "/learn/student/lessons", false)}</section><section class="card"><h2>Cancelled</h2>${lessonTable(cancelled, "/learn/student/lessons", false)}</section>`);
  }
  if (route === "student-lesson") {
    const id = lessonIdFromPath(new URL(request.url).pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLessonForUser(db, id, active.user.id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    return appPage(active.user, csrfToken, "Lesson", `<p class="eyebrow">MY LESSON</p><h1>${escapeHtml(formatLessonTime(lesson))}</h1><section class="card detail-grid"><p><strong>Status</strong><br><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></p><p><strong>Lesson destination</strong><br>${lesson.external_url ? `<a href="${escapeHtml(lesson.external_url)}" rel="noreferrer">${escapeHtml(lesson.external_url)}</a>` : "Not provided"}</p></section>`);
  }
  return messagePage("Not found", "That Learn route does not exist.", 404);
}

async function learn(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = classifyLearnRoute(url.pathname);
  if (route === "asset") {
    const assetPath = url.pathname === "/learn/assets/learn.css" ? "/learn.css" : "/learn.js";
    const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, url)));
    const headers = privateHeaders(asset.headers.get("Content-Type") ?? "text/plain");
    return new Response(asset.body, { status: asset.status, headers });
  }
  const sessionResult = await requireApplicationSession(request, env);
  if (sessionResult.response) return sessionResult.response;
  const active = sessionResult.active;
  if (!active) return messagePage("Authentication required", "A valid Learn session is required.", 401);
  if (route === "logout") {
    if (!(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (env.DB) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(active.user.id).run();
    return redirect("/learn", clearSessionCookies(env.ENVIRONMENT === "production"));
  }
  if (route === "entry") return redirect(active.user.role === "ADMIN" ? "/learn/admin" : "/learn/student", sessionResult.setCookies);
  if (route === "not-found") return messagePage("Not found", "That Learn route does not exist.", 404);
  if (!canAccess(active.user, route)) {
    const expected = requiredRole(route);
    return messagePage("Not authorized", `This area is restricted to ${expected === "ADMIN" ? "administrators" : "students"}.`, 403);
  }
  const response = active.user.role === "ADMIN"
    ? await handleAdmin(request, env, active, route)
    : await handleStudent(request, env, active, route);
  return withSessionCookies(response, sessionResult.setCookies);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/learn" || url.pathname.startsWith("/learn/")) return learn(request, env);
    return env.ASSETS.fetch(request);
  }
};
