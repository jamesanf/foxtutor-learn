import type { NotificationType } from "../domain/notifications";
import type { ClockChangeDirection } from "../domain/dst";
import { learnLink } from "./links";
import { renderRichTextHtml, richTextToPlainText } from "../reports/rich-text";

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
  pupilName: string;
  level: string;
  reportPath: string;
  thisLessonsFocus: string;
  nextLessonsFocus: string;
  homeLearningTask: string;
  notes: string;
  evenBetterIf: string;
  resources: ReportResourceData[];
}

export interface DstWarningEmailData {
  studentName: string;
  changeDate: string;
  direction: ClockChangeDirection;
}

function requireFields(data: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (typeof data[field] !== "string" || !(data[field] as string).trim()) throw new Error(`Missing notification template field: ${field}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
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
  const note = text === "FoxTutor Learn" ? "" : `<div style="margin-bottom:6px">${escapeHtml(text)}</div>`;
  return `<div style="margin:0;padding:28px 12px;background:#f1f7f8;font-family:Arial,Helvetica,sans-serif;color:#172033;line-height:1.5"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d8e5e8;border-radius:12px;overflow:hidden"><div style="padding:20px 28px;background:#0e7490;color:#ffffff"><div style="font-size:20px;font-weight:700;letter-spacing:.02em">FoxTutor</div><div style="font-size:13px;margin-top:2px;color:#d8f3f7">Learn</div></div><div style="padding:32px 30px"><h1 style="margin:0 0 26px;color:#155e75;font-size:27px;line-height:1.2">${escapeHtml(title)}</h1>${body}</div><div style="padding:18px 30px;border-top:1px solid #e2edf0;color:#64748b;font-size:12px">${note}© 2026 Fox Learning Ltd. All rights reserved.</div></div></div>`;
}

function emailRichText(value: string): string {
  return renderRichTextHtml(value)
    .replace(/<p>/g, '<p style="margin:0 0 8px">')
    .replace(/<ul>/g, '<ul style="margin:0 0 8px;padding-left:20px">')
    .replace(/<ol>/g, '<ol style="margin:0 0 8px;padding-left:20px">')
    .replace(/<mark class="report-highlight">/g, '<mark style="background:#fef08a;padding:1px 3px">');
}

function emailField(label: string, value: string): string {
  return `<div style="margin:0 0 12px;padding:16px 18px;background:#f7fbfc;border:1px solid #dcebed;border-radius:8px"><div style="margin:0 0 8px;color:#0e7490;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(label)}</div><div style="font-size:15px">${emailRichText(value)}</div></div>`;
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
  const date = lessonDate(data);
  const time = lessonTime(data);
  const resourcesText = data.resources.length ? `\n\nResources:\n${data.resources.map((resource) => `- ${resource.filename}: ${learnLink(origin, resource.path)}`).join("\n")}` : "";
  const resourcesHtml = data.resources.length
    ? `<div style="margin:20px 0 0;padding:16px 18px;background:#f7fbfc;border:1px solid #dcebed;border-radius:8px"><div style="margin:0 0 8px;color:#0e7490;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Resources</div><ul style="margin:0;padding-left:20px">${data.resources.map((resource) => `<li style="margin:0 0 5px"><a href="${escapeHtml(learnLink(origin, resource.path))}" style="color:#0e7490;font-weight:700">${escapeHtml(resource.filename)}</a></li>`).join("")}</ul></div>`
    : "";
  const fields: Array<[string, string]> = [
    ["This Lesson's Focus", data.thisLessonsFocus],
    ["Next Lesson's Focus", data.nextLessonsFocus],
    ["Home Learning Task", data.homeLearningTask],
    ["Notes", data.notes],
    ["Even Better If", data.evenBetterIf]
  ].filter((field): field is [string, string] => Boolean(field[1].trim()));
  const textFields = fields.map(([label, value]) => `\n\n${label}:\n${richTextToPlainText(value)}`).join("");
  const htmlFields = fields.map(([label, value]) => emailField(label, value)).join("");
  const reportLink = learnLink(origin, data.reportPath);
  const detailTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #dcebed;background:#f7fbfc;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden"><tr><td width="34%" style="padding:18px 16px;vertical-align:top;border-right:1px solid #dcebed"><div style="margin:0 0 7px;color:#0e7490;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Lesson date</div><strong style="font-size:15px">${escapeHtml(date)}</strong></td><td width="33%" style="padding:18px 16px;vertical-align:top;border-right:1px solid #dcebed"><div style="margin:0 0 7px;color:#0e7490;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Time</div><strong style="font-size:15px">${escapeHtml(time)}</strong><br><span style="font-size:12px;color:#64748b">${escapeHtml(data.timezone)}</span></td><td width="33%" style="padding:18px 16px;vertical-align:top"><div style="margin:0 0 7px;color:#0e7490;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Level</div><strong style="font-size:15px">${escapeHtml(data.level)}</strong></td></tr></table>`;
  return {
    subject: `Your lesson report — ${date}`,
    text: `Hello ${data.studentName},\n\nLesson report\nLevel: ${data.level}\nLesson date/time: ${date}\n${time} (${data.timezone})${textFields}${resourcesText}\n\nView this report on FoxTutor Learn: ${reportLink}\n\nQuestions? Email james@foxtutor.org`,
    html: frame("Lesson report", "Questions? Email james@foxtutor.org", `<p style="margin:0 0 24px">Hello ${escapeHtml(data.studentName)},</p>${detailTable}<div style="margin:0 0 12px;color:#155e75;font-size:16px;font-weight:700">Tutorial feedback</div>${htmlFields}${resourcesHtml}<p style="margin:28px 0 0;font-size:14px">View this report on <a href="${escapeHtml(reportLink)}" style="color:#0e7490;font-weight:700">FoxTutor Learn</a>.</p>`)
  };
}

export function renderDstWarning(data: DstWarningEmailData): EmailContent {
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  }).format(new Date(`${data.changeDate}T12:00:00Z`));
  const movement = data.direction === "forward" ? "forward" : "backward";
  return {
    subject: "UK clocks changed — check your lesson time",
    text: `Hello ${data.studentName},\n\nThe UK clocks moved ${movement} today (${date}). All FoxTutor lessons are scheduled in UK time. Please check the time difference yourself so you join at the correct local time.\n\nThis is a reminder only; no lesson time has been changed.`,
    html: frame("UK clock-change reminder", "FoxTutor Learn", `<p>Hello ${escapeHtml(data.studentName)},</p><p>The UK clocks moved <strong>${movement}</strong> today (${escapeHtml(date)}).</p><p>All FoxTutor lessons are scheduled in UK time. Please check the time difference yourself so you join at the correct local time.</p><p>This is a reminder only; no lesson time has been changed.</p>`)
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
  if (type === "DST_WARNING") {
    requireFields(data, ["studentName", "changeDate", "direction"]);
    if (data.direction !== "forward" && data.direction !== "backward") throw new Error("Invalid DST warning direction");
    return renderDstWarning(data as unknown as DstWarningEmailData);
  }
  requireFields(data, ["studentName", "startAt", "endAt", "timezone", "lessonPath", "pupilName", "level", "reportPath", "thisLessonsFocus"]);
  return renderLessonReport(data as unknown as ReportEmailData, origin);
}
