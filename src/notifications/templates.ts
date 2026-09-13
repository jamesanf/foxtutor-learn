import type { NotificationType } from "../domain/notifications";
import { learnLink } from "./links";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface LessonEmailData {
  studentName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  lessonPath: string;
  externalUrl?: string | null;
}

export interface ResourceEmailData {
  studentName: string;
  filename: string;
  lessonLabel?: string;
  resourcePath: string;
}

export interface ReportResourceData {
  filename: string;
  path: string;
}

export interface ReportEmailData extends LessonEmailData {
  summary: string;
  homework: string;
  additionalNotes: string;
  resources: ReportResourceData[];
}

function requireFields(data: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (typeof data[field] !== "string" || !(data[field] as string).trim()) throw new Error(`Missing notification template field: ${field}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function lineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function lessonDate(data: LessonEmailData): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: data.timezone
  }).format(new Date(data.startAt));
}

function lessonTime(data: LessonEmailData): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: data.timezone });
  return `${formatter.format(new Date(data.startAt))}–${formatter.format(new Date(data.endAt))}`;
}

function frame(title: string, text: string, body: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#172033"><main style="max-width:620px;margin:0 auto;padding:24px"><p style="color:#0e7490;font-weight:700">FoxTutor Learn</p><h1>${escapeHtml(title)}</h1>${body}<p style="margin-top:32px;color:#64748b;font-size:14px">${escapeHtml(text)}</p></main></body></html>`;
}

function lessonDetails(data: LessonEmailData, origin: string, includeStudent = false): { text: string; html: string } {
  const date = lessonDate(data);
  const time = lessonTime(data);
  const link = learnLink(origin, data.lessonPath);
  const join = data.externalUrl ? `\nLesson destination: ${data.externalUrl}` : "";
  const text = `${includeStudent ? `${data.studentName}\n\n` : ""}${date}\n${time} (${data.timezone})\nOpen lesson: ${link}${join}`;
  const html = `${includeStudent ? `<p>${escapeHtml(data.studentName)}</p>` : ""}<p><strong>${escapeHtml(date)}</strong><br>${escapeHtml(time)} (${escapeHtml(data.timezone)})</p><p><a href="${escapeHtml(link)}">Open lesson</a></p>${data.externalUrl ? `<p>Lesson destination: <a href="${escapeHtml(data.externalUrl)}">${escapeHtml(data.externalUrl)}</a></p>` : ""}`;
  return { text, html };
}

export function renderStudentInvitation(data: { studentName: string; origin: string }): EmailContent {
  const link = learnLink(data.origin, "/learn");
  return {
    subject: "Welcome to FoxTutor Learn",
    text: `Hello ${data.studentName},\n\nYour FoxTutor Learn access is ready.\n\nOpen FoxTutor Learn: ${link}\n\nUse your usual Google account to continue.`,
    html: frame("Welcome to FoxTutor Learn", "You received this because a Learn account was linked to your student record.", `<p>Hello ${escapeHtml(data.studentName)},</p><p>Your FoxTutor Learn access is ready.</p><p><a href="${escapeHtml(link)}">Open FoxTutor Learn</a></p><p>Use your usual Google account to continue.</p>`)
  };
}

export function renderLessonCreated(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin, true);
  return {
    subject: `Lesson booked — ${lessonDate(data)}`,
    text: `Your lesson is booked.\n\n${details.text}`,
    html: frame("Lesson booked", "FoxTutor Learn", `<p>Your lesson is booked.</p>${details.html}`)
  };
}

export function renderLessonChanged(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin, true);
  return {
    subject: `Lesson updated — ${lessonDate(data)}`,
    text: `Your lesson details have changed.\n\n${details.text}`,
    html: frame("Lesson updated", "FoxTutor Learn", `<p>Your lesson details have changed.</p>${details.html}`)
  };
}

export function renderLessonReminder(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  return {
    subject: `Lesson reminder — ${lessonTime(data)}`,
    text: `Your lesson is tomorrow.\n\n${details.text}`,
    html: frame("Lesson reminder", "FoxTutor Learn", `<p>Your lesson is tomorrow.</p>${details.html}`)
  };
}

export function renderResourceAdded(data: ResourceEmailData, origin: string): EmailContent {
  const resourceLink = learnLink(origin, data.resourcePath);
  const context = data.lessonLabel ? `\nLesson: ${data.lessonLabel}` : "";
  return {
    subject: "New resource for your lesson",
    text: `Hello ${data.studentName},\n\nA new resource is available: ${data.filename}${context}\n\nOpen resource: ${resourceLink}`,
    html: frame("New lesson resource", "FoxTutor Learn", `<p>Hello ${escapeHtml(data.studentName)},</p><p><strong>${escapeHtml(data.filename)}</strong>${data.lessonLabel ? `<br>Lesson: ${escapeHtml(data.lessonLabel)}` : ""}</p><p><a href="${escapeHtml(resourceLink)}">Open resource</a></p>`)
  };
}

export function renderCancellationProcessed(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  return {
    subject: `Lesson cancelled — ${lessonDate(data)}`,
    text: `Your lesson has been cancelled.\n\n${details.text}`,
    html: frame("Lesson cancelled", "FoxTutor Learn", `<p>Your lesson has been cancelled.</p>${details.html}`)
  };
}

export function renderLessonReport(data: ReportEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  const resourcesText = data.resources.length ? `\n\nResources:\n${data.resources.map((resource) => `- ${resource.filename}: ${learnLink(origin, resource.path)}`).join("\n")}` : "";
  const resourcesHtml = data.resources.length
    ? `<h2>Resources</h2><ul>${data.resources.map((resource) => `<li><a href="${escapeHtml(learnLink(origin, resource.path))}">${escapeHtml(resource.filename)}</a></li>`).join("")}</ul>`
    : "";
  const optionalText = data.homework ? `\n\nHomework / follow-up:\n${data.homework}` : "";
  const optionalHtml = data.homework ? `<h2>Homework / follow-up</h2><p>${lineBreaks(data.homework)}</p>` : "";
  const notesText = data.additionalNotes ? `\n\nAdditional notes:\n${data.additionalNotes}` : "";
  const notesHtml = data.additionalNotes ? `<h2>Additional notes</h2><p>${lineBreaks(data.additionalNotes)}</p>` : "";
  return {
    subject: `Your lesson report — ${lessonDate(data)}`,
    text: `Hello ${data.studentName},\n\nLesson report\n${details.text}\n\nSummary:\n${data.summary}${optionalText}${notesText}${resourcesText}`,
    html: frame("Lesson report", "FoxTutor Learn", `<p>Hello ${escapeHtml(data.studentName)},</p><p><strong>${escapeHtml(lessonDate(data))}</strong><br>${escapeHtml(lessonTime(data))} (${escapeHtml(data.timezone)})</p><h2>Summary</h2><p>${lineBreaks(data.summary)}</p>${optionalHtml}${notesHtml}${resourcesHtml}<p><a href="${escapeHtml(learnLink(origin, data.lessonPath))}">Open lesson</a></p>`)
  };
}

export function renderEmail(type: NotificationType, data: Record<string, unknown>, origin: string): EmailContent {
  if (type === "STUDENT_INVITED") {
    requireFields(data, ["studentName", "origin"]);
    return renderStudentInvitation(data as unknown as { studentName: string; origin: string });
  }
  if (type === "LESSON_CREATED" || type === "LESSON_CHANGED" || type === "LESSON_REMINDER" || type === "CANCELLATION_PROCESSED" || type === "CANCELLATION_REQUESTED") {
    requireFields(data, ["studentName", "startAt", "endAt", "timezone", "lessonPath"]);
  }
  if (type === "LESSON_CREATED") return renderLessonCreated(data as unknown as LessonEmailData, origin);
  if (type === "LESSON_CHANGED") return renderLessonChanged(data as unknown as LessonEmailData, origin);
  if (type === "LESSON_REMINDER") return renderLessonReminder(data as unknown as LessonEmailData, origin);
  if (type === "RESOURCE_ADDED") {
    requireFields(data, ["studentName", "filename", "resourcePath"]);
    return renderResourceAdded(data as unknown as ResourceEmailData, origin);
  }
  if (type === "CANCELLATION_PROCESSED" || type === "CANCELLATION_REQUESTED") return renderCancellationProcessed(data as unknown as LessonEmailData, origin);
  requireFields(data, ["studentName", "startAt", "endAt", "timezone", "lessonPath", "summary"]);
  return renderLessonReport(data as unknown as ReportEmailData, origin);
}
