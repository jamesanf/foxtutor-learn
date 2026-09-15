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
  reminderLeadMinutes?: number;
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

export interface CancellationDecisionEmailData extends LessonEmailData {
  decision?: "approved" | "rejected";
}

export interface CancellationProcessedEmailData extends LessonEmailData {
  undoPath?: string;
  billingOutcome?: "NOT_INVOICED" | "CANCELLATION_PENDING_PROVIDER" | "PAYMENT_IN_TRANSIT" | "PAYMENT_FAILED" | "CREDIT_GRANTED" | "CREDIT_RESTORED" | "RECONCILIATION_REQUIRED";
  billingAmountMinor?: number | string;
  billingInvoiceReference?: string | null;
  billingSourceLessonDate?: string | null;
}

export interface DirectDebitEmailData {
  studentName: string;
  status: "setup" | "pending";
}

export interface CreditCoveredStatementEmailData {
  studentName: string;
  invoiceReference: string;
  lessonDate: string;
  amountMinor: number | string;
  sources: Array<{ invoiceReference: string | null; lessonDate: string | null; amountMinor: number | string }>;
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

export function frame(title: string, text: string, body: string, headerLabel = title || "Learn"): string {
  const note = text === "FoxTutor Learn" ? "" : `<div style="margin-bottom:6px">${escapeHtml(text)}</div>`;
  const year = new Date().getFullYear();
  return `<div style="margin:0;padding:28px 12px;background:#f1f7f8;font-family:Arial,Helvetica,sans-serif;color:#172033;line-height:1.5"><div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d8e5e8;border-radius:12px;overflow:hidden"><div style="padding:20px 32px;background:#0e7490;color:#ffffff"><div style="font-size:21px;font-weight:700;letter-spacing:.02em">FoxTutor</div><div style="font-size:14px;margin-top:3px;color:#d8f3f7">${escapeHtml(headerLabel)}</div></div><div style="padding:36px 38px">${title ? `<h1 style="margin:0 0 28px;color:#155e75;font-size:27px;line-height:1.2">${escapeHtml(title)}</h1>` : ""}${body}</div><div style="padding:18px 38px;border-top:1px solid #e2edf0;color:#64748b;font-size:12px">${note}© ${year} Fox Learning Ltd. All rights reserved.</div></div></div>`;
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
  const text = `${includeStudent ? `${data.studentName}\n\n` : ""}${date}\n${time}\nOpen lesson: ${link}${join}`;
  const html = `${includeStudent ? `<p>${escapeHtml(data.studentName)}</p>` : ""}<p><strong>${escapeHtml(date)}</strong><br>${escapeHtml(time)}</p><p><a href="${escapeHtml(link)}">Open lesson</a></p>${data.externalUrl ? `<p>Lesson destination: <a href="${escapeHtml(data.externalUrl)}">${escapeHtml(data.externalUrl)}</a></p>` : ""}`;
  return { text, html };
}

export function renderStudentInvitation(data: { studentName: string; origin: string }): EmailContent {
  const link = learnLink(data.origin, "/learn");
  return {
    subject: "Welcome to FoxTutor Learn",
    text: `Hello ${data.studentName},\n\nYour FoxTutor Learn access is ready.\n\nOpen FoxTutor Learn: ${link}\n\nUse your usual Google account to continue.\n\nYour billing administrator will send a separate secure Direct Debit request through FreeAgent shortly. Look out for an email from Fox Tutor Billing (billing@foxtutor.org); it will contain a secure GoCardless link. Never send bank details by email or enter them into FoxTutor Learn.`,
    html: frame("Welcome to FoxTutor Learn", "You received this because a Learn account was linked to your student record.", `<p>Hello ${escapeHtml(data.studentName)},</p><p>Your FoxTutor Learn access is ready.</p><p><a href="${escapeHtml(link)}">Open FoxTutor Learn</a></p><p>Use your usual Google account to continue.</p><p>Your billing administrator will send a separate secure Direct Debit request through FreeAgent shortly. Look out for an email from Fox Tutor Billing (billing@foxtutor.org); it will contain a secure GoCardless link.</p><p>Never send bank details by email or enter them into FoxTutor Learn.</p>`)
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
  const lead = data.reminderLeadMinutes === 15 ? "Your lesson starts soon." : "Your lesson is coming up.";
  return {
    subject: `Lesson starting soon — ${lessonTime(data)}`,
    text: `${lead}\n\n${details.text}`,
    html: frame("Lesson starting soon", "FoxTutor Learn", `<p>${lead}</p>${details.html}`)
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

export function renderCancellationProcessed(data: CancellationProcessedEmailData, origin: string): EmailContent {
  const date = lessonDate(data);
  const time = lessonTime(data);
  const undoLink = "undoPath" in data && typeof data.undoPath === "string" ? learnLink(origin, data.undoPath) : null;
  const reference = data.billingInvoiceReference ? ` (${data.billingInvoiceReference})` : "";
  const amount = data.billingAmountMinor === undefined ? "" : ` £${(Number(data.billingAmountMinor) / 100).toFixed(2)}`;
  const sourceLesson = data.billingSourceLessonDate
    ? ` originally paid for the lesson on ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: data.timezone }).format(new Date(`${data.billingSourceLessonDate}T12:00:00Z`))}`
    : "";
  const billingText = data.billingOutcome === "NOT_INVOICED"
    ? "This lesson was cancelled before invoicing. No payment will be taken."
    : data.billingOutcome === "CANCELLATION_PENDING_PROVIDER"
      ? "This lesson was cancelled before collection. FoxTutor will not initiate a Direct Debit collection for it, and no payment has been taken."
      : data.billingOutcome === "CREDIT_GRANTED"
        ? `Payment was confirmed and${amount} has been retained as credit from invoice${reference} for a future booking.`
        : data.billingOutcome === "CREDIT_RESTORED"
          ? `The lesson was cancelled and${amount} of credit from invoice${reference}${sourceLesson} has been restored to the account for a future booking.`
        : data.billingOutcome === "PAYMENT_IN_TRANSIT"
          ? `A payment is still in transit${reference}. The account credit will remain subject to provider confirmation.`
          : data.billingOutcome === "PAYMENT_FAILED"
            ? `The payment attempt${reference} did not complete. No credit has been created for this cancelled lesson. No action is needed from you.`
          : data.billingOutcome === "RECONCILIATION_REQUIRED"
            ? "The cancellation was recorded, but the payment provider state is being reconciled. FoxTutor will send a separate financial update once confirmed."
            : "";
  const text = `Your lesson has been cancelled.\n\n${date}\n${time}${billingText ? `\n\n${billingText}` : ""}${undoLink ? `\n\nWas this a mistake? Undo the cancellation: ${undoLink}` : ""}`;
  const html = `<p>Your lesson has been cancelled.</p><p><strong>${escapeHtml(date)}</strong><br>${escapeHtml(time)}</p>${billingText ? `<p>${escapeHtml(billingText)}</p>` : ""}${undoLink ? `<p>Was this a mistake? <a href="${escapeHtml(undoLink)}">Undo the cancellation</a>.</p>` : ""}`;
  return {
    subject: `Lesson cancelled — ${date}`,
    text,
    html: frame("", "FoxTutor Learn", html)
  };
}

export function renderCancellationRequested(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  return {
    subject: `Cancellation request received — ${lessonDate(data)}`,
    text: `Your cancellation request has been sent for review.\n\n${details.text}`,
    html: frame("Cancellation request received", "FoxTutor Learn", `<p>Your cancellation request has been sent for review.</p>${details.html}`)
  };
}

export function renderCancellationDecision(data: CancellationDecisionEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  const approved = data.decision === "approved";
  return {
    subject: `${approved ? "Cancellation approved" : "Cancellation request declined"} — ${lessonDate(data)}`,
    text: `${approved ? "Your cancellation request was approved." : "Your cancellation request was not approved."}\n\n${details.text}`,
    html: frame(approved ? "Cancellation approved" : "Cancellation request declined", "FoxTutor Learn", `<p>${approved ? "Your cancellation request was approved." : "Your cancellation request was not approved."}</p>${details.html}`)
  };
}

export function renderLessonRescheduled(data: LessonEmailData, origin: string): EmailContent {
  const details = lessonDetails(data, origin);
  return {
    subject: `Lesson rescheduled — ${lessonDate(data)}`,
    text: `Your lesson has been rescheduled.\n\n${details.text}`,
    html: frame("Lesson rescheduled", "FoxTutor Learn", `<p>Your lesson has been rescheduled.</p>${details.html}`)
  };
}

export function renderLessonReport(data: ReportEmailData, origin: string): EmailContent {
  const date = lessonDate(data);
  const time = lessonTime(data);
  const resourcesText = data.resources.length ? `\n\nResources:\n${data.resources.map((resource) => `- ${resource.filename}: ${learnLink(origin, resource.path)}`).join("\n")}` : "";
  const resourcesHtml = data.resources.length
    ? `<div style="margin:24px 0 0;padding:20px 22px;background:#f7fbfc;border:1px solid #dcebed;border-radius:8px"><div style="margin:0 0 10px;color:#0e7490;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Resources</div><ul style="margin:0;padding-left:22px">${data.resources.map((resource) => `<li style="margin:0 0 7px"><a href="${escapeHtml(learnLink(origin, resource.path))}" style="color:#0e7490;font-weight:700">${escapeHtml(resource.filename)}</a></li>`).join("")}</ul></div>`
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
    text: `Lesson report\nLevel: ${data.level}\nLesson date/time: ${date}\n${time} (${data.timezone})${textFields}${resourcesText}\n\nIf you have any questions, please get in touch at james@foxtutor.org.\n\nView this report on FoxTutor Learn: ${reportLink}`,
    html: frame("", "FoxTutor Learn", `${detailTable}<div style="margin:0 0 14px;color:#155e75;font-size:16px;font-weight:700">Tutorial feedback</div>${htmlFields}${resourcesHtml}<p style="margin:28px 0 0;font-size:14px">If you have any questions, please get in touch at <a href="mailto:james@foxtutor.org" style="color:#0e7490;font-weight:700">james@foxtutor.org</a>.</p><p style="margin:18px 0 0;font-size:14px">View this report on <a href="${escapeHtml(reportLink)}" style="color:#0e7490;font-weight:700">FoxTutor Learn</a>.</p>`, "Lesson Report")
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

export function renderDirectDebitStatus(data: DirectDebitEmailData): EmailContent {
  const pending = data.status === "pending";
  const title = pending ? "Direct Debit authorisation pending" : "Direct Debit setup required";
  const text = pending
    ? `Hello ${data.studentName},\n\nYour Direct Debit authorisation is being completed. Use the secure provider authorisation request you received; do not send bank details by email or enter them into FoxTutor Learn.\n\nThe provider may take a few working days to confirm the authorisation. FoxTutor will stop sending setup reminders once Direct Debit is active.`
    : `Hello ${data.studentName},\n\nDirect Debit setup is required before automatic FoxTutor billing can begin. Your billing administrator will start the secure provider setup when required. Bank details must be entered only through the provider's secure flow; do not send them by email or enter them into FoxTutor Learn.`;
  const body = pending
    ? `<p>Hello ${escapeHtml(data.studentName)},</p><p>Your Direct Debit authorisation is being completed.</p><p>Use the secure provider authorisation request you received. The provider may take a few working days to confirm the authorisation.</p><p>Do not send bank details by email or enter them into FoxTutor Learn.</p>`
    : `<p>Hello ${escapeHtml(data.studentName)},</p><p>Direct Debit setup is required before automatic FoxTutor billing can begin.</p><p>Your billing administrator will start the secure provider setup when required.</p><p>Bank details must be entered only through the provider's secure flow. Do not send them by email or enter them into FoxTutor Learn.</p>`;
  return { subject: title, text, html: frame(title, "FoxTutor Learn", body) };
}

function statementDate(value: string | null): string {
  if (!value) return "date not recorded";
  const [year, month, day] = value.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[Number(month) - 1] ?? month} ${year}`;
}

export function renderCreditCoveredStatement(data: CreditCoveredStatementEmailData): EmailContent {
  const amount = (Number(data.amountMinor) / 100).toFixed(2);
  const sourceLines = data.sources.length
    ? data.sources.map((source) => {
      const origin = source.invoiceReference
        ? `Invoice ${source.invoiceReference}`
        : "a previous FoxTutor credit from a cancelled lesson";
      const lesson = source.lessonDate ? ` - lesson on ${statementDate(source.lessonDate)}` : "";
      return `${origin}${lesson} - £${(Number(source.amountMinor) / 100).toFixed(2)}`;
    })
    : ["a previous FoxTutor credit; source lesson history is not available"];
  const sourceLabel = sourceLines.length === 1 ? "Credit source" : "Credit sources";
  const coveredLesson = statementDate(data.lessonDate);
  const text = `Hello ${data.studentName},\n\nYour FoxTutor lesson on ${coveredLesson} has been paid for using credit from an earlier FoxTutor payment. No payment is needed from you.\n\nStatement reference: ${data.invoiceReference}\n\nLesson paid for: ${coveredLesson}\nLesson fee: £${amount}\nCredit used: £${amount}\n${sourceLabel}:\n- ${sourceLines.join("\n- ")}\nAmount due: £0.00\n\nYou do not need to make a payment or set up Direct Debit for this lesson.\n\nThis statement is for your records. If you have any questions, please contact billing@foxtutor.org.`;
  const sourceHtml = sourceLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const htmlBody = `<p>Hello ${escapeHtml(data.studentName)},</p><p>Your FoxTutor lesson on <strong>${escapeHtml(coveredLesson)}</strong> has been paid for using credit from an earlier FoxTutor payment. No payment is needed from you.</p><dl><dt>Statement reference</dt><dd>${escapeHtml(data.invoiceReference)}</dd><dt>Lesson paid for</dt><dd>${escapeHtml(coveredLesson)}</dd><dt>Lesson fee</dt><dd>£${escapeHtml(amount)}</dd><dt>Credit used</dt><dd>£${escapeHtml(amount)}</dd><dt>${sourceLabel}</dt><dd><ul>${sourceHtml}</ul></dd><dt>Amount due</dt><dd>£0.00</dd></dl><p>You do not need to make a payment or set up Direct Debit for this lesson.</p><p>This statement is for your records. If you have any questions, please contact <a href="mailto:billing@foxtutor.org">billing@foxtutor.org</a>.</p>`;
  return {
    subject: `Your FoxTutor lesson is paid - ${coveredLesson}`,
    text,
    html: frame("Payment received", "FoxTutor Learn", htmlBody, "Billing")
  };
}

export function renderEmail(type: NotificationType, data: Record<string, unknown>, origin: string): EmailContent {
  if (type === "STUDENT_INVITED") {
    requireFields(data, ["studentName", "origin"]);
    return renderStudentInvitation(data as unknown as { studentName: string; origin: string });
  }
  if (type === "LESSON_CREATED" || type === "LESSON_CHANGED" || type === "LESSON_REMINDER" || type === "CANCELLATION_PROCESSED" || type === "CANCELLATION_REQUESTED" || type === "CANCELLATION_APPROVED" || type === "CANCELLATION_REJECTED" || type === "LESSON_RESCHEDULED") {
    requireFields(data, ["studentName", "startAt", "endAt", "timezone", "lessonPath"]);
  }
  if (type === "LESSON_CREATED") return renderLessonCreated(data as unknown as LessonEmailData, origin);
  if (type === "LESSON_CHANGED") return renderLessonChanged(data as unknown as LessonEmailData, origin);
  if (type === "LESSON_REMINDER") return renderLessonReminder(data as unknown as LessonEmailData, origin);
  if (type === "RESOURCE_ADDED") {
    requireFields(data, ["studentName", "filename", "resourcePath"]);
    return renderResourceAdded(data as unknown as ResourceEmailData, origin);
  }
  if (type === "CANCELLATION_PROCESSED") return renderCancellationProcessed(data as unknown as LessonEmailData, origin);
  if (type === "CANCELLATION_REQUESTED") return renderCancellationRequested(data as unknown as LessonEmailData, origin);
  if (type === "CANCELLATION_APPROVED") return renderCancellationDecision({ ...(data as unknown as LessonEmailData), decision: "approved" }, origin);
  if (type === "CANCELLATION_REJECTED") return renderCancellationDecision({ ...(data as unknown as LessonEmailData), decision: "rejected" }, origin);
  if (type === "LESSON_RESCHEDULED") return renderLessonRescheduled(data as unknown as LessonEmailData, origin);
  if (type === "DST_WARNING") {
    requireFields(data, ["studentName", "changeDate", "direction"]);
    if (data.direction !== "forward" && data.direction !== "backward") throw new Error("Invalid DST warning direction");
    return renderDstWarning(data as unknown as DstWarningEmailData);
  }
  if (type === "BILLING_DIRECT_DEBIT_SETUP" || type === "BILLING_DIRECT_DEBIT_REMINDER") {
    requireFields(data, ["studentName"]);
    return renderDirectDebitStatus({
      studentName: data.studentName as string,
      status: type === "BILLING_DIRECT_DEBIT_REMINDER" ? "pending" : "setup"
    });
  }
  if (type === "BILLING_CREDIT_COVERED_STATEMENT") {
    if (typeof data.studentName !== "string" || typeof data.invoiceReference !== "string" || typeof data.lessonDate !== "string" || !Array.isArray(data.sources)) {
      throw new Error("Missing credit-covered statement template fields");
    }
    return renderCreditCoveredStatement(data as unknown as CreditCoveredStatementEmailData);
  }
  requireFields(data, ["studentName", "startAt", "endAt", "timezone", "lessonPath", "pupilName", "level", "reportPath", "thisLessonsFocus"]);
  return renderLessonReport(data as unknown as ReportEmailData, origin);
}
