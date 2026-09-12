import type { AppUser, LearnRoute, Role } from "../auth/authorization";
import { canAccess, classifyLearnRoute, requiredRole } from "../auth/authorization";
import { identityEmail } from "../auth/identity";
import { findActiveUser } from "../db/users";
import {
  deactivateStudent,
  findStudent,
  findStudentAccount,
  findActiveStudentForUser,
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
  listLessonsForUserInRange,
  listLessonsInRange,
  listLessonsForUser,
  updateLesson,
  updateLessonStatus,
  type Lesson
} from "../db/lessons";
import {
  findActiveCalendarFeedForOwner,
  findCalendarFeedByTokenHash,
  rotateCalendarFeed,
  type CalendarFeed
} from "../db/calendar-feeds";
import {
  CALENDAR_TIMEZONE,
  currentCalendarDate
} from "../domain/calendar";
import {
  canTransitionLessonStatus,
  deriveLessonEnd,
  isoToLocalDateTime,
  isQuarterHourTime,
  localDateTimeToIso,
  isLessonStatus,
  STANDARD_LESSON_DURATION_MINUTES,
  validEmail,
  validName,
  validateLessonInput,
  type LessonStatus
} from "../domain/validation";
import { privateHeaders } from "../security/headers";
import { clearSessionCookies, createSession, csrfValid, readSession, type ActiveSession } from "../security/session";
import { feedTokenLast4, generateFeedToken, hashFeedToken, isFeedToken } from "../security/feed-token";
import { feedRange, generateIcs } from "../domain/icalendar";

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
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><meta name="theme-color" content="#0e7490"><title>${escapeHtml(title)} | FoxTutor Learn</title><link rel="icon" type="image/png" href="/learn/assets/my-favicon/favicon-96x96.png" sizes="96x96"><link rel="shortcut icon" href="/learn/assets/my-favicon/favicon.ico"><link rel="apple-touch-icon" href="/learn/assets/my-favicon/apple-touch-icon.png"><link rel="manifest" href="/learn/assets/my-favicon/site.webmanifest"><link rel="preload" href="/learn/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/learn/assets/learn.css"><script src="/learn/assets/learn.js" defer></script></head><body>${body}</body></html>`,
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
    ? [["/learn/admin", "Dashboard"], ["/learn/admin/calendar", "Calendar"], ["/learn/admin/students", "Students"], ["/learn/admin/lessons", "Lessons"]]
    : [["/learn/student", "Dashboard"], ["/learn/student/calendar", "Calendar"], ["/learn/student/lessons", "My lessons"]];
  return links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("");
}

function appPage(user: AppUser, csrfToken: string, title: string, content: string): Response {
  const body = `<div class="app-shell"><header class="topbar"><a class="brand" href="/learn"><img class="brand-logo" src="/learn/assets/foxlearninglogo-240.webp" alt="FoxTutor" width="48" height="46"><span class="brand-copy"><strong>James Fox</strong><small>FoxTutor Learn</small></span></a><div class="identity"><span>${escapeHtml(user.display_name)}<small>${user.role}</small></span><form method="post" action="/learn/logout"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><button type="submit" class="link-button">Log out</button></form></div></header><div class="layout"><nav aria-label="Primary navigation"><div class="nav-links">${navigation(user.role)}</div></nav><main class="content">${content}</main></div></div>`;
  return htmlDocument(title, body);
}

function withSessionCookies(response: Response, setCookies: string[] | undefined): Response {
  for (const value of setCookies ?? []) response.headers.append("Set-Cookie", value);
  return response;
}

function buttonLink(href: string, label: string): string {
  return `<a class="button" href="${href}">${escapeHtml(label)}</a>`;
}

function calendarFeedUrl(request: Request, env: Env, token: string): string {
  const origin = (env.PUBLIC_ORIGIN ?? `${new URL(request.url).origin}/learn`).replace(/\/+$/, "");
  return `${origin}/calendar/feed/${token}`;
}

function calendarSubscriptionCard(
  csrfToken: string,
  action: string,
  feed: CalendarFeed | null,
  feedUrl: string | undefined,
  statusMessage?: string
): string {
  const generated = feedUrl
    ? `<div class="subscription-link-group"><label class="feed-link-label" for="feed-link">Private calendar link</label><div class="feed-link-row"><input id="feed-link" class="feed-link" readonly value="${escapeHtml(feedUrl)}"><button class="button secondary copy-link" type="button" data-copy-target="feed-link">Copy link</button></div></div>`
    : "";
  const actionLabel = feed ? "Generate new link" : "Generate link";
  const confirmation = feed
    ? `<div class="inline-confirmation" data-confirmation-panel hidden role="alertdialog" aria-modal="true" aria-labelledby="regenerate-title" aria-describedby="regenerate-description"><strong id="regenerate-title">Regenerate calendar link?</strong><span id="regenerate-description">The current link will stop working.</span><div class="confirmation-actions"><button class="button secondary" type="button" data-confirm-cancel>Cancel</button><button class="button" type="button" data-confirm-submit>Regenerate</button></div></div>`
    : "";
  const empty = !feedUrl
    ? `<div class="subscription-empty"><strong>${feed ? "Generate a new private calendar link." : "Create a private calendar link."}</strong><span>${feed ? "The new link will appear here after generation." : "Use it in your calendar app."}</span></div>`
    : "";
  const warning = feed ? `<p class="privacy-warning" role="note">Regenerating the link invalidates the old link.</p>` : "";
  return `<details class="card subscription-card"${feedUrl ? " open" : ""}><summary><span>Calendar subscription</span><span class="subscription-chevron" aria-hidden="true"></span></summary><div class="subscription-content">${statusMessage ? `<p class="form-success" role="status">${escapeHtml(statusMessage)}</p>` : ""}${generated}${empty}${warning}<div class="subscription-actions"><form method="post" action="${action}"${feed ? ' data-confirmation="true"' : ""}>${hiddenCsrf(csrfToken)}<button class="button${feed ? " secondary" : ""}" type="submit">${actionLabel}</button></form>${confirmation}</div></div></details>`;
}

function statusLabel(status: LessonStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatLessonTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: lesson.timezone });
  return `${formatter.format(new Date(lesson.start_at))} - ${formatter.format(new Date(lesson.end_at))} (${lesson.timezone})`;
}

function formatCalendarLessonTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: lesson.timezone });
  return `${formatter.format(new Date(lesson.start_at))} - ${formatter.format(new Date(lesson.end_at))} (${lesson.timezone})`;
}

function calendarView(lessons: Lesson[], role: Role): string {
  const basePath = role === "ADMIN" ? "/learn/admin/lessons" : "/learn/student/lessons";
  const showStudent = role === "ADMIN";
  const events = lessons.map((lesson) => {
    const displayTime = formatCalendarLessonTime(lesson);
    const title = `${showStudent ? `${lesson.student_name ?? "Student"} · ` : ""}${displayTime}${lesson.status === "scheduled" ? "" : ` · ${statusLabel(lesson.status)}`}`;
    return {
      id: lesson.id,
      title,
      start: lesson.start_at,
      end: lesson.end_at,
      url: `${basePath}/${encodeURIComponent(lesson.id)}`,
      classNames: [`lesson-status-${lesson.status}`],
      extendedProps: { timezone: lesson.timezone, status: statusLabel(lesson.status) }
    };
  });
  return `<section class="calendar-shell" aria-label="${role === "ADMIN" ? "Admin lesson calendar" : "My lesson calendar"}"><div class="calendar-surface"><div id="calendar" class="calendar-host" data-calendar-role="${role}" data-calendar-timezone="${CALENDAR_TIMEZONE}" data-calendar-initial-date="${currentCalendarDate()}" data-calendar-events="${escapeHtml(JSON.stringify(events))}"></div></div></section>`;
}

function lessonRow(lesson: Lesson, basePath: string, showStudent: boolean): string {
  return `<tr><td data-label="${showStudent ? "Student" : "Lesson"}">${showStudent ? `<a href="/learn/admin/students/${encodeURIComponent(lesson.student_id)}">${escapeHtml(lesson.student_name ?? "Student")}</a>` : "Lesson"}</td><td data-label="Date and time"><a href="${basePath}/${encodeURIComponent(lesson.id)}">${escapeHtml(formatLessonTime(lesson))}</a></td><td data-label="Status"><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></td></tr>`;
}

function lessonTable(lessons: Lesson[], basePath: string, showStudent: boolean): string {
  if (!lessons.length) return `<p class="muted">No lessons yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr>${showStudent ? "<th>Student</th>" : "<th>Lesson</th>"}<th>Date and time</th><th>Status</th></tr></thead><tbody>${lessons.map((lesson) => lessonRow(lesson, basePath, showStudent)).join("")}</tbody></table></div>`;
}

function studentRows(students: Student[]): string {
  if (!students.length) return `<p class="muted">No students yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>${students.map((student) => `<tr><td data-label="Name"><a href="/learn/admin/students/${encodeURIComponent(student.id)}">${escapeHtml(student.name)}</a></td><td data-label="Email">${escapeHtml(student.email)}</td><td data-label="Status"><span class="status status-${student.status.toLowerCase()}">${student.status === "ACTIVE" ? "Active" : "Inactive"}</span></td><td data-label="Actions"><a href="/learn/admin/students/${encodeURIComponent(student.id)}/edit">Edit</a></td></tr>`).join("")}</tbody></table></div>`;
}

function hiddenCsrf(csrfToken: string): string {
  return `<input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}">`;
}

function inputField(label: string, name: string, value: string, type = "text", required = false): string {
  return `<label>${escapeHtml(label)}<input type="${type}" name="${name}" value="${escapeHtml(value)}"${required ? " required" : ""}></label>`;
}

function localStartParts(value: string, timezone: string): { date: string; time: string } {
  const local = value ? (value.includes("Z") ? isoToLocalDateTime(value, timezone) : value) : "";
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

function derivedEndLabel(startTime: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return "—";
  const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + STANDARD_LESSON_DURATION_MINUTES;
  const hour = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function studentForm(csrfToken: string, action: string, student?: Student, error?: string): string {
  return `<section class="card form-card"><p class="eyebrow">STUDENT RECORD</p><h1>${student ? "Edit student" : "Create student"}</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}${inputField("Name", "name", student?.name ?? "", "text", true)}${inputField("Login email", "email", student?.email ?? "", "email", true)}<p class="help">This email is used for contact and Learn login. It must belong to an active STUDENT Learn account.</p><button class="button" type="submit">Save student</button> <a class="button secondary" href="/learn/admin/students">Cancel</a></form></section>`;
}

function lessonForm(
  csrfToken: string,
  action: string,
  students: Student[],
  error?: string,
  lesson?: Lesson,
  selectedStudent?: string,
  selectedStart?: string,
  selectedEnd?: string,
  selectedTimezone?: string
): string {
  const studentId = lesson?.student_id ?? selectedStudent ?? "";
  const timezone = lesson?.timezone ?? selectedTimezone ?? "Europe/London";
  const start = lesson ? isoToLocalDateTime(lesson.start_at, timezone) : selectedStart ?? "";
  const end = lesson ? isoToLocalDateTime(lesson.end_at, timezone) : selectedEnd ?? "";
  const activeStudents = students.filter((student) => student.status === "ACTIVE");
  const studentSelect = `<label class="field-wide">Student<select name="studentId" required><option value="">Choose a student</option>${activeStudents.map((student) => `<option value="${escapeHtml(student.id)}"${student.id === studentId ? " selected" : ""}>${escapeHtml(student.name)} (${escapeHtml(student.email)})</option>`).join("")}</select></label>`;
  if (!lesson) {
    const selected = localStartParts(start, "Europe/London");
    const preview = derivedEndLabel(selected.time);
    return `<section class="card form-card"><p class="eyebrow">LESSON RECORD</p><h1>Create lesson</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form class="lesson-create-form" method="post" action="${action}" data-timezone="Europe/London" data-duration-minutes="${STANDARD_LESSON_DURATION_MINUTES}">${hiddenCsrf(csrfToken)}<div class="lesson-form-grid">${studentSelect}<label>Date<input type="date" name="lessonDate" value="${escapeHtml(selected.date)}" required></label><label>Start time<input type="time" name="startTime" value="${escapeHtml(selected.time)}" step="900" lang="en-GB" required aria-describedby="start-time-help"><span id="start-time-help" class="field-help">15-minute intervals · 24-hour time</span></label><div class="derived-time" aria-live="polite"><span>Duration / end time</span><strong>${STANDARD_LESSON_DURATION_MINUTES} minutes · Ends <output data-end-preview>${escapeHtml(preview)}</output></strong></div><div class="timezone-context"><span>Timezone</span><strong>Europe/London</strong></div><label class="field-wide">Lesson link<input type="url" name="externalUrl" value="" placeholder="https://"></label><details class="additional-details"><summary>Additional details</summary><label>Notes<textarea name="notes" rows="4" maxlength="10000"></textarea></label></details></div><input type="hidden" name="timezone" value="Europe/London"><input type="hidden" name="status" value="scheduled"><div class="form-actions"><a class="button secondary" href="/learn/admin/lessons">Cancel</a><button class="button" type="submit">Create lesson</button></div></form></section>`;
  }
  return `<section class="card form-card"><p class="eyebrow">LESSON RECORD</p><h1>Edit lesson</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}<div class="lesson-form-grid">${studentSelect}${inputField("Start", "startAt", start, "datetime-local", true)}${inputField("End", "endAt", end, "datetime-local", true)}${inputField("Timezone (IANA)", "timezone", timezone, "text", true)}${inputField("Lesson link", "externalUrl", lesson.external_url ?? "", "url")}<label class="field-wide">Notes<textarea name="notes" rows="4" maxlength="10000">${escapeHtml(lesson.notes)}</textarea></label></div><input type="hidden" name="status" value="${escapeHtml(lesson.status)}"><div class="form-actions"><button class="button" type="submit">Save lesson</button> <a class="button secondary" href="/learn/admin/lessons">Cancel</a></div></form></section>`;
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
  return appPage(user, csrfToken, "Admin dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Admin dashboard</h1><p class="lede">Manage students and lessons from one private workspace.</p><div class="quick-links"><a class="card" href="/learn/admin/calendar"><h2>Calendar</h2></a><a class="card" href="/learn/admin/students"><h2>Students</h2><p>View, create, edit and deactivate student records.</p></a><a class="card" href="/learn/admin/lessons"><h2>Lessons</h2><p>Create lessons, manage notes and update lifecycle status.</p></a></div>`);
}

async function handleAdmin(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const url = new URL(request.url);
  const csrfToken = active.csrfToken;
  if (route === "admin") return adminDashboard(active.user, csrfToken);
  if (route === "admin-calendar") {
    const lessons = await listLessons(db);
    return appPage(active.user, csrfToken, "Calendar", `<div class="calendar-page"><div class="page-heading"><div><p class="eyebrow">LESSON SCHEDULE</p><h1>Calendar</h1></div>${buttonLink("/learn/admin/lessons/new", "Add lesson")}</div>${calendarView(lessons, "ADMIN")}${calendarSubscriptionCard(csrfToken, "/learn/admin/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), undefined)}</div>`);
  }
  if (route === "admin-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const existingFeed = await findActiveCalendarFeedForOwner(db, active.user.id);
    const token = generateFeedToken();
    const now = new Date().toISOString();
    await rotateCalendarFeed(db, {
      id: crypto.randomUUID(),
      ownerUserId: active.user.id,
      studentId: null,
      tokenHash: await hashFeedToken(token),
      tokenLast4: feedTokenLast4(token),
      now
    });
    const lessons = await listLessons(db);
    return appPage(active.user, csrfToken, "Calendar", `<div class="calendar-page"><div class="page-heading"><div><p class="eyebrow">LESSON SCHEDULE</p><h1>Calendar</h1></div>${buttonLink("/learn/admin/lessons/new", "Add lesson")}</div>${calendarView(lessons, "ADMIN")}${calendarSubscriptionCard(csrfToken, "/learn/admin/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), calendarFeedUrl(request, env, token), existingFeed ? "Calendar link regenerated." : "Link generated.")}</div>`);
  }
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
    if (!name || !email) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, "Enter a valid name and login email."));
    const account = await findStudentAccount(db, email);
    if (!account) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, "The login email must belong to an active STUDENT Learn account."));
    if (await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    await insertStudent(db, { id: crypto.randomUUID(), name, email, learnUserId: account.id, now: new Date().toISOString() });
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
    if (!name || !email) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, "Enter a valid name and login email."));
    const account = await findStudentAccount(db, email);
    if (!account) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, "The login email must belong to an active STUDENT Learn account."));
    if (account.id !== student.learn_user_id && await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    await updateStudent(db, { id: student.id, name, email, learnUserId: account.id, now: new Date().toISOString() });
    return redirect(`/learn/admin/students/${encodeURIComponent(student.id)}`);
  }
  if (route === "admin-lessons") {
    return appPage(active.user, csrfToken, "Lessons", `<div class="page-heading"><div><p class="eyebrow">LESSON MANAGEMENT</p><h1>Lessons</h1></div>${buttonLink("/learn/admin/lessons/new", "Create lesson")}</div>${lessonTable(await listLessons(db), "/learn/admin/lessons", true)}`);
  }
  if (route === "admin-lesson-form") {
    const students = await listStudents(db);
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, undefined, undefined, url.searchParams.get("student") ?? undefined, url.searchParams.get("startAt") ?? undefined, url.searchParams.get("endAt") ?? undefined, url.searchParams.get("timezone") ?? undefined));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const lessonDate = formText(form, "lessonDate");
    const startTime = formText(form, "startTime");
    const startAt = lessonDate && startTime ? `${lessonDate}T${startTime}` : "";
    const startInstant = localDateTimeToIso(startAt, CALENDAR_TIMEZONE);
    const derivedEnd = startInstant.value ? deriveLessonEnd(startInstant.value) : null;
    const endAt = derivedEnd ? isoToLocalDateTime(derivedEnd, CALENDAR_TIMEZONE) : "";
    const fields = {
      studentId: formText(form, "studentId"),
      startAt,
      endAt,
      timezone: CALENDAR_TIMEZONE,
      status: formText(form, "status"),
      notes: formText(form, "notes"),
      externalUrl: formText(form, "externalUrl")
    };
    const startError = startTime && !isQuarterHourTime(startTime) ? "Choose a start time in 15-minute increments." : undefined;
    const validation = validateLessonInput(fields);
    if (startError || !validation.value || validation.value.status !== "scheduled") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, startError ?? validation.error ?? "New lessons must start as scheduled.", undefined, fields.studentId, startAt, undefined, CALENDAR_TIMEZONE));
    const student = await findStudent(db, validation.value.studentId);
    if (!student || student.status !== "ACTIVE") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, "Choose an active student.", undefined, fields.studentId, startAt, undefined, CALENDAR_TIMEZONE));
    if (await hasOverlappingLesson(db, validation.value.studentId, validation.value.startAt, validation.value.endAt)) return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, "This student already has a lesson overlapping this time.", undefined, fields.studentId, startAt, undefined, CALENDAR_TIMEZONE));
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
    if (await hasOverlappingLesson(db, validation.value.studentId, validation.value.startAt, validation.value.endAt, lesson.id)) return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "This student already has a lesson overlapping this time.", lesson));
    await updateLesson(db, { ...validation.value, id: lesson.id, now: new Date().toISOString() });
    return redirect(`/learn/admin/lessons/${encodeURIComponent(lesson.id)}`);
  }
  return messagePage("Not found", "That Learn route does not exist.", 404);
}

function studentDashboard(user: AppUser, csrfToken: string): Response {
  return appPage(user, csrfToken, "Student dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Student dashboard</h1><p class="lede">Your private lesson schedule is available here.</p><section class="card"><h2>Calendar</h2>${buttonLink("/learn/student/calendar", "View calendar")}</section>`);
}

async function handleStudent(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const csrfToken = active.csrfToken;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (route === "student" && pathname === "/learn/student") return studentDashboard(active.user, csrfToken);
  if (route === "student-calendar") {
    const lessons = await listLessonsForUser(db, active.user.id);
    return appPage(active.user, csrfToken, "My calendar", `<div class="calendar-page"><div class="page-heading"><div><p class="eyebrow">STUDENT SCHEDULE</p><h1>My calendar</h1></div></div>${calendarView(lessons, "STUDENT")}${calendarSubscriptionCard(csrfToken, "/learn/student/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), undefined)}</div>`);
  }
  if (route === "student-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const student = await findActiveStudentForUser(db, active.user.id);
    if (!student) return messagePage("Calendar unavailable", "Your Learn account is not linked to an active student record.", 409);
    const existingFeed = await findActiveCalendarFeedForOwner(db, active.user.id);
    const token = generateFeedToken();
    const now = new Date().toISOString();
    await rotateCalendarFeed(db, {
      id: crypto.randomUUID(),
      ownerUserId: active.user.id,
      studentId: student.id,
      tokenHash: await hashFeedToken(token),
      tokenLast4: feedTokenLast4(token),
      now
    });
    const lessons = await listLessonsForUser(db, active.user.id);
    return appPage(active.user, csrfToken, "My calendar", `<div class="calendar-page"><div class="page-heading"><div><p class="eyebrow">STUDENT SCHEDULE</p><h1>My calendar</h1></div></div>${calendarView(lessons, "STUDENT")}${calendarSubscriptionCard(csrfToken, "/learn/student/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), calendarFeedUrl(request, env, token), existingFeed ? "Calendar link regenerated." : "Link generated.")}</div>`);
  }
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

function feedDenial(): Response {
  const headers = privateHeaders("text/plain; charset=utf-8");
  return new Response("Calendar feed unavailable.", { status: 404, headers });
}

async function handleCalendarFeed(request: Request, env: Env, token: string): Promise<Response> {
  if (!env.DB || !isFeedToken(token)) return feedDenial();
  const feed = await findCalendarFeedByTokenHash(env.DB, await hashFeedToken(token));
  if (!feed || (request.method !== "GET" && request.method !== "HEAD")) return feedDenial();
  const range = feedRange();
  const lessons = feed.owner_role === "ADMIN"
    ? await listLessonsInRange(env.DB, range.startAt, range.endAt)
    : await listLessonsForUserInRange(env.DB, feed.owner_user_id, range.startAt, range.endAt);
  const body = generateIcs(lessons, feed.owner_role);
  const headers = privateHeaders("text/calendar; charset=utf-8");
  headers.set("Content-Disposition", 'inline; filename="foxtutor-learn.ics"');
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

async function learn(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = classifyLearnRoute(url.pathname);
  if (route === "asset") {
    const assetPath = url.pathname.slice("/learn/assets".length) || "/";
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
    const feedMatch = /^\/learn\/calendar\/feed\/([^/]+)$/.exec(url.pathname);
    if (feedMatch) return handleCalendarFeed(request, env, feedMatch[1]);
    if (url.pathname === "/learn" || url.pathname.startsWith("/learn/")) return learn(request, env);
    return env.ASSETS.fetch(request);
  }
};
