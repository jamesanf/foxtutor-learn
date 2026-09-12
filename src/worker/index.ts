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
  calendarDateLabel,
  calendarPeriod,
  calendarPeriodLabel,
  lessonCalendarDate,
  nextCalendarWeek,
  previousCalendarWeek,
  type CalendarPeriod
} from "../domain/calendar";
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
  role: Role
): string {
  const generated = feedUrl
    ? `<label class="feed-link-label" for="feed-link">Private calendar link</label><div class="feed-link-row"><input id="feed-link" class="feed-link" readonly value="${escapeHtml(feedUrl)}"><button class="button secondary copy-link" type="button" data-copy-target="feed-link">Copy</button></div>`
    : "";
  const actionLabel = feed ? "Regenerate private calendar link" : "Generate private calendar link";
  const calendarDescription = role === "ADMIN"
    ? "Keep your teaching calendar up to date in another app."
    : "Keep your lessons up to date in another app.";
  return `<details class="card subscription-card"${feedUrl ? " open" : ""}><summary><span class="subscription-summary"><strong>Subscribe to this calendar</strong><span>${calendarDescription}</span></span><span class="subscription-chevron" aria-hidden="true"></span></summary><div class="subscription-content"><p class="subscription-intro">Subscribe to this read-only calendar in Apple Calendar, Google Calendar or another app that supports iCalendar.</p><section class="subscription-block"><h3>Private link</h3>${generated || `<p class="muted">Generate a private link to connect this calendar to another app.</p>`}</section><div class="privacy-warning" role="note"><strong>Keep this link private</strong><span>Anyone with the link may be able to view the calendar available through it. Do not post it publicly or share it with anyone you do not trust.</span></div>${feed ? `<p class="feed-state"><strong>Private link active.</strong> Last rotated ${escapeHtml(feed.last_rotated_at)}.</p>` : ""}<form method="post" action="${action}" data-confirm="${feed ? "Your current calendar subscription link will stop working. Any calendar subscribed to the old link will need to be updated with the new link." : ""}">${hiddenCsrf(csrfToken)}<button class="button${feed ? " secondary" : ""}" type="submit">${actionLabel}</button></form><section class="subscription-block"><h3>Use with</h3><ul class="subscription-apps"><li><strong>Apple Calendar:</strong> choose New Calendar Subscription and paste the link.</li><li><strong>Google Calendar:</strong> choose Other calendars, Add other calendars, then From URL.</li><li>Other apps that support iCalendar subscriptions can use the same link.</li></ul></section></div></details>`;
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

function calendarQuery(periodDate: string): string {
  return `?week=${encodeURIComponent(periodDate)}`;
}

function calendarLessonCard(lesson: Lesson, basePath: string, showStudent: boolean): string {
  const student = showStudent ? `<strong>${escapeHtml(lesson.student_name ?? "Student")}</strong>` : "";
  const label = `${showStudent ? `${lesson.student_name ?? "Student"}, ` : ""}${formatCalendarLessonTime(lesson)}, ${statusLabel(lesson.status)}`;
  return `<a class="calendar-lesson status-${lesson.status}" href="${basePath}/${encodeURIComponent(lesson.id)}" aria-label="${escapeHtml(label)}">${student}<span>${escapeHtml(formatCalendarLessonTime(lesson))}</span><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></a>`;
}

function calendarView(
  period: CalendarPeriod,
  lessons: Lesson[],
  role: Role
): string {
  const basePath = role === "ADMIN" ? "/learn/admin/lessons" : "/learn/student/lessons";
  const showStudent = role === "ADMIN";
  const lessonGroups = new Map<string, Lesson[]>();
  for (const date of period.dates) lessonGroups.set(date, []);
  for (const lesson of lessons) {
    const date = lessonCalendarDate(lesson.start_at, period.timezone);
    lessonGroups.get(date)?.push(lesson);
  }
  const days = period.dates.map((date) => {
    const dayLessons = lessonGroups.get(date) ?? [];
    const createLink = role === "ADMIN"
      ? `<a class="calendar-add" href="/learn/admin/lessons/new?date=${encodeURIComponent(date)}&startAt=${encodeURIComponent(`${date}T09:00`)}&endAt=${encodeURIComponent(`${date}T10:00`)}&timezone=${encodeURIComponent(period.timezone)}">Add lesson</a>`
      : "";
    return `<section class="calendar-day" aria-labelledby="calendar-day-${date}"><div class="calendar-day-heading"><h2 id="calendar-day-${date}">${escapeHtml(calendarDateLabel(date, period.timezone))}</h2>${createLink}</div><div class="calendar-lessons">${dayLessons.length ? dayLessons.map((lesson) => calendarLessonCard(lesson, basePath, showStudent)).join("") : `<p class="calendar-empty">No lessons</p>`}</div></section>`;
  }).join("");
  const previous = calendarQuery(previousCalendarWeek(period));
  const next = calendarQuery(nextCalendarWeek(period));
  const today = calendarQuery(calendarPeriod(null, period.timezone).startDate);
  return `<section class="calendar-shell" aria-label="${role === "ADMIN" ? "Admin lesson calendar" : "My lesson calendar"}"><div class="calendar-toolbar"><div class="calendar-navigation" aria-label="Calendar navigation"><a class="button secondary" href="${previous}">Previous</a><a class="button secondary" href="${today}">Today</a><a class="button secondary" href="${next}">Next</a></div><p class="calendar-period" aria-live="polite">${escapeHtml(calendarPeriodLabel(period))}</p></div><p class="calendar-help">Week shown in ${escapeHtml(period.timezone)}. Each lesson time is displayed in its stored lesson timezone. Status is shown by text and badge.</p><div class="calendar-week">${days}</div></section>`;
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

function studentForm(csrfToken: string, action: string, student?: Student, error?: string): string {
  return `<section class="card form-card"><p class="eyebrow">STUDENT RECORD</p><h1>${student ? "Edit student" : "Create student"}</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}${inputField("Name", "name", student?.name ?? "", "text", true)}${inputField("Contact email", "email", student?.email ?? "", "email", true)}${inputField("Learn account email (optional explicit link)", "learnAccountEmail", student?.learn_user_email ?? "", "email")}<p class="help">Only an active STUDENT Learn account can be linked. Matching contact email alone never grants access.</p><button class="button" type="submit">Save student</button> <a class="button secondary" href="/learn/admin/students">Cancel</a></form></section>`;
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
  return appPage(user, csrfToken, "Admin dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Admin dashboard</h1><p class="lede">Manage students and lessons from one private workspace.</p><div class="quick-links"><a class="card" href="/learn/admin/calendar"><h2>Calendar</h2><p>See the current tutoring week, open lessons and create a lesson from a day.</p></a><a class="card" href="/learn/admin/students"><h2>Students</h2><p>View, create, edit and deactivate student records.</p></a><a class="card" href="/learn/admin/lessons"><h2>Lessons</h2><p>Create lessons, manage notes and update lifecycle status.</p></a></div>`);
}

async function handleAdmin(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const url = new URL(request.url);
  const csrfToken = active.csrfToken;
  if (route === "admin") return adminDashboard(active.user, csrfToken);
  if (route === "admin-calendar") {
    const period = calendarPeriod(url.searchParams.get("week"));
    const lessons = await listLessonsInRange(db, period.startAt, period.endAt);
    return appPage(active.user, csrfToken, "Calendar", `<div class="page-heading"><div><p class="eyebrow">LESSON SCHEDULE</p><h1>Calendar</h1><p class="lede">Plan the tutoring week from the existing lesson records.</p></div>${buttonLink(`/learn/admin/lessons/new?date=${encodeURIComponent(period.startDate)}&startAt=${encodeURIComponent(`${period.startDate}T09:00`)}&endAt=${encodeURIComponent(`${period.startDate}T10:00`)}&timezone=${encodeURIComponent(period.timezone)}`, "Create lesson")}</div>${calendarView(period, lessons, "ADMIN")}${calendarSubscriptionCard(csrfToken, "/learn/admin/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), undefined, "ADMIN")}`);
  }
  if (route === "admin-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
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
    const period = calendarPeriod(url.searchParams.get("week"));
    const lessons = await listLessonsInRange(db, period.startAt, period.endAt);
    return appPage(active.user, csrfToken, "Calendar", `<div class="page-heading"><div><p class="eyebrow">LESSON SCHEDULE</p><h1>Calendar</h1><p class="lede">Plan the tutoring week from the existing lesson records.</p></div>${buttonLink(`/learn/admin/lessons/new?date=${encodeURIComponent(period.startDate)}&startAt=${encodeURIComponent(`${period.startDate}T09:00`)}&endAt=${encodeURIComponent(`${period.startDate}T10:00`)}&timezone=${encodeURIComponent(period.timezone)}`, "Create lesson")}</div>${calendarView(period, lessons, "ADMIN")}${calendarSubscriptionCard(csrfToken, "/learn/admin/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), calendarFeedUrl(request, env, token), "ADMIN")}`);
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
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create lesson", lessonForm(csrfToken, "/learn/admin/lessons/new", students, undefined, undefined, url.searchParams.get("student") ?? undefined, url.searchParams.get("startAt") ?? undefined, url.searchParams.get("endAt") ?? undefined, url.searchParams.get("timezone") ?? undefined));
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
  return appPage(user, csrfToken, "Student dashboard", `<p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>Student dashboard</h1><p class="lede">Your private lesson schedule is available here.</p><section class="card"><h2>Calendar</h2><p>View your lessons by week and open a lesson for its details.</p>${buttonLink("/learn/student/calendar", "View calendar")}</section>`);
}

async function handleStudent(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const csrfToken = active.csrfToken;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (route === "student" && pathname === "/learn/student") return studentDashboard(active.user, csrfToken);
  if (route === "student-calendar") {
    const period = calendarPeriod(new URL(request.url).searchParams.get("week"));
    const lessons = await listLessonsForUserInRange(db, active.user.id, period.startAt, period.endAt);
    return appPage(active.user, csrfToken, "My calendar", `<div class="page-heading"><div><p class="eyebrow">STUDENT SCHEDULE</p><h1>My calendar</h1><p class="lede">Only lessons linked to your Learn account are shown.</p></div></div>${calendarView(period, lessons, "STUDENT")}${calendarSubscriptionCard(csrfToken, "/learn/student/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), undefined, "STUDENT")}`);
  }
  if (route === "student-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const student = await findActiveStudentForUser(db, active.user.id);
    if (!student) return messagePage("Calendar unavailable", "Your Learn account is not linked to an active student record.", 409);
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
    const period = calendarPeriod(url.searchParams.get("week"));
    const lessons = await listLessonsForUserInRange(db, active.user.id, period.startAt, period.endAt);
    return appPage(active.user, csrfToken, "My calendar", `<div class="page-heading"><div><p class="eyebrow">STUDENT SCHEDULE</p><h1>My calendar</h1><p class="lede">Only lessons linked to your Learn account are shown.</p></div></div>${calendarView(period, lessons, "STUDENT")}${calendarSubscriptionCard(csrfToken, "/learn/student/calendar/feed", await findActiveCalendarFeedForOwner(db, active.user.id), calendarFeedUrl(request, env, token), "STUDENT")}`);
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
