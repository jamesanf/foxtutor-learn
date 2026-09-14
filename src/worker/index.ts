import type { AppUser, LearnRoute, Role } from "../auth/authorization";
import { canAccess, classifyLearnRoute, requiredRole } from "../auth/authorization";
import { identityEmail } from "../auth/identity";
import { findActiveUser, findActiveUserById } from "../db/users";
import {
  deactivateStudent,
  findStudent,
  findActiveStudentRecipient,
  findStudentAccount,
  findActiveStudentForUser,
  findStudentLinkedToUser,
  insertStudent,
  listStudents,
  listActiveStudentsForResourceFilter,
  updateStudentLevel,
  updateStudent,
  type Student
} from "../db/students";
import {
  findLesson,
  findLessonForUser,
  hasOverlappingLesson,
  insertLesson,
  countActiveStudents,
  countPastLessons,
  countUpcomingLessons,
  countLessonsForStudentRecord,
  listStartedLessonsNeedingReports,
  listLessons,
  listLessonsForStudentRecord,
  listLessonsForResourceFilter,
  listPastLessons,
  listUpcomingLessons,
  listLessonsForUserInRange,
  listLessonsInRange,
  listLessonsForUser,
  markElapsedScheduledLessonsCompleted,
  updateLesson,
  updateLessonStatus,
  type Lesson
} from "../db/lessons";
import {
  countResources,
  countResourcesForStudentRecord,
  activeResourceBytesForLesson,
  deleteResourceMetadata,
  findResource,
  findResourceByIdempotencyKey,
  findResourceForStudent,
  insertUploadingResource,
  listResources,
  listResourcesForLessonForStudent,
  listResourcesForLesson,
  listResourcesForStudentRecord,
  listResourcesForStudent,
  listResourceSuggestions,
  markResourceAvailable,
  markResourceFailed,
  type Resource
} from "../db/resources";
import {
  findActiveCalendarFeedForOwner,
  findCalendarFeedByTokenHash,
  rotateCalendarFeed,
  type CalendarFeed
} from "../db/calendar-feeds";
import { findLessonReport, findSentLessonReportForStudent, upsertLessonReport, type LessonReport } from "../db/reports";
import { countNotifications, findNotificationById, listNotifications, notificationCounts, updateNotificationSchedule } from "../db/notifications";
import {
  accountingOutboxCounts,
  consumeAccountingOAuthState,
  createAccountingOAuthState,
  findAccountingBillingSettings,
  findAccountingOutbox,
  findExternalAccountingLink,
  listAccountingOutbox,
  listExternalAccountingLinks,
  listDueAccountingOutbox,
  makeAccountingRetryable,
  recordAccountingRetryAudit,
  removeExternalAccountingLink,
  saveAccountingBillingSettings,
  updateAccountingConnectionStatus,
  updateExternalAccountingLinkStatus
} from "../db/accounting";
import {
  ensureBillingInvoiceForEvent,
  findCreditById,
  findBillingInvoice,
  ensureDueDirectDebitOperations,
  listCustomerCreditBalances,
  listDueBillingProviderOperations,
  listBillingHistory,
  listUpcomingBillingRows,
  listOpenBillingAlerts,
  listPendingBillingEvents,
  updateBillingAlertStatus,
  type BillingHistoryItem
} from "../db/billing";
import {
  addRecurringPause,
  createRecurringSeries,
  ensureAllRecurringSeriesMaterialised,
  ensureRecurringSeriesMaterialised,
  findRecurringSeries,
  listRecurringSeries,
  setRecurringSeriesStatus
} from "../db/recurrence";
import { processDueBillingInvoiceOperations, reconcileBillingInvoices } from "../billing/service";
import { auditBillingChain } from "../billing/audit";
import { provisionBillingAccount, reconcileBillingAccountMandate, runBillingProvisioningScheduler } from "../accounting/provisioning";
import { createEmergencyPaygOverride, findBillingAccount } from "../db/billing-accounts";
import { canRecordEmergencyPayg, validateEmergencyPaygReason } from "../domain/billing-policy";
import { listNotificationSettings, upsertNotificationSetting, type NotificationSetting } from "../db/notification-settings";
import {
  cancelLesson,
  listLessonHistory,
  rescheduleLesson,
  undoStudentCancellation,
  type LessonHistory
} from "../db/cancellations";
import {
  countPendingRescheduleRequests,
  createRescheduleRequest,
  decideRescheduleRequest,
  findPendingRescheduleRequestForLesson,
  findRescheduleRequest,
  listPendingRescheduleRequests,
  type RescheduleRequest
} from "../db/reschedules";
import { createAndDeliverNotification, runDstWarningScheduler, runReminderScheduler } from "../notifications/service";
import { canonicalLearnOrigin } from "../notifications/links";
import { renderEmail } from "../notifications/templates";
import { eventIdempotencyKey, hasMaterialLessonChange, isNotificationType, reminderDueAt, type NotificationType } from "../domain/notifications";
import {
  billingConsequenceForAdminCancellation,
  billingConsequenceForReschedule,
  billingConsequenceForStudentCancellation,
  canStudentCancel,
  canStudentReschedule,
} from "../domain/cancellations";
import { lessonIdFromUrlKey, lessonUrlKey } from "../domain/lesson-url";
import { reportDocumentTitleFromIsoDate, reportPdfFilenameFromIsoDate } from "../domain/report-title";
import {
  CALENDAR_TIMEZONE,
  currentCalendarDate
} from "../domain/calendar";
import { calculatePaymentReadiness } from "../domain/payment-readiness";
import { directDebitStatusCopy, mapDirectDebitStatus, type DirectDebitStatus } from "../domain/direct-debit";
import { runBillingSentinel } from "../billing/sentinel";
import {
  academicYearOptions,
  isStudentAcademicSystem,
  validateAcademicYear,
  type StudentAcademicSystem
} from "../domain/student-profile";
import {
  canTransitionLessonStatus,
  deriveLessonEnd,
  isoToLocalDateTime,
  isQuarterHourTime,
  localDateTimeToIso,
  isLessonStatus,
  STANDARD_LESSON_DURATION_MINUTES,
  validEmail,
  validLevel,
  validName,
  validateLessonInput,
  type LessonStatus
} from "../domain/validation";
import { formatMinorUnits } from "../domain/accounting";
import { privateHeaders } from "../security/headers";
import { clearSessionCookies, createSession, csrfTokenMatches, csrfValid, readSession, type ActiveSession } from "../security/session";
import { decryptFeedToken, encryptFeedToken, feedTokenLast4, generateFeedToken, hashFeedToken, isFeedToken } from "../security/feed-token";
import { learnPrivacyContent, learnTermsContent } from "../legal";
import { feedRange, generateIcs } from "../domain/icalendar";
import { reportViewModel } from "../reports/view";
import { generateLessonReportPdf } from "../reports/pdf";
import { renderRichTextHtml } from "../reports/rich-text";
import { accountingIntegrationStatuses, accountingIntegrationStatus, configuredEnvironment, configuredInvoice, configuredInvoiceFromDatabase, connectFreeAgent, freeAgentEnvironmentConfig, freeAgentEnvironmentConfigIssue, processAccountingOutbox, processCreditNoteProviderOperation, providerCall, reconcileAccountingOutbox, resolveFoxTutorCategoryMapping, temporaryProductionCompatibilityEnabled, validateBillingSettings, verifyFreeAgentContactMapping } from "../accounting/service";
import { freeAgentAuthorizationUrl, freeAgentFetch, FreeAgentApiError, parseFreeAgentEnvironment, type FreeAgentCategory, type FreeAgentEnvironment } from "../accounting/freeagent/client";
import { hashOAuthState, randomOAuthState } from "../accounting/credentials";
import {
  MAX_RESOURCE_SIZE_BYTES,
  MAX_LESSON_STORAGE_BYTES,
  RESOURCE_PAGE_SIZES,
  canRenderInline,
  fileTypeFilterContentTypes,
  fileTypeLabel,
  hasExpectedSignature,
  pdfPageCount,
  sanitizeHeaderFilename,
  validateResourceFile
} from "../resources/policy";

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  ENVIRONMENT?: string;
  PUBLIC_ORIGIN?: string;
  CALENDAR_FEED_ENCRYPTION_KEY?: string;
  MAIL_API_URL?: string;
  MAIL_API_TOKEN?: string;
  MAIL_API_FROM?: string;
  MAIL_API_ACCESS_CLIENT_ID?: string;
  MAIL_API_ACCESS_CLIENT_SECRET?: string;
  FREEAGENT_ENVIRONMENT?: string;
  FREEAGENT_SANDBOX_CLIENT_ID?: string;
  FREEAGENT_SANDBOX_CLIENT_SECRET?: string;
  FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN?: string;
  FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI?: string;
  FREEAGENT_PRODUCTION_CLIENT_ID?: string;
  FREEAGENT_PRODUCTION_CLIENT_SECRET?: string;
  FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN?: string;
  FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI?: string;
  FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP?: string;
  FREEAGENT_CLIENT_ID?: string;
  FREEAGENT_CLIENT_SECRET?: string;
  FREEAGENT_OAUTH_REDIRECT_URI?: string;
  FREEAGENT_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_API_VERSION?: string;
  FREEAGENT_ACCESS_LEVEL?: string;
  FREEAGENT_INVOICE_AMOUNT?: string;
  FREEAGENT_INVOICE_ITEM_TYPE?: string;
  FREEAGENT_INVOICE_CATEGORY_URL?: string;
  FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS?: string;
  FREEAGENT_INVOICE_CURRENCY?: string;
  FREEAGENT_INVOICE_SALES_TAX_RATE?: string;
  FREEAGENT_COMPANY_SUBDOMAIN?: string;
  FREEAGENT_BILLING_PROVIDER_ENABLED?: string;
  RESOURCES_BUCKET?: R2Bucket;
}

type ReportRecipient = NonNullable<Awaited<ReturnType<typeof findActiveStudentRecipient>>>;

async function emitLessonReportNotification(
  env: Env,
  lesson: Lesson,
  report: LessonReport,
  student: ReportRecipient,
  resources: Resource[],
  eventId: string,
  now: string,
  origin: string
): Promise<Awaited<ReturnType<typeof emitNotification>>> {
  if (!student.learn_user_id || !student.learn_user_email) return null;
  const content = renderEmail("LESSON_REPORT", {
    studentName: student.name,
    startAt: report.lesson_start_at,
    endAt: report.lesson_end_at,
    timezone: report.lesson_timezone,
    lessonPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(lesson.id))}`,
    reportPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(lesson.id))}/report`,
    externalUrl: lesson.external_url,
    pupilName: report.pupil_name,
    level: report.level,
    thisLessonsFocus: report.this_lessons_focus,
    nextLessonsFocus: report.next_lessons_focus,
    homeLearningTask: report.home_learning_task,
    notes: report.notes,
    evenBetterIf: report.even_better_if,
    resources: resources.filter((resource) => resource.status === "available" && !resource.deleted_at).map((resource) => ({
      filename: resource.original_filename,
      path: `/learn/student/resources/${encodeURIComponent(resource.id)}/download`
    }))
  }, origin);
  return emitNotification(env, {
    type: "LESSON_REPORT",
    eventId,
    recipientUserId: student.learn_user_id,
    studentId: student.id,
    lessonId: lesson.id,
    reportId: report.id,
    content
  }, now);
}

function htmlDocument(title: string, body: string, appendBrand = true): Response {
  const headers = privateHeaders("text/html; charset=utf-8");
  const documentTitle = appendBrand ? `${title} | FoxTutor Learn` : title;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><meta name="theme-color" content="#0e7490"><title>${escapeHtml(documentTitle)}</title><link rel="icon" type="image/png" href="/learn/assets/my-favicon/favicon-96x96.png" sizes="96x96"><link rel="shortcut icon" href="/learn/assets/my-favicon/favicon.ico"><link rel="apple-touch-icon" href="/learn/assets/my-favicon/apple-touch-icon.png"><link rel="manifest" href="/learn/assets/my-favicon/site.webmanifest"><link rel="preload" href="/learn/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/learn/assets/learn.css"><script src="/learn/assets/learn.js" defer></script></head><body>${body}</body></html>`,
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
  const icons = {
    dashboard: "M13 3v6h8V3h-8Zm0 18h8V11h-8v10ZM3 21h8v-8H3v8ZM3 3v8h8V3H3Z",
    calendar: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11ZM5 7V6h14v1H5Z",
    bookings: "M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7-0.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75ZM19 19H5V5h14v14Z",
    lessons: "M12 3 1 9l4 2.18v6L12 21l7-3.82v-6.01L21 9 12 3Zm5.82 6L12 12.18 6.18 9 12 5.82 17.82 9ZM17 16.17l-5 2.73-5-2.73v-3.88l5 2.73 5-2.73v3.88Z",
    reschedules: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z",
    resources: "M10 4H2c-1.11 0-1.99.89-1.99 2L0 18c0 1.1.89 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-10l-2-2Z",
    notifications: "M21 19v-2l-2-2v-5c0-3.07-1.63-5.64-4.5-6.32V3c0-.83-.67-1.5-1.5-1.5S11.5 2.17 11.5 3v.68C8.63 4.36 7 6.93 7 10v5l-2 2v2h16Zm-7 3c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Z",
    accounting: "M5 6H23V18H5V6M14 9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9 8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1 10H3V20H19V22H1V10Z",
    students: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5ZM8 13c-2.33 0-7 1.17-7 3.5V19h5v-2.5c0-1.03.42-1.91 1.09-2.63C6.98 13.32 7.5 13.12 8 13Z"
  } as const;
  const icon = (name: keyof typeof icons): string => `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${icons[name]}"></path></svg>`;
  const iconByLabel: Record<string, keyof typeof icons> = { Dashboard: "dashboard", Calendar: "calendar", Bookings: "bookings", "Past Lessons": "lessons", Reschedules: "reschedules", Resources: "resources", Notifications: "notifications", Accounting: "accounting", Students: "students", "My lessons": "lessons", Billing: "accounting", "Recurring series": "lessons" };
  const links: Array<[string, string]> = role === "ADMIN"
    ? [["/learn/admin", "Dashboard"], ["/learn/admin/calendar", "Calendar"], ["/learn/admin/bookings", "Bookings"], ["/learn/admin/lessons", "Past Lessons"], ["/learn/admin/series", "Recurring series"], ["/learn/admin/reschedules", "Reschedules"], ["/learn/admin/resources", "Resources"], ["/learn/admin/notifications", "Notifications"], ["/learn/admin/accounting", "Accounting"], ["/learn/admin/students", "Students"]]
    : [["/learn/student", "Dashboard"], ["/learn/student/calendar", "Calendar"], ["/learn/student/lessons", "My lessons"], ["/learn/student/billing", "Billing"], ["/learn/student/resources", "Resources"]];
  return links.map(([href, label]) => `<a href="${href}">${icon(iconByLabel[label])}<span>${label}</span></a>`).join("");
}

function learnFooter(): string {
  return `<footer class="learn-footer"><div class="learn-footer-inner"><div class="learn-footer-copy"><a href="/learn" class="learn-footer-name">James Fox</a><p>Bespoke English Tuition</p><small>© 2026 Fox Learning Ltd. All rights reserved.</small></div><div class="learn-footer-logo"><img src="/learn/assets/foxlearninglogo-240.webp" alt="FoxTutor" width="48" height="46" loading="lazy"></div><div class="learn-footer-links"><a href="mailto:hello@foxtutor.org">hello@foxtutor.org</a><span aria-hidden="true"></span><a href="/learn/terms">Terms &amp; Conditions</a><span aria-hidden="true"></span><a href="/learn/privacy">Privacy Policy</a></div></div></footer>`;
}

function legalPage(title: string, content: string): string {
  return `<div class="legal-page"><div class="page-heading"><h1>${escapeHtml(title)}</h1></div><article class="card legal-content">${content}</article></div>`;
}

function appPage(user: AppUser, csrfToken: string, title: string, content: string, exactTitle = false): Response {
  const identity = user.role === "ADMIN"
    ? `<span class="header-control identity-role">ADMIN</span>`
    : `<span class="identity-name">${escapeHtml(user.display_name)}<small>STUDENT</small></span>`;
  const body = `<div class="app-shell"><header class="topbar"><div class="brand"><img class="brand-logo" src="/learn/assets/foxlearninglogo-240.webp" alt="FoxTutor" width="48" height="46"><span class="brand-copy"><strong>FoxTutor</strong></span></div><div class="topbar-center-logo"><a class="topbar-center-logo-link" href="/learn" aria-label="FoxTutor Learn dashboard"><img src="/learn/assets/learn_logo-240.webp" alt="FoxTutor Learn" width="120" height="77"></a></div><div class="identity">${identity}<form method="post" action="/learn/logout"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><button type="submit" class="header-control link-button">Log out</button></form></div></header><div class="layout"><nav aria-label="Primary navigation"><div class="nav-links">${navigation(user.role)}</div></nav><main class="content">${content}</main></div>${learnFooter()}</div><div id="site-notifications" class="site-notifications" aria-live="polite" aria-atomic="false"></div>`;
  return htmlDocument(title, body, !exactTitle);
}

function withSessionCookies(response: Response, setCookies: string[] | undefined): Response {
  for (const value of setCookies ?? []) response.headers.append("Set-Cookie", value);
  return response;
}

function buttonLink(href: string, label: string): string {
  return `<a class="button" href="${href}">${escapeHtml(label)}</a>`;
}

async function emitNotification(
  env: Env,
  draft: Parameters<typeof createAndDeliverNotification>[2],
  now = new Date().toISOString()
): Promise<Awaited<ReturnType<typeof createAndDeliverNotification>> | null> {
  if (!env.DB) return null;
  try {
    return await createAndDeliverNotification(env.DB, env, draft, now);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 160) : "Notification creation failed";
    console.error("notification creation failed", { type: draft.type, eventId: draft.eventId, message });
    return null;
  }
}

function lessonMailData(lesson: Lesson, includeExternalUrl = true): {
  studentName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  lessonPath: string;
  externalUrl: string | null;
} {
  return {
    studentName: lesson.student_name ?? "Student",
    startAt: lesson.start_at,
    endAt: lesson.end_at,
    timezone: lesson.timezone,
    lessonPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(lesson.id))}`,
    externalUrl: includeExternalUrl ? lesson.external_url : null
  };
}

function notificationStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function notificationEventLabel(eventType: string): string {
  return eventType.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function notificationTimestamp(value: string | null): string {
  if (!value) return "Immediate";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CALENDAR_TIMEZONE
  }).format(new Date(value));
}

function notificationPreview(eventType: NotificationType, origin: string): { subject: string; text: string; html: string } {
  const lesson = {
    studentName: "Alex Taylor",
    startAt: "2026-09-15T19:00:00.000Z",
    endAt: "2026-09-15T19:55:00.000Z",
    timezone: CALENDAR_TIMEZONE,
    lessonPath: "/learn/student/lessons/example",
    externalUrl: null,
    reminderLeadMinutes: 15
  };
  const content = eventType === "STUDENT_INVITED"
    ? renderEmail(eventType, { studentName: "Alex Taylor", origin }, origin)
    : eventType === "RESOURCE_ADDED"
      ? renderEmail(eventType, { studentName: "Alex Taylor", filename: "Lesson resource.pdf", resourcePath: "/learn/student/resources/example" }, origin)
      : eventType === "DST_WARNING"
        ? renderEmail(eventType, { studentName: "Alex Taylor", changeDate: "2026-10-25", direction: "backward" }, origin)
        : eventType === "LESSON_REPORT"
          ? renderEmail(eventType, {
            ...lesson,
            pupilName: "Alex Taylor",
            level: "GCSE English",
            reportPath: "/learn/student/lessons/example/report",
            thisLessonsFocus: "Reading comprehension",
            nextLessonsFocus: "Written response",
            homeLearningTask: "",
            notes: "",
            evenBetterIf: "",
            resources: []
          }, origin)
          : renderEmail(eventType, {
            ...lesson,
            ...(eventType === "CANCELLATION_PROCESSED" ? { undoPath: "/learn/student/lessons/example/undo-cancellation" } : {}),
            ...(eventType === "CANCELLATION_APPROVED" ? { decision: "approved" } : {}),
            ...(eventType === "CANCELLATION_REJECTED" ? { decision: "rejected" } : {})
          }, origin);
  return { subject: content.subject, text: content.text, html: content.html };
}

function notificationControls(settings: NotificationSetting[], csrfToken: string): string {
  const groups: Array<{ label: string; description: string; types: NotificationType[] }> = [
    { label: "Lessons", description: "Booking, changes, reminders and rescheduling.", types: ["LESSON_CREATED", "LESSON_CHANGED", "LESSON_REMINDER", "LESSON_RESCHEDULED"] },
    { label: "Cancellations", description: "Cancellation outcomes and student requests.", types: ["CANCELLATION_PROCESSED", "CANCELLATION_REQUESTED", "CANCELLATION_APPROVED", "CANCELLATION_REJECTED"] },
    { label: "Students and reports", description: "Student access, lesson reports and clock-change notices.", types: ["STUDENT_INVITED", "LESSON_REPORT", "DST_WARNING"] },
    { label: "Resources", description: "New lesson resources.", types: ["RESOURCE_ADDED"] }
  ];
  const settingByType = new Map(settings.map((setting) => [setting.event_type, setting]));
  const rowForSetting = (setting: NotificationSetting): string => {
    const reminder = setting.event_type === "LESSON_REMINDER";
    const timingLabel = reminder ? "Minutes before lesson" : "Delivery delay (minutes)";
    return `<form class="notification-setting-row" method="post" action="/learn/admin/notifications/settings">${hiddenCsrf(csrfToken)}<input type="hidden" name="eventType" value="${escapeHtml(setting.event_type)}"><div class="notification-setting-name"><strong>${escapeHtml(notificationEventLabel(setting.event_type))}</strong></div><label class="toggle-control"><input type="checkbox" name="enabled" value="1"${setting.enabled ? " checked" : ""}><span>${setting.enabled ? "Enabled" : "Disabled"}</span></label><label class="notification-timing">${escapeHtml(timingLabel)}<input type="number" name="timingMinutes" min="${reminder ? "1" : "-10080"}" max="10080" step="1" value="${setting.timing_minutes ?? 0}"></label><a class="button secondary notification-preview-link" href="/learn/admin/notifications/preview/${encodeURIComponent(setting.event_type)}" target="_blank" rel="noopener">Preview</a><button class="button secondary notification-save" type="submit">Save</button></form>`;
  };
  const groupMarkup = groups.map((group) => {
    const rows = group.types.map((type) => settingByType.get(type)).filter((setting): setting is NotificationSetting => Boolean(setting)).map(rowForSetting).join("");
    return `<details class="notification-group" data-notification-group><summary><span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></span></summary><div class="notification-group-body"><div class="notification-settings-header"><span>Notification</span><span>Status</span><span>Timing</span><span>Preview</span><span>Save</span></div>${rows}</div></details>`;
  }).join("");
  return `<section class="card notification-controls"><div class="section-heading"><div><h2>Notification controls</h2><p class="lede">Enable or disable future notifications and adjust when scheduled messages are sent.</p></div></div><div class="notification-settings-list">${groupMarkup}</div></section>`;
}

function notificationList(
  rows: Awaited<ReturnType<typeof listNotifications>>,
  counts: Awaited<ReturnType<typeof notificationCounts>>,
  settings: NotificationSetting[],
  csrfToken: string,
  selectedStatus?: string,
  page = 1,
  pageSize = 12,
  total = 0
): string {
  const filters = ["", "PENDING", "SENDING", "UNKNOWN", "FAILED", "SENT", "SUPPRESSED"].map((status) => {
    const label = status ? notificationStatusLabel(status) : "All";
    const active = selectedStatus === status || (!selectedStatus && !status);
    return `<button type="button" class="button secondary notification-filter-option${active ? " is-active" : ""}" data-notification-filter="${status}" aria-pressed="${active ? "true" : "false"}">${label}</button>`;
  }).join(" ");
  const summary = `<div class="summary-grid"><section class="summary-card"><span>Sent</span><strong>${counts.SENT}</strong></section><section class="summary-card"><span>Pending</span><strong>${counts.PENDING}</strong></section><section class="summary-card"><span>Failed</span><strong>${counts.FAILED}</strong></section><section class="summary-card"><span>Unknown</span><strong>${counts.UNKNOWN}</strong></section><section class="summary-card"><span>Suppressed</span><strong>${counts.SUPPRESSED}</strong></section></div>`;
  const body = rows.length
    ? `<div class="table-wrap notification-log-table"><table><thead><tr><th>Event</th><th>Recipient</th><th>Pupil</th><th>Lesson date</th><th>Status</th><th>Scheduled</th><th>Created</th></tr></thead><tbody>${rows.map((row) => `<tr data-notification-row data-notification-status="${escapeHtml(row.status)}"><td data-label="Event"><a href="/learn/admin/notifications/${encodeURIComponent(row.id)}">${escapeHtml(notificationEventLabel(row.event_type))}</a></td><td data-label="Recipient">${escapeHtml(row.recipient_email ?? "Unknown")}</td><td data-label="Pupil">${row.student_id ? `<a href="/learn/admin/students/${encodeURIComponent(row.student_id)}">${escapeHtml(row.student_name ?? "Pupil")}</a>` : "—"}</td><td data-label="Lesson date">${row.lesson_id && row.lesson_start_at ? `<a href="/learn/admin/lessons/${lessonRouteId(row.lesson_id)}">${escapeHtml(notificationTimestamp(row.lesson_start_at))}</a>` : "—"}</td><td data-label="Status"><span class="status status-${row.status.toLowerCase()}">${escapeHtml(notificationStatusLabel(row.status))}</span></td><td data-label="Scheduled">${escapeHtml(notificationTimestamp(row.scheduled_at))}</td><td data-label="Created">${escapeHtml(notificationTimestamp(row.created_at))}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty-state compact-empty"><h2>No notifications</h2><p>Outbound lesson communication will appear here.</p></div>`;
  const statusQuery = selectedStatus ? `&status=${encodeURIComponent(selectedStatus)}` : "";
  const sizeOptions = [12, 24, 48].map((size) => `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`).join("");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const hrefForPage = (nextPage: number): string => `/learn/admin/notifications?page=${nextPage}&size=${pageSize}${statusQuery}`;
  const pagination = `<footer class="list-footer notification-pagination"><span class="notification-pagination-spacer"></span>${paginationControls(safePage, pageCount, "Notification delivery", hrefForPage, "notification-page-link")}<form class="page-size-form" method="get" action="/learn/admin/notifications"><label for="notification-page-size">Show per page</label><select id="notification-page-size" class="page-size-select notification-page-size" name="size">${sizeOptions}</select><input type="hidden" name="page" value="1">${selectedStatus ? `<input type="hidden" name="status" value="${escapeHtml(selectedStatus)}">` : ""}<noscript><button class="button secondary" type="submit">Apply</button></noscript></form></footer>`;
  return `${summary}${notificationControls(settings, csrfToken)}<section class="card"><div class="section-heading notification-log-heading"><div><h2>Delivery log</h2><p class="muted">Select a message to inspect its full content and provider result.</p></div><div class="notification-filter"><button type="button" class="button secondary notification-filter-toggle" data-notification-filter-toggle aria-expanded="false" aria-label="Filter delivery log" title="Filter delivery log"><svg class="notification-filter-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.1V18l-3.6 1.8v-7.7L4 5Z"></path></svg></button></div></div><div class="notification-filter-panel notification-filter-bar" data-notification-filter-panel hidden><div class="notification-filter-grid" role="group" aria-label="Filter delivery log">${filters}</div></div>${body}${pagination}</section>`;
}

function notificationDetail(notification: Awaited<ReturnType<typeof findNotificationById>>, csrfToken: string, error?: string): string {
  if (!notification) return `<section class="card empty-state compact-empty"><h2>Notification not found</h2></section>`;
  const scheduled = notification.scheduled_at ? isoToLocalDateTime(notification.scheduled_at, CALENDAR_TIMEZONE) : "";
  const scheduleControl = notification.status === "PENDING"
    ? `<form method="post" action="/learn/admin/notifications/${encodeURIComponent(notification.id)}">${hiddenCsrf(csrfToken)}<label>Send at (UK time)<input type="datetime-local" name="scheduledAt" value="${escapeHtml(scheduled)}" required></label>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<div class="form-actions"><button class="button" type="submit">Update schedule</button></div></form>`
    : `<p class="muted">Scheduling is locked because this notification is ${notificationStatusLabel(notification.status).toLowerCase()}.</p>`;
  return `<section class="card notification-detail"><div class="page-heading"><div><h1>${escapeHtml(notification.event_type.replaceAll("_", " "))}</h1><p class="lede">${escapeHtml(notificationStatusLabel(notification.status))} · ${escapeHtml(notification.recipient_email ?? "Unknown")}</p></div><div class="form-actions"><a class="button secondary" href="/learn/admin/notifications/${encodeURIComponent(notification.id)}/preview" target="_blank" rel="noopener">Preview email</a><a class="button secondary" href="/learn/admin/notifications">Back to notifications</a></div></div><dl class="detail-grid"><div><dt>Created</dt><dd>${escapeHtml(notificationTimestamp(notification.created_at))}</dd></div><div><dt>Scheduled</dt><dd>${escapeHtml(notificationTimestamp(notification.scheduled_at))}</dd></div><div><dt>Attempts</dt><dd>${notification.attempt_count}</dd></div><div><dt>Provider reference</dt><dd>${escapeHtml(notification.provider_reference ?? "—")}</dd></div></dl><h2>Subject</h2><p>${escapeHtml(notification.subject)}</p><h2>Plain-text content</h2><pre class="notification-content">${escapeHtml(notification.text_body)}</pre><h2>HTML content</h2><pre class="notification-content">${escapeHtml(notification.html_body)}</pre><h2>Schedule</h2>${scheduleControl}</section>`;
}

function accountingLabel(value: string): string {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function freeAgentEnvironmentLabel(environment: string): string {
  return environment === "production" ? "Production" : "Sandbox";
}

function accountingContactList(
  students: Student[],
  links: Awaited<ReturnType<typeof listExternalAccountingLinks>>,
  csrfToken: string
): string {
  const byStudent = new Map(links.map((link) => [link.local_entity_id, link]));
  const rows = students.map((student) => {
    const link = byStudent.get(student.id);
    const status = link?.status ?? "UNVERIFIED";
    return `<tr><td data-label="Student">${escapeHtml(student.name)}</td><td data-label="Email">${escapeHtml(student.parent_email || student.email)}</td><td data-label="Status"><span class="status status-${status.toLowerCase()}">${escapeHtml(accountingLabel(status))}</span>${link?.last_error_message ? `<small>${escapeHtml(link.last_error_message)}</small>` : ""}</td><td data-label="Contact ID"><form method="post" action="/learn/admin/accounting/contacts/${encodeURIComponent(student.id)}"><div class="inline-form">${hiddenCsrf(csrfToken)}<label class="sr-only" for="contact-${escapeHtml(student.id)}">FreeAgent contact ID for ${escapeHtml(student.name)}</label><input id="contact-${escapeHtml(student.id)}" name="externalReference" inputmode="numeric" pattern="[0-9]+" value="${escapeHtml(link?.external_reference ?? "")}" placeholder="Contact ID" required><button class="accounting-icon-button accounting-save-button" type="submit" aria-label="Verify and save contact for ${escapeHtml(student.name)}" title="Verify and save"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9 2 2-2V7l-4-4m-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6m3-10H5v4h10V5h5v4Z"></path></svg></button>${link ? `<button class="accounting-icon-button accounting-remove-button" formaction="/learn/admin/accounting/contacts/${encodeURIComponent(student.id)}/remove" type="submit" aria-label="Remove contact mapping for ${escapeHtml(student.name)}" title="Remove"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 4h-4.5l-1-1h-3L9.5 4H5v2h14V4m-1 3H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7Z"></path>    </svg></button>` : `<button class="accounting-icon-button accounting-remove-button" type="button" disabled aria-disabled="true" aria-label="No contact mapping to remove for ${escapeHtml(student.name)}" title="No contact mapping to remove"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 4h-4.5l-1-1h-3L9.5 4H5v2h14V4m-1 3H6v12c0 1.1 0 2 2 2h8c1.1 0 2-2 2-2V7Z"></path></svg></button>`}</div></form></td></tr>`;
  }).join("");
  return `<section class="card"><div class="section-heading"><div><h2>FreeAgent contact mappings</h2><p class="muted">Contact IDs are currently verified and saved explicitly. Matching email addresses never create a mapping; automatic FreeAgent contact synchronization is planned.</p></div></div>${students.length ? `<div class="table-wrap accounting-contact-table"><table><thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Contact ID</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty-state compact-empty"><p>No Learn students exist.</p></div>`}</section>`;
}

function accountingList(
  rows: Awaited<ReturnType<typeof listAccountingOutbox>>,
  counts: Awaited<ReturnType<typeof accountingOutboxCounts>>,
  statuses: Awaited<ReturnType<typeof accountingIntegrationStatuses>>,
  students: Student[],
  links: Awaited<ReturnType<typeof listExternalAccountingLinks>>,
  csrfToken: string
): string {
  const summary = `<div class="summary-grid accounting-summary-grid"><section class="summary-card"><span>Pending</span><strong>${counts.PENDING}</strong></section><section class="summary-card"><span>Retryable</span><strong>${counts.RETRYABLE}</strong></section><section class="summary-card"><span>Failed</span><strong>${counts.FAILED}</strong></section><section class="summary-card"><span>Unknown</span><strong>${counts.UNKNOWN}</strong></section><section class="summary-card"><span>Succeeded</span><strong>${counts.SUCCEEDED}</strong></section></div>`;
  const settingsAction = `<a class="accounting-icon-link accounting-settings-link" href="/learn/admin/accounting/settings" aria-label="Billing settings" title="Billing settings"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5ZM19.43 12.97c.04-.32.07-.64.07-.97s-.02-.65-.07-.97l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98L14.5 2.42C14.47 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.5.42L9.12 5.07c-.61.25-1.18.59-1.69.98l-2.49-1c-.23-.08-.48 0-.6.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.08.65-.08.98s.03.65.08.97l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.23.08.48 0 .6-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63Z"></path></svg></a>`;
  const connectionCard = (environment: FreeAgentEnvironment): string => {
    const status = statuses[environment];
    const label = freeAgentEnvironmentLabel(environment);
    const environmentSettingsAction = `<a class="accounting-icon-link accounting-settings-link" href="/learn/admin/accounting/settings?environment=${environment}" aria-label="${label} billing settings" title="${label} billing settings"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5ZM19.43 12.97c.04-.32.07-.64.07-.97s-.02-.65-.07-.97l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98L14.5 2.42C14.47 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.5.42L9.12 5.07c-.61.25-1.18.59-1.69.98l-2.49-1c-.23-.08-.48 0-.6.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.08.65-.08.98s.03.65.08.97l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61.25 1.18.58 1.69.98l2.49 1c.23.08.48 0 .6-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63Z"></path></svg></a>`;
    const connectionAction = buttonLink(
      `/learn/admin/accounting/connect/${environment}`,
      status.connected ? "Reauthenticate" : "Connect"
    );
    return `<section class="card"><div class="section-heading"><div><h2>FreeAgent ${label}</h2></div><div class="form-actions accounting-connection-actions">${!status.errorMessage ? `<span class="status status-${status.connected ? "sent" : "failed"}">${status.connected ? "Connected" : "Needs attention"}</span>` : ""}${connectionAction}${environmentSettingsAction}</div></div>${status.errorMessage ? `<p class="form-error">${escapeHtml(status.errorMessage)}</p>` : ""}${status.lastSuccessAt ? `<p class="muted">Last successful sync: ${escapeHtml(notificationTimestamp(status.lastSuccessAt))}</p>` : ""}<dl class="accounting-connection-details"><div><dt>Company name</dt><dd>${escapeHtml(status.companyName ?? "Not verified")}</dd></div><div><dt>Company subdomain</dt><dd>${escapeHtml(status.companySubdomain ?? "Not configured")}</dd></div><div><dt>Invoice category</dt><dd>${status.invoiceMapping.category ? "Configured" : "Not selected"}</dd></div></dl></section>`;
  };
  const connection = `${connectionCard("sandbox")}${connectionCard("production")}`;
  const body = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Student</th><th>Consequence</th><th>Status</th><th>External reference</th><th>Action</th></tr></thead><tbody>${rows.map((row) => `<tr><td data-label="Date">${escapeHtml(notificationTimestamp(row.created_at))}</td><td data-label="Event">${escapeHtml(accountingLabel(row.event_type))}</td><td data-label="Student">${escapeHtml(row.student_name ?? "Pupil")}</td><td data-label="Consequence">${escapeHtml(accountingLabel(row.billing_consequence))}</td><td data-label="Status"><span class="status status-${row.status.toLowerCase()}">${escapeHtml(accountingLabel(row.status))}</span>${row.safe_error_message ? `<small>${escapeHtml(row.safe_error_message)}</small>` : ""}</td><td data-label="External reference">${row.external_url ? `<a href="${escapeHtml(row.external_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.external_reference ?? "Open in FreeAgent")}</a>` : escapeHtml(row.external_reference ?? "—")}</td><td data-label="Action">${row.status === "UNKNOWN" ? `<a class="button secondary" href="/learn/admin/accounting/${encodeURIComponent(row.id)}/reconcile">Reconcile</a>` : ["FAILED", "RETRYABLE"].includes(row.status) ? `<form method="post" action="/learn/admin/accounting/${encodeURIComponent(row.id)}/retry">${hiddenCsrf(csrfToken)}<button class="button secondary" type="submit">Retry</button></form>` : "—"}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty-state compact-empty"><h2>No accounting events</h2><p>Phase 5 commercial decisions will appear here when they require an accounting boundary.</p></div>`;
  return `${connection}${summary}${accountingContactList(students, links, csrfToken)}<section class="card"><div class="section-heading"><div><h2>Accounting outbox</h2><p class="muted">FreeAgent actions are processed separately from lesson and email delivery.</p></div></div>${body}</section>`;
}

function billingSettingsErrorHint(error: string): string {
  if (error.toLowerCase().includes("amount")) return "Enter a positive lesson amount with up to two decimal places, for example 55.00.";
  if (error.toLowerCase().includes("category")) return "Use the HTTPS category URL supplied by the connected FreeAgent company and matching the selected environment.";
  if (error.toLowerCase().includes("payment terms")) return "Enter a whole number of days from 0 to 365.";
  if (error.toLowerCase().includes("tax")) return "Enter the explicit FreeAgent sales-tax rate for this business. Use 0 when no VAT is charged.";
  return "Review the billing settings and correct the invalid value before saving.";
}

function accountingBillingSettingsPage(
  csrfToken: string,
  values: {
    amount: string;
    itemType: string;
    categoryUrl: string;
    paymentTermsDays: string;
    salesTaxRate: string;
  },
  status: Awaited<ReturnType<typeof accountingIntegrationStatus>>,
  categories: FreeAgentCategory[] = [],
  categoryError?: string,
  error?: string
): string {
  const environment = status.environment;
  const environmentLabel = freeAgentEnvironmentLabel(environment);
  const integrationTag = status.connected
    ? `<span class="status status-active">FreeAgent ${environmentLabel} integration active</span>`
    : `<span class="status status-failed">FreeAgent ${environmentLabel} integration not connected</span>`;
  const connectionAction = `<a class="button secondary" href="/learn/admin/accounting/connect/${environment}">${status.connected ? "Reauthenticate" : "Connect"}</a>`;
  const backAction = `<a class="accounting-icon-link billing-settings-back" href="/learn/admin/accounting" aria-label="Back to accounting" title="Back to accounting"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z"></path></svg></a>`;
  const connectionDetails = `<dl class="accounting-connection-details"><div><dt>Connection status</dt><dd>${integrationTag}</dd></div><div><dt>Environment</dt><dd>${escapeHtml(freeAgentEnvironmentLabel(status.environment))}</dd></div><div><dt>Company name</dt><dd>${escapeHtml(status.companyName ?? "Not recorded — reauthenticate to refresh")}</dd></div><div><dt>Company subdomain</dt><dd>${escapeHtml(status.companySubdomain ?? "Not configured")}</dd></div>${status.updatedAt ? `<div><dt>Connection updated</dt><dd>${escapeHtml(notificationTimestamp(status.updatedAt))}</dd></div>` : ""}</dl>`;
  const warning = error
    ? `<p class="form-error form-warning" role="alert" tabindex="0" data-tooltip="${escapeHtml(billingSettingsErrorHint(error))}">${escapeHtml(error)}</p>`
    : "";
  const categoryOptions = categories.length
    ? `<option value="">Select a FreeAgent accounting category</option>${categories.map((category) => `<option value="${escapeHtml(category.url)}"${category.url === values.categoryUrl ? " selected" : ""} data-category-search="${escapeHtml(`${category.group} ${category.description} ${category.nominalCode ?? ""}`)}">${escapeHtml(accountingLabel(category.group))} · ${escapeHtml(category.description)}${category.nominalCode ? ` (${escapeHtml(category.nominalCode)})` : ""}</option>`).join("")}`
    : `<option value="">${categoryError ? "Categories unavailable" : "No categories returned"}</option>`;
  const mapping = status.invoiceMapping;
  const mappingRow = (label: string, configured: boolean): string => `<div><dt>${label}</dt><dd>${configured ? "Configured" : "Not configured"}</dd></div>`;
  const categoryHelp = categoryError
    ? `<span class="field-help form-error">${escapeHtml(categoryError)}</span>`
    : `<span class="field-help">The approved FoxTutor sales mapping is fixed for normal operation. The provider URL is stored internally.</span>`;
  const selectedCategory = categories.find((category) => category.url === values.categoryUrl) ?? null;
  const categoryField = selectedCategory && !categoryError
    ? `<div class="accounting-fixed-category"><strong>${escapeHtml(selectedCategory.description)}${selectedCategory.nominalCode ? ` / ${escapeHtml(selectedCategory.nominalCode)}` : ""}</strong><span class="status status-active">Configured</span></div><input type="hidden" name="categoryUrl" required value="${escapeHtml(selectedCategory.url)}">`
    : `<input type="search" placeholder="Search description, nominal code or group" data-accounting-category-search aria-label="Search FreeAgent accounting categories"><select name="categoryUrl" required data-accounting-category-select>${categoryOptions}</select>`;
  return `<section class="card form-card billing-settings-card"><div class="page-heading"><div><h1>${environmentLabel} billing settings</h1></div><div class="form-actions billing-settings-actions">${connectionAction}${backAction}</div></div>${connectionDetails}${warning}<p class="info-box">FreeAgent credentials are managed as Cloudflare secrets. Category choices are read from the connected ${escapeHtml(environmentLabel)} company; no raw provider URL is required.</p><section class="accounting-mapping-status"><h2>${environmentLabel} invoice mapping</h2><dl class="accounting-connection-details">${mappingRow("Amount", mapping.amount)}${mappingRow("Item type", mapping.itemType)}${mappingRow("Category", mapping.category)}${mappingRow("Payment terms", mapping.paymentTerms)}${mappingRow("Currency", mapping.currency)}${mappingRow("VAT / sales tax", mapping.salesTax)}</dl></section><form method="post" action="/learn/admin/accounting/settings?environment=${environment}"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><div class="lesson-form-grid"><label>Lesson amount<input name="amount" inputmode="decimal" pattern="\\d+(\\.\\d{1,2})?" value="${escapeHtml(values.amount)}" required><span class="field-help">Normal lesson value: £55.00.</span></label><label>Currency<input name="currency" value="GBP" readonly aria-readonly="true"><span class="field-help">GBP is fixed by the accounting contract.</span></label><label>FreeAgent item type<input name="itemType" maxlength="240" value="${escapeHtml(values.itemType)}" required><span class="field-help">Hours is the established default.</span></label><label class="field-wide">FreeAgent accounting category${categoryField}${categoryHelp}</label><label>Payment terms (days)<input name="paymentTermsDays" type="number" min="0" max="365" step="1" value="${escapeHtml(values.paymentTermsDays)}" required><span class="field-help">The approved default is 0 days.</span></label><label>VAT / sales-tax rate<input name="salesTaxRate" inputmode="decimal" pattern="\\d+(\\.\\d{1,2})?" value="${escapeHtml(values.salesTaxRate)}" required><span class="field-help">0% means the established non-VAT setting.</span></label></div><div class="form-actions"><a class="button secondary" href="/learn/admin/accounting">Cancel</a><button class="button" type="submit">Save ${environmentLabel} billing settings</button></div></form></section>`;
}

function lessonReportForm(
  csrfToken: string,
  action: string,
  lesson: Lesson,
  student: Student,
  report: LessonReport | null,
  error?: string,
  resources: Resource[] = []
): string {
  const value = (key: keyof LessonReport): string => String(report?.[key] ?? "");
  const pupil = value("pupil_name") || student.name;
  const level = value("level") || student.level || "";
  const levelSuggestions = ["GCSE English", "Higher ESOL", "KS2", "KS3", "A Level Literature", "A Level Language", "N5 English", "Higher English", "N5 ESOL", "EAL", "CAE/CPE", "11+", "13+"];
  const levelOptions = levelSuggestions.map((suggestion) => `<button type="button" role="option" class="report-level-option" data-level-option="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`).join("");
  const levelControl = `<div class="report-level-combobox" data-level-combobox><label for="report-level">Level<input id="report-level" name="level" value="${escapeHtml(level)}" maxlength="120" required autocomplete="off" aria-autocomplete="list" aria-controls="report-level-options"></label><div id="report-level-options" class="report-level-options" role="listbox" hidden>${levelOptions}</div></div>`;
  const editor = (label: string, name: string, content: string, required = false, toolbarLabel = label || "Notes"): string => `<div class="report-editor" data-report-editor data-list-mode="bullet"><label>${label ? escapeHtml(label) : ""}<textarea name="${name}" rows="3" maxlength="12000"${required ? " required" : ""}>${escapeHtml(content)}</textarea></label><div class="report-toolbar" role="toolbar" aria-label="${escapeHtml(toolbarLabel)} formatting"><button type="button" class="report-tool report-list-mode is-active" data-report-format="list-bullet" aria-pressed="true" title="Bullet points"><svg class="report-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v2H5V5h2Zm4 0v2h10V5H11ZM7 11v2H5v-2h2Zm4 0v2h10v-2H11ZM7 17v2H5v-2h2Zm4 0v2h10v-2H11Z"/></svg></button><button type="button" class="report-tool report-list-mode" data-report-format="list-numbered" aria-pressed="false" title="Numbered list"><svg class="report-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 13V11H21V13H7M7 19V17H21V19H7M7 7V5H21V7H7M3 8V5H2V4H4V8H3M2 17V16H5V20H2V19H4V18.5H3V17.5H4V17H2M4.25 10A.75.75 0 0 1 5 10.75C5 10.95 4.92 11.14 4.79 11.27L3.12 13H5V14H2V13.08L4 11H2V10H4.25Z"/></svg></button><button type="button" class="report-tool" data-report-format="bold" title="Bold"><strong>B</strong></button><button type="button" class="report-tool report-tool-highlight" data-report-format="highlight" title="Yellow highlight">A</button></div></div>`;
  const notes = value("notes") || value("additional_notes");
  return `<section class="card form-card report-form"><h1>Lesson Report</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form id="lesson-report-form" method="post" action="${action}" enctype="multipart/form-data" data-report-attachment-form>${hiddenCsrf(csrfToken)}<div class="report-meta"><p><strong>Date</strong><br>${escapeHtml(reportDate(lesson))}</p><p><strong>Pupil</strong><br>${escapeHtml(pupil)}</p><p><strong>Time</strong><br>${escapeHtml(reportTime(lesson))}</p>${levelControl}</div><div class="report-feedback-form">${editor("This Lesson's Focus", "thisLessonsFocus", value("this_lessons_focus") || value("summary"), true)}${editor("Next Lesson's Focus", "nextLessonsFocus", value("next_lessons_focus"))}${editor("Even Better If", "evenBetterIf", value("even_better_if"))}${editor("Home Learning Task", "homeLearningTask", value("home_learning_task") || value("homework"))}<details class="report-notes-details"${notes ? " open" : ""}><summary>Notes</summary>${editor("", "notes", notes, false, "Notes")}</details></div>${reportAttachmentUploadForm(lesson, resources)}</form><div class="form-actions report-form-actions"><a class="button secondary" href="/learn/admin/lessons/${lessonRouteId(lesson.id)}">Cancel</a><div class="report-submit-actions"><button class="button secondary report-save-draft" data-report-save-draft type="submit" form="lesson-report-form" name="action" value="save">Save draft</button><button class="button" type="submit" form="lesson-report-form" name="action" value="send">Send report</button></div></div></section>`;
}

function reportAttachmentUploadForm(lesson: Lesson, resources: Resource[]): string {
  const id = `report-attachment-${lesson.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const attached = resources.filter((resource) => resource.status === "available" && !resource.deleted_at);
  const attachedList = attached.map((resource) => `<span class="report-attachment-chip" data-report-resource-chip><a href="/learn/admin/resources/${encodeURIComponent(resource.id)}/download">${escapeHtml(resource.original_filename)} <span>${escapeHtml(fileTypeLabel(resource.content_type))} · ${escapeHtml(resourceSize(resource.size_bytes))}</span></a><button type="button" data-report-resource-delete="${escapeHtml(`/learn/admin/resources/${encodeURIComponent(resource.id)}/delete`)}" aria-label="Remove ${escapeHtml(resource.original_filename)}" title="Remove attachment">×</button></span>`).join("");
  return `<section class="report-attachments"><input type="hidden" name="attachmentIdempotencyKey" value="${escapeHtml(crypto.randomUUID())}"><div class="report-attachments-grid${attached.length ? " has-files" : ""}" data-attachment-grid><div class="resource-file-dropzone" data-file-dropzone tabindex="0" role="button" aria-labelledby="${id}-label" aria-describedby="${id}-help"><span class="resource-file-icon" aria-hidden="true">↥</span><strong id="${id}-label">Drop a file here or <span class="resource-browse">Browse</span> to add lesson attachments</strong><span id="${id}-help" class="field-help">Up to 5 files · PDF · DOCX · TXT · PNG · JPEG · WEBP · Up to 25 MB each</span><input id="${id}" type="file" name="attachments" aria-label="Choose lesson attachments" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"></div><div class="report-attachment-list" data-report-attachment-list><output class="file-preview" data-file-preview hidden aria-live="polite"></output>${attachedList}</div></div><p class="upload-status" data-upload-status aria-live="polite"></p></section>`;
}

function calendarFeedUrl(request: Request, env: Env, token: string): string {
  const origin = (env.PUBLIC_ORIGIN ?? `${new URL(request.url).origin}/learn`).replace(/\/+$/, "");
  return `${origin}/calendar/feed/${token}`;
}

function calendarSubscriptionCard(csrfToken: string, action: string, feed: CalendarFeed | null, feedUrl?: string, open = false): string {
  const hasLink = Boolean(feedUrl);
  const link = hasLink
    ? `<div class="feed-link-row"><label class="sr-only" for="feed-link">Calendar URL</label><input id="feed-link" class="feed-link" readonly value="${escapeHtml(feedUrl ?? "")}" data-calendar-feed-link><button class="button secondary copy-link" type="button" data-copy-target="feed-link">Copy</button></div>`
    : "";
  const actionLabel = feed ? "Regenerate calendar link" : "Generate calendar link";
  return `<details class="card subscription-card" data-calendar-subscription${open ? " open" : ""}><summary><span>Calendar subscription</span><span class="subscription-chevron" aria-hidden="true"></span></summary><div class="subscription-content"><div class="subscription-panel">${link}<form method="post" action="${action}" data-calendar-regenerate>${hiddenCsrf(csrfToken)}<button class="button${hasLink ? " secondary" : ""}" type="submit">${actionLabel}</button></form></div></div></details>`;
}

function calendarFragmentResponse(subscriptionHtml: string, message: string): Response {
  const headers = privateHeaders("application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify({ subscriptionHtml, message }), { status: 200, headers });
}

function reportActionResponse(request: Request, payload: Record<string, unknown>, status = 200): Response | null {
  const fragmentHeader = request.headers.get("X-Report-Fragment") === "1";
  const fragmentQuery = new URL(request.url).searchParams.get("fragment") === "1";
  const acceptsJson = request.headers.get("Accept")?.includes("application/json") ?? false;
  if (!fragmentHeader && !fragmentQuery && !acceptsJson) return null;
  const headers = privateHeaders("application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}

async function currentCalendarFeedUrl(request: Request, env: Env, feed: CalendarFeed | null): Promise<string | undefined> {
  if (!feed?.token_ciphertext || !env.CALENDAR_FEED_ENCRYPTION_KEY) return undefined;
  const token = await decryptFeedToken(feed.token_ciphertext, env.CALENDAR_FEED_ENCRYPTION_KEY);
  return token ? calendarFeedUrl(request, env, token) : undefined;
}

function calendarPage(
  csrfToken: string,
  action: string,
  lessons: Lesson[],
  role: Role,
  feed: CalendarFeed | null,
  feedUrl?: string,
  open = false
): string {
  const title = role === "ADMIN" ? "Calendar" : "Calendar";
  const addLesson = role === "ADMIN" ? buttonLink("/learn/admin/lessons/new", "Add lesson") : "";
  return `<div class="calendar-page"><div class="page-heading"><div><h1>${title}</h1></div>${addLesson}</div>${calendarView(lessons, role)}${calendarSubscriptionCard(csrfToken, action, feed, feedUrl, open)}</div>`;
}

function statusLabel(status: LessonStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatLessonTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: lesson.timezone });
  const start = formatter.format(new Date(lesson.start_at));
  const end = formatter.format(new Date(lesson.end_at));
  return `${start}–${end.slice(end.indexOf(", ") + 2)}`;
}

function reportDate(lesson: Lesson): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: lesson.timezone }).format(new Date(lesson.start_at));
}

function reportDocumentTitle(lesson: Lesson): string {
  return reportDocumentTitleFromIsoDate(reportDateValue(lesson));
}

function reportDocumentTitleFromSnapshot(report: LessonReport): string {
  return reportDocumentTitleFromIsoDate(report.lesson_date);
}

function reportDateValue(lesson: Lesson): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: lesson.timezone }).formatToParts(new Date(lesson.start_at));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function reportTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: lesson.timezone });
  return formatter.format(new Date(lesson.start_at)).replace(" ", "").toUpperCase().replace(/:00(AM|PM)$/, "$1");
}

function reportSentAt(value: string, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone });
  return `Sent on ${formatter.format(new Date(value))}`;
}

function reportField(label: string, value: string): string {
  return `<section class="report-field"><h2>${escapeHtml(label)}</h2>${renderRichTextHtml(value)}</section>`;
}

function reportDocument(report: LessonReport, admin: boolean, csrfToken?: string, notice?: string): string {
  const view = reportViewModel(report);
  const resend = admin && csrfToken && report.status === "SENT"
    ? `<form class="report-resend-form" method="post" action="/learn/admin/lessons/${lessonRouteId(report.lesson_id)}/report">${hiddenCsrf(csrfToken)}<button class="button secondary" type="submit" name="action" value="resend">Resend report</button></form>`
    : "";
  return `<section class="card report-document">${notice ? `<p class="form-error" role="alert">${escapeHtml(notice)}</p>` : ""}<div class="report-heading"><div><h1>Lesson Report</h1></div><div class="form-actions"><a class="button secondary" href="${admin ? `/learn/admin/lessons/${lessonRouteId(report.lesson_id)}` : "/learn/student/lessons"}">Back</a><a class="button" href="/learn/${admin ? "admin" : "student"}/lessons/${lessonRouteId(report.lesson_id)}/report.pdf">Download PDF</a>${admin ? `<a class="button secondary" href="/learn/admin/lessons/${lessonRouteId(report.lesson_id)}/report">Edit</a>` : ""}</div></div><div class="report-meta"><p><strong>Date</strong><br>${escapeHtml(view.lessonDate)}</p><p><strong>Pupil</strong><br>${escapeHtml(view.pupilName)}</p><p><strong>Time</strong><br>${escapeHtml(view.lessonTime)}</p><p><strong>Level</strong><br>${escapeHtml(view.level)}</p></div><div class="report-feedback">${reportField("This Lesson's Focus", view.thisLessonsFocus)}${reportField("Next Lesson's Focus", view.nextLessonsFocus)}${reportField("Even Better If", view.evenBetterIf)}${reportField("Home Learning Task", view.homeLearningTask)}${view.notes ? reportField("Notes", view.notes) : ""}</div>${admin ? `<div class="report-delivery-row"><p class="report-delivery"><strong>${report.status === "SENT" && report.sent_at ? escapeHtml(reportSentAt(report.sent_at, report.lesson_timezone)) : report.status === "SENT" ? "Sent" : "Draft"}</strong></p>${resend}</div>` : ""}</section>`;
}

function formatCalendarLessonTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: lesson.timezone });
  return `${formatter.format(new Date(lesson.start_at))}–${formatter.format(new Date(lesson.end_at))}`;
}

function calendarView(lessons: Lesson[], role: Role): string {
  const basePath = role === "ADMIN" ? "/learn/admin/lessons" : "/learn/student/lessons";
  const showStudent = role === "ADMIN";
  const events = lessons.map((lesson) => {
    const displayTime = formatCalendarLessonTime(lesson);
    const title = showStudent ? lesson.student_name ?? "Student" : "Lesson";
    return {
      id: lesson.id,
      title,
      start: lesson.start_at,
      end: lesson.end_at,
      url: `${basePath}/${lessonRouteId(lesson.id)}`,
      classNames: [`lesson-status-${lesson.status}`],
      extendedProps: { displayTime, status: statusLabel(lesson.status) }
    };
  });
  return `<section class="calendar-shell" aria-label="${role === "ADMIN" ? "Admin lesson calendar" : "My lesson calendar"}"><div class="calendar-surface"><div id="calendar" class="calendar-host" data-calendar-role="${role}" data-calendar-timezone="${CALENDAR_TIMEZONE}" data-calendar-initial-date="${currentCalendarDate()}" data-calendar-events="${escapeHtml(JSON.stringify(events))}"></div></div></section>`;
}

function bookingDate(lesson: Lesson): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: lesson.timezone
  }).format(new Date(lesson.start_at));
}

function bookingTime(lesson: Lesson): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: lesson.timezone });
  return `${formatter.format(new Date(lesson.start_at))}–${formatter.format(new Date(lesson.end_at))}`;
}

function bookingDuration(lesson: Lesson): string {
  const minutes = Math.round((Date.parse(lesson.end_at) - Date.parse(lesson.start_at)) / 60_000);
  return `${minutes} minutes`;
}

function lessonReportEligible(lesson: Lesson, now = Date.now()): boolean {
  return lesson.status !== "cancelled" && Number.isFinite(Date.parse(lesson.start_at)) && Date.parse(lesson.start_at) <= now;
}

const LESSON_PAGE_SIZES = [12, 24, 48] as const;

function parseLessonPagination(url: URL): { page: number; pageSize: number } {
  const requestedSize = Number(url.searchParams.get("size"));
  const pageSize = LESSON_PAGE_SIZES.includes(requestedSize as (typeof LESSON_PAGE_SIZES)[number]) ? requestedSize : 12;
  const requestedPage = Number(url.searchParams.get("page"));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { page, pageSize };
}

function parseStudentSectionPagination(url: URL, pageParam: string, sizeParam: string): { page: number; pageSize: number } {
  const requestedSize = Number(url.searchParams.get(sizeParam));
  const pageSize = [12, 24, 48].includes(requestedSize) ? requestedSize : 12;
  const requestedPage = Number(url.searchParams.get(pageParam));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { page, pageSize };
}

function lessonRows(lessons: Lesson[], emptyHeading: string, emptyCopy: string, emptyAction?: string): string {
  if (!lessons.length) return `<div class="empty-state compact-empty"><h2>${escapeHtml(emptyHeading)}</h2><p>${escapeHtml(emptyCopy)}</p>${emptyAction ? `<a class="button" href="/learn/admin/lessons/new">${escapeHtml(emptyAction)}</a>` : ""}</div>`;
  return `<div class="table-wrap lesson-list-table"><table><thead><tr><th>Date</th><th>Time</th><th>Student</th><th>Duration</th><th>Status</th><th>Report</th><th>Action</th></tr></thead><tbody>${lessons.map((lesson) => `<tr><td data-label="Date">${escapeHtml(bookingDate(lesson))}</td><td data-label="Time"><a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}">${escapeHtml(bookingTime(lesson))}</a></td><td data-label="Student"><a href="/learn/admin/students/${encodeURIComponent(lesson.student_id)}">${escapeHtml(lesson.student_name ?? "Student")}</a></td><td data-label="Duration">${escapeHtml(bookingDuration(lesson))}</td><td data-label="Status"><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></td><td data-label="Report">${!lessonReportEligible(lesson) ? "—" : lesson.report_status === "SENT" ? `<a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}/report">View report</a>` : lesson.report_status === "DRAFT" ? `<a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}/report">Edit report</a>` : `<a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}/report">Create report</a>`}</td><td data-label="Action"><a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}">View</a></td></tr>`).join("")}</tbody></table></div>`;
}

function paginationControls(
  page: number,
  pageCount: number,
  label: string,
  hrefForPage: (page: number) => string,
  extraLinkClass = ""
): string {
  const linkClass = extraLinkClass ? ` ${extraLinkClass}` : "";
  const link = (nextPage: number, text: string, ariaLabel: string, disabled: boolean) =>
    disabled
      ? `<span class="pagination-link pagination-nav-link${linkClass} is-disabled" aria-disabled="true" aria-label="${ariaLabel}">${text}</span>`
      : `<a class="pagination-link pagination-nav-link${linkClass}" href="${hrefForPage(nextPage)}" aria-label="${ariaLabel}">${text}</a>`;
  return `<nav class="pagination" aria-label="${escapeHtml(label)} pagination">${link(page - 1, "‹", "Previous page", page <= 1)}<span class="pagination-page-label">Page ${page} of ${pageCount}</span>${link(page + 1, "›", "Next page", page >= pageCount)}</nav>`;
}

function lessonPagination(page: number, pageSize: number, total: number, path: string, label: string): string {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = total ? Math.min(page * pageSize, total) : 0;
  const hrefForPage = (nextPage: number) => `${path}?page=${nextPage}&size=${pageSize}`;
  return `<footer class="list-footer"><div class="result-range">Showing ${first}–${last} of ${total}</div>${paginationControls(page, pageCount, label, hrefForPage)}<form class="page-size-form" method="get" action="${path}"><label for="${label.toLowerCase().replaceAll(" ", "-")}-page-size">Show per page</label><select id="${label.toLowerCase().replaceAll(" ", "-")}-page-size" class="page-size-select" name="size" onchange="this.form.submit()">${LESSON_PAGE_SIZES.map((size) => `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`).join("")}</select><input type="hidden" name="page" value="1"><noscript><button class="button secondary" type="submit">Apply</button></noscript></form></footer>`;
}

function lessonList(lessons: Lesson[], total: number, page: number, pageSize: number, options: { path: string; label: string; title: string; emptyHeading: string; emptyCopy: string; emptyAction?: string }): string {
  return `<div class="page-heading"><h1>${escapeHtml(options.title)}</h1>${options.emptyAction ? buttonLink("/learn/admin/lessons/new", "Add lesson") : ""}</div>${lessonRows(lessons, options.emptyHeading, options.emptyCopy, options.emptyAction)}${lessonPagination(page, pageSize, total, options.path, options.label)}`;
}

function studentSectionPagination(page: number, pageSize: number, total: number, path: string, label: string, pageParam: string, sizeParam: string): string {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const hrefForPage = (nextPage: number) => `${path}?${pageParam}=${nextPage}&${sizeParam}=${pageSize}`;
  const sizes = [12, 24, 48];
  return `<footer class="list-footer student-section-pagination"><span class="result-range">${total ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, total)} of ${total}` : "0 results"}</span>${paginationControls(safePage, pageCount, label, hrefForPage)}<form class="page-size-form" method="get" action="${path}"><label for="${pageParam}-size">Show per page</label><select id="${pageParam}-size" class="page-size-select" name="${sizeParam}" onchange="this.form.submit()">${sizes.map((size) => `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`).join("")}</select><input type="hidden" name="${pageParam}" value="1"><noscript><button class="button secondary" type="submit">Apply</button></noscript></form></footer>`;
}

function parseResourcePagination(url: URL): { page: number; pageSize: number } {
  const requestedSize = Number(url.searchParams.get("size"));
  const pageSize = RESOURCE_PAGE_SIZES.includes(requestedSize as (typeof RESOURCE_PAGE_SIZES)[number]) ? requestedSize : 12;
  const requestedPage = Number(url.searchParams.get("page"));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { page, pageSize };
}

type ResourceFilters = {
  search: string;
  studentId: string;
  lessonId: string;
  type: string;
  added: "any" | "today" | "7" | "30";
  sort: "newest" | "oldest" | "filename-asc" | "filename-desc";
};

function parseResourceFilters(url: URL): ResourceFilters {
  const type = fileTypeFilterContentTypes(url.searchParams.get("type") ?? "") ? url.searchParams.get("type") ?? "" : "";
  const added = ["any", "today", "7", "30"].includes(url.searchParams.get("added") ?? "")
    ? url.searchParams.get("added") as ResourceFilters["added"]
    : "any";
  const sort = ["newest", "oldest", "filename-asc", "filename-desc"].includes(url.searchParams.get("sort") ?? "")
    ? url.searchParams.get("sort") as ResourceFilters["sort"]
    : "newest";
  return {
    search: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
    studentId: (url.searchParams.get("student") ?? "").trim().slice(0, 100),
    lessonId: (url.searchParams.get("lesson") ?? "").trim().slice(0, 100),
    type,
    added,
    sort
  };
}

function resourceCreatedAfter(added: ResourceFilters["added"], now = new Date()): string | undefined {
  if (added === "any") return undefined;
  const start = new Date(now);
  if (added === "today") {
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setTime(start.getTime() - Number(added) * 24 * 60 * 60 * 1000);
  }
  return start.toISOString();
}

function resourceListOptions(filters: ResourceFilters, page: number, pageSize: number): {
  limit: number;
  offset: number;
  search?: string;
  studentId?: string;
  lessonId?: string;
  contentTypes?: string[];
  createdAfter?: string;
  sort: ResourceFilters["sort"];
} {
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: filters.search || undefined,
    studentId: filters.studentId || undefined,
    lessonId: filters.lessonId || undefined,
    contentTypes: filters.type ? fileTypeFilterContentTypes(filters.type) ?? undefined : undefined,
    createdAfter: resourceCreatedAfter(filters.added),
    sort: filters.sort
  };
}

function resourceFilterQuery(filters: ResourceFilters, page?: number, pageSize?: number): string {
  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.studentId) query.set("student", filters.studentId);
  if (filters.lessonId) query.set("lesson", filters.lessonId);
  if (filters.type) query.set("type", filters.type);
  if (filters.added !== "any") query.set("added", filters.added);
  if (filters.sort !== "newest") query.set("sort", filters.sort);
  if (page && page > 1) query.set("page", String(page));
  if (pageSize && pageSize !== 12) query.set("size", String(pageSize));
  const value = query.toString();
  return value ? `?${value}` : "";
}

function resourceFilterHiddenInputs(filters: ResourceFilters, page: number, pageSize: number): string {
  const query = resourceFilterQuery(filters, page, pageSize);
  return Array.from(new URLSearchParams(query).entries()).map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join("");
}

function resourceDate(resource: Resource): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(resource.created_at));
}

function resourceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resourceLessonDate(startAt: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: CALENDAR_TIMEZONE }).format(new Date(startAt));
}

function resourceLessonLabel(resource: Resource): string {
  if (!resource.lesson_start_at) return "General student resource";
  const date = resourceLessonDate(resource.lesson_start_at);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: CALENDAR_TIMEZONE }).format(new Date(resource.lesson_start_at));
  const end = resource.lesson_end_at
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: CALENDAR_TIMEZONE }).format(new Date(resource.lesson_end_at))
    : null;
  return `${date} · ${end ? `${time}–${end}` : time}`;
}

function resourceSearchIcon(): string {
  return `<svg class="resource-search-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>`;
}

function resourceSortIcon(): string {
  return `<svg class="resource-sort-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg>`;
}

function resourceChoiceChevronIcon(): string {
  return `<svg class="resource-choice-chevron-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m2.25 4.25 3.75 3.5 3.75-3.5"></path></svg>`;
}

function resourceSuggestionsResponse(suggestions: Awaited<ReturnType<typeof listResourceSuggestions>>): Response {
  const headers = privateHeaders("application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(suggestions), { status: 200, headers });
}

function resourceIcon(name: "open" | "download" | "details" | "delete"): string {
  const paths = {
    open: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    details: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    delete: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>'
  } as const;
  return `<svg class="resource-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}

function resourceActionButtons(resource: Resource, admin: boolean): string {
  const base = `/learn/${admin ? "admin" : "student"}/resources/${encodeURIComponent(resource.id)}`;
  const filename = escapeHtml(resource.original_filename);
  const open = `<a class="resource-action" href="${base}/download" target="_blank" rel="noopener noreferrer" aria-label="Open ${filename}" title="Open">${resourceIcon("open")}</a>`;
  const download = `<a class="resource-action" href="${base}/download?download=1" aria-label="Download ${filename}" title="Download">${resourceIcon("download")}</a>`;
  if (!admin) return `<span class="resource-actions">${open}${download}</span>`;
  const details = `<a class="resource-action" href="${base}" aria-label="View details for ${filename}" title="Details">${resourceIcon("details")}</a>`;
  const deleteAction = `<button class="resource-action resource-action-danger" type="button" data-resource-delete-trigger="resource-delete-${encodeURIComponent(resource.id)}" data-resource-delete-confirm="Delete &quot;${filename}&quot;? This removes the resource from the student's portal." aria-label="Delete ${filename}" title="Delete">${resourceIcon("delete")}</button>`;
  return `<span class="resource-actions">${open}${download}${details}${deleteAction}</span>`;
}

function resourceRows(resources: Resource[], options: { admin?: boolean; csrfToken?: string; filtered?: boolean } = {}): string {
  if (!resources.length) {
    return options.filtered
      ? `<div class="empty-state compact-empty"><h2>No resources match your search or filters.</h2></div>`
      : `<div class="empty-state compact-empty"><h2>No resources yet.</h2><p>Add a document for a student or attach it to a lesson.</p><a class="button" href="/learn/admin/resources/new">Add resource</a></div>`;
  }

  const admin = options.admin === true;
  const checkColumn = admin ? "<th class=\"resource-select-column\"><span class=\"sr-only\">Select</span><input type=\"checkbox\" data-resource-select-all aria-label=\"Select all visible resources\"></th>" : "";
  const rows = resources.map((resource) => {
    const filename = escapeHtml(resource.original_filename);
      const deleteForm = admin
        ? `<form id="resource-delete-${encodeURIComponent(resource.id)}" method="post" action="/learn/admin/resources/${encodeURIComponent(resource.id)}/delete" class="resource-hidden-form" data-resource-delete-confirm="Delete &quot;${filename}&quot;? This removes the resource from the student's portal.">${hiddenCsrf(options.csrfToken ?? "")}</form>`
      : "";
    return `<tr>${admin ? `<td class="resource-select-column" data-label="Select"><input type="checkbox" name="resourceId" value="${escapeHtml(resource.id)}" form="resource-bulk-delete-form" data-resource-select aria-label="Select ${filename}"></td>` : ""}<td data-label="File"><strong class="resource-filename" title="${filename}">${filename}</strong><small class="resource-meta">${escapeHtml(fileTypeLabel(resource.content_type))} · ${escapeHtml(resourceSize(resource.size_bytes))}</small></td><td data-label="Student">${escapeHtml(resource.student_name ?? "Student")}</td><td data-label="Lesson">${escapeHtml(resourceLessonLabel(resource))}</td><td data-label="Uploaded">${escapeHtml(resourceDate(resource))}</td><td data-label="Actions">${resourceActionButtons(resource, admin)}${deleteForm}</td></tr>`;
  }).join("");
  return `<div class="table-wrap resource-list-table"><table><thead><tr>${checkColumn}<th>File</th><th>Student</th><th>Lesson</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function resourceChoice(
  field: string,
  label: string,
  value: string,
  currentValue: string,
  options: Array<{ value: string; label: string; detail?: string }>,
  disabled = false
): string {
  const current = options.find((option) => option.value === currentValue) ?? options[0];
  const listId = `resource-${field}-options`;
  const visibleLabel = current?.label ?? "Choose";
  const triggerValue = field === "sort"
    ? `${resourceSortIcon()}<span class="resource-choice-value">${escapeHtml(visibleLabel)}</span>`
    : `<span class="resource-choice-value">${escapeHtml(visibleLabel)}</span>`;
  return `<div class="resource-choice${disabled ? " is-disabled" : ""}">${label ? `<span class="resource-choice-label">${escapeHtml(label)}</span>` : ""}<button class="resource-choice-trigger" type="button" data-resource-choice-trigger="${escapeHtml(field)}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listId}" aria-label="${field === "sort" ? "Sort resources" : `${escapeHtml(label)} filter`}" title="${escapeHtml(visibleLabel)}"${disabled ? " disabled" : ""}>${triggerValue}${resourceChoiceChevronIcon()}</button><div class="resource-choice-menu" id="${listId}" role="listbox" data-resource-choice-menu="${escapeHtml(field)}" hidden>${(field === "student" || field === "lesson") ? `<label class="resource-choice-search"><span class="sr-only">Search ${field === "student" ? "students" : "lessons"}</span><input type="search" placeholder="Search ${field === "student" ? "students" : "lessons"}…" data-resource-choice-search="${escapeHtml(field)}" autocomplete="off"></label>` : ""}${options.map((option) => `<button type="button" role="option" class="resource-choice-option${option.value === currentValue ? " is-selected" : ""}" aria-selected="${option.value === currentValue ? "true" : "false"}" data-resource-filter-option="${escapeHtml(field)}" data-value="${escapeHtml(option.value)}"><span>${escapeHtml(option.label)}</span>${option.detail ? `<small>${escapeHtml(option.detail)}</small>` : ""}${field === "sort" && option.value === currentValue ? `<span class="resource-choice-check" aria-hidden="true">✓</span>` : ""}</button>`).join("")}</div></div>`;
}

function resourceFilterForm(filters: ResourceFilters, students: Student[], lessons: Lesson[]): string {
  const activeStudents = students.filter((student) => student.status === "ACTIVE");
  const studentOptions = [{ value: "", label: "All" }, ...activeStudents.map((student) => ({ value: student.id, label: student.name }))];
  const lessonOptions = filters.studentId
    ? [{ value: "", label: "All" }, ...lessons.filter((lesson) => lesson.student_id === filters.studentId).map((lesson) => ({ value: lesson.id, label: bookingDate(lesson), detail: lesson.student_name ?? "Lesson" }))]
    : [{ value: "", label: "Choose student" }];
  const fieldAttributes: Record<string, string> = {
    student: 'name="student"',
    lesson: 'name="lesson"',
    type: 'name="type"',
    added: 'name="added"',
    sort: 'name="sort"'
  };
  const hidden = (name: string, value: string) => `<input type="hidden" ${fieldAttributes[name]} value="${escapeHtml(value)}" data-resource-state="${name}">`;
  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "filename-asc", label: "Filename A–Z" },
    { value: "filename-desc", label: "Filename Z–A" }
  ];
  return `<form class="resource-finder-form" method="get" action="/learn/admin/resources" data-resource-finder><div class="resource-search-wrap"><label class="sr-only" for="resource-search">Search resources</label><span class="resource-search-icon" aria-hidden="true">${resourceSearchIcon()}</span><input id="resource-search" type="search" name="q" value="${escapeHtml(filters.search)}" placeholder="Search resources…" autocomplete="off" aria-autocomplete="list" aria-controls="resource-search-suggestions" aria-expanded="false" data-resource-search data-suggestion-url="/learn/admin/resources/search"><button class="resource-search-submit" type="submit" aria-label="Search">${resourceSearchIcon()}</button><div id="resource-search-suggestions" class="resource-suggestions" role="listbox" hidden></div></div>${hidden("student", filters.studentId)}${hidden("lesson", filters.lessonId)}${hidden("type", filters.type)}${hidden("added", filters.added === "any" ? "" : filters.added)}${hidden("sort", filters.sort === "newest" ? "" : filters.sort)}<div class="resource-finder-toolbar"><button class="resource-filter-trigger" type="button" data-resource-filter-toggle aria-expanded="false" aria-controls="resource-filter-panel">Filters</button><div class="resource-sort">${resourceChoice("sort", "", filters.sort, filters.sort, sortOptions)}</div></div><div id="resource-filter-panel" class="resource-filter-panel" data-resource-filter-panel hidden><div class="resource-filter-grid">${resourceChoice("student", "Student", filters.studentId, filters.studentId, studentOptions)}${resourceChoice("lesson", "Lesson", filters.lessonId, filters.lessonId, lessonOptions, !filters.studentId)}${resourceChoice("type", "File type", filters.type, filters.type, [{ value: "", label: "Any" }, { value: "pdf", label: "PDF" }, { value: "docx", label: "Word" }, { value: "text", label: "Text" }, { value: "image", label: "Image" }])}${resourceChoice("added", "Added", filters.added, filters.added, [{ value: "any", label: "Any" }, { value: "today", label: "Today" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }])}</div><a class="resource-clear-all" href="/learn/admin/resources">Clear all</a></div></form>`;
}

function resourceSelectionToolbar(): string {
  return `<div class="resource-selection-toolbar" data-resource-selection-toolbar hidden><span data-resource-selection-count>0 resources selected</span><button class="button danger" type="submit" form="resource-bulk-delete-form" data-resource-bulk-delete>${resourceIcon("delete")}<span>Delete selected</span></button></div>`;
}

function resourcePagination(page: number, pageSize: number, total: number, path: string, filters: ResourceFilters): string {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = total ? Math.min(page * pageSize, total) : 0;
  const baseQuery = resourceFilterQuery(filters);
  const hrefForPage = (nextPage: number) => `${path}${baseQuery}${baseQuery ? "&" : "?"}page=${nextPage}&size=${pageSize}`;
  return `<footer class="list-footer"><div class="result-range">Showing ${first}–${last} of ${total}</div>${paginationControls(page, pageCount, "Resources", hrefForPage)}<form class="page-size-form" method="get" action="${path}"><label for="resources-page-size">Show per page</label>${Array.from(new URLSearchParams(baseQuery).entries()).map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join("")}<select id="resources-page-size" class="page-size-select" name="size">${RESOURCE_PAGE_SIZES.map((size) => `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`).join("")}</select><input type="hidden" name="page" value="1"><noscript><button class="button secondary" type="submit">Apply</button></noscript></form></footer>`;
}

type ResourceFragment = {
  finderHtml: string;
  resultsHtml: string;
  url: string;
  total: number;
};

async function adminResourceFragment(db: D1Database, url: URL, csrfToken: string): Promise<ResourceFragment> {
  const { page, pageSize } = parseResourcePagination(url);
  const filters = parseResourceFilters(url);
  const students = await listActiveStudentsForResourceFilter(db, filters.studentId);
  const lessons = await listLessonsForResourceFilter(db, filters.studentId, filters.lessonId);
  const options = resourceListOptions(filters, page, pageSize);
  const total = await countResources(db, options);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const resources = await listResources(db, { ...options, offset: (safePage - 1) * pageSize });
  const hasFilters = Boolean(filters.search || filters.studentId || filters.lessonId || filters.type || filters.added !== "any");
  const resultHtml = `<p class="resource-result-count" data-resource-result-count role="status">${total} resource${total === 1 ? "" : "s"}</p>${resources.length ? resourceSelectionToolbar() : ""}<form id="resource-bulk-delete-form" method="post" action="/learn/admin/resources/bulk-delete">${hiddenCsrf(csrfToken)}${resourceFilterHiddenInputs(filters, safePage, pageSize)}</form>${resourceRows(resources, { admin: true, csrfToken, filtered: hasFilters })}${resourcePagination(safePage, pageSize, total, "/learn/admin/resources", filters)}`;
  return {
    finderHtml: `${resourceFilterForm(filters, students, lessons)}`,
    resultsHtml: resultHtml,
    url: `/learn/admin/resources${resourceFilterQuery(filters, safePage, pageSize)}`,
    total
  };
}

function resourceFragmentResponse(fragment: ResourceFragment): Response {
  const headers = privateHeaders("application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(fragment), { status: 200, headers });
}

function studentResourceResults(resources: Resource[], search: string): string {
  if (!resources.length) {
    return search
      ? `<div class="empty-state compact-empty"><h2>No resources match your search.</h2><a class="button secondary" href="/learn/student/resources">Clear search</a></div>`
      : `<div class="empty-state compact-empty"><h2>No resources yet.</h2><p>Your tutor's worksheets, notes, and other shared material will appear here.</p></div>`;
  }
  return `<p class="resource-result-count" data-resource-result-count role="status">${resources.length} resource${resources.length === 1 ? "" : "s"}</p><div class="resource-student-list">${resources.map((resource) => `<article class="card resource-student-item"><div><h2>${escapeHtml(resource.original_filename)}</h2><p>${escapeHtml(fileTypeLabel(resource.content_type))} · ${escapeHtml(resourceSize(resource.size_bytes))}${resource.lesson_start_at ? ` · ${escapeHtml(resourceLessonDate(resource.lesson_start_at))}` : ""}</p></div>${resourceActionButtons(resource, false)}</article>`).join("")}</div>`;
}

type ResourceUploadContext =
  | { kind: "generic"; studentId?: string; lessonId?: string; returnContext: "resources" }
  | { kind: "student"; student: Student; lessonId?: string; returnContext: "student" }
  | { kind: "lesson"; student: Student; lesson: Lesson; returnContext: "lesson" };

type ResourceUploadValues = {
  studentId?: string;
  lessonId?: string;
  idempotencyKey?: string;
  returnContext?: ResourceUploadContext["returnContext"];
};

function resourceContext(context: ResourceUploadContext): string {
  if (context.kind === "lesson") {
    return `<div class="resource-context" aria-label="Upload destination"><strong>${escapeHtml(context.student.name)}</strong><span>Lesson · ${escapeHtml(formatLessonTime(context.lesson))}</span></div>`;
  }
  if (context.kind === "student") {
    return `<div class="resource-context" aria-label="Upload destination"><strong>${escapeHtml(context.student.name)}</strong><span>General student resource</span></div>`;
  }
  return "";
}

function resourceReturnPath(context: ResourceUploadContext): string {
  if (context.kind === "lesson") return `/learn/admin/lessons/${lessonRouteId(context.lesson.id)}`;
  if (context.kind === "student") return `/learn/admin/students/${encodeURIComponent(context.student.id)}`;
  return "/learn/admin/resources";
}

function resourceUploadForm(
  csrfToken: string,
  students: Student[],
  lessons: Lesson[],
  context: ResourceUploadContext,
  error?: string,
  values: ResourceUploadValues = {}
): string {
  const activeStudents = students.filter((student) => student.status === "ACTIVE");
  const activeLessons = lessons.filter((lesson) => activeStudents.some((student) => student.id === lesson.student_id));
  const availableLessons = context.kind === "generic" ? activeLessons : activeLessons.filter((lesson) => lesson.student_id === context.student.id);
  const idempotencyKey = values.idempotencyKey ?? crypto.randomUUID();
  const contextualStudent = context.kind !== "generic";
  const selectedStudentId = context.kind === "generic" ? values.studentId : context.student.id;
  const selectedLessonId = context.kind === "lesson" ? context.lesson.id : values.lessonId;
  const studentControl = contextualStudent
    ? `<input type="hidden" name="studentId" value="${escapeHtml(selectedStudentId ?? "")}">`
    : `<label for="resource-student">Student<select id="resource-student" name="studentId" required><option value="">Choose a student</option>${activeStudents.map((student) => `<option value="${escapeHtml(student.id)}"${student.id === selectedStudentId ? " selected" : ""}>${escapeHtml(student.name)}</option>`).join("")}</select></label>`;
  const lessonControl = context.kind === "lesson"
    ? `<input type="hidden" name="lessonId" value="${escapeHtml(context.lesson.id)}">`
    : `<label for="resource-lesson">Lesson <span class="muted">(optional)</span><select id="resource-lesson" name="lessonId" data-resource-lesson-select><option value="">General student resource</option>${availableLessons.map((lesson) => `<option value="${escapeHtml(lesson.id)}" data-student-id="${escapeHtml(lesson.student_id)}"${lesson.id === selectedLessonId ? " selected" : ""}>${escapeHtml(lesson.student_name ?? "Lesson")} · ${escapeHtml(bookingDate(lesson))}</option>`).join("")}</select></label>`;
  const contextDisplay = context.kind === "generic" ? "" : `<div class="resource-context-wrap">${resourceContext(context)}</div>`;
  const formFields = context.kind === "generic"
    ? `<div class="resource-fields">${studentControl}${lessonControl}</div>`
    : `${studentControl}${context.kind === "student" ? `<div class="resource-optional-lesson">${lessonControl}</div>` : lessonControl}`;
  return `<section class="resource-upload"><div class="resource-upload-heading"><h1>Add resource</h1><p class="lede">Add a document for a student or attach it to a lesson.</p></div>${contextDisplay}${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form class="resource-upload-form" method="post" action="/learn/admin/resources/new" enctype="multipart/form-data" data-return-context="${escapeHtml(context.returnContext)}">${hiddenCsrf(csrfToken)}<input type="hidden" name="idempotencyKey" value="${escapeHtml(idempotencyKey)}"><input type="hidden" name="returnContext" value="${escapeHtml(context.returnContext)}">${formFields}<div class="resource-file-section"><span class="resource-field-label">File</span><div class="resource-file-dropzone" data-file-dropzone tabindex="0" role="button" aria-labelledby="resource-file-label" aria-describedby="resource-file-help"><span class="resource-file-icon" aria-hidden="true">↥</span><strong id="resource-file-label">Drop a file here or <span class="resource-browse">Browse</span></strong><span id="resource-file-help" class="field-help">PDF · DOCX · TXT · PNG · JPEG · WEBP · Up to 25 MB</span><input id="resource-file-input" type="file" name="file" aria-label="Choose resource file" required accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"><output class="file-preview" data-file-preview aria-live="polite"></output></div></div><p class="upload-status" data-upload-status aria-live="polite"></p><div class="form-actions"><a class="button secondary" href="${resourceReturnPath(context)}">Cancel</a><button class="button" type="submit">Upload resource</button></div></form></section>`;
}

function resourceSummary(resource: Resource, admin: boolean, csrfToken: string): string {
 const lesson = resource.lesson_start_at ? `Lesson · ${resourceLessonLabel(resource)}` : "General student resource";
 const base = `/learn/${admin ? "admin" : "student"}/resources/${encodeURIComponent(resource.id)}`;
 const actionBar = `<div class="resource-detail-actions"><a class="button" href="${base}/download" target="_blank" rel="noopener noreferrer">${resourceIcon("open")}<span>Open</span></a><a class="button secondary" href="${base}/download?download=1">${resourceIcon("download")}<span>Download</span></a>${admin ? `<details class="delete-confirmation"><summary>${resourceIcon("delete")}<span>Delete</span></summary><p>Delete “${escapeHtml(resource.original_filename)}”? This removes the resource from the student's portal.</p><form method="post" action="${base}/delete">${hiddenCsrf(csrfToken)}<button class="button danger" type="submit">Delete resource</button></form></details>` : ""}</div>`;
 return `<section class="card resource-detail"><div class="page-heading"><div><h1>${escapeHtml(resource.original_filename)}</h1><p class="lede">${escapeHtml(fileTypeLabel(resource.content_type))} · ${escapeHtml(resourceSize(resource.size_bytes))}</p></div></div>${actionBar}<div class="detail-grid"><p><strong>Student</strong><br>${escapeHtml(resource.student_name ?? "Student")}</p><p><strong>Lesson</strong><br>${escapeHtml(lesson)}</p><p><strong>Uploaded</strong><br>${escapeHtml(resourceDate(resource))}</p>${resource.page_count ? `<p><strong>Pages</strong><br>${resource.page_count}</p>` : ""}</div></section>`;
}

function lessonRow(lesson: Lesson, basePath: string, showStudent: boolean): string {
  const report = !lessonReportEligible(lesson)
    ? "—"
    : lesson.report_status === "SENT"
      ? `<a href="${basePath}/${lessonRouteId(lesson.id)}/report">View report</a>`
      : showStudent
        ? "No report available"
        : `<a href="/learn/admin/lessons/${lessonRouteId(lesson.id)}/report">Create report</a>`;
  const primary = showStudent
    ? `<a href="/learn/admin/students/${encodeURIComponent(lesson.student_id)}">${escapeHtml(lesson.student_name ?? "Student")}</a>`
    : `<a href="${basePath}/${lessonRouteId(lesson.id)}">View lesson</a>`;
  return `<tr><td data-label="${showStudent ? "Student" : "Lesson"}">${primary}</td><td data-label="Date and time"><a href="${basePath}/${lessonRouteId(lesson.id)}">${escapeHtml(formatLessonTime(lesson))}</a></td><td data-label="Status"><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></td><td data-label="Report">${report}</td></tr>`;
}

function lessonTable(lessons: Lesson[], basePath: string, showStudent: boolean): string {
  if (!lessons.length) return `<p class="muted">No lessons yet.</p>`;
  return `<div class="table-wrap"><table class="lesson-table"><thead><tr>${showStudent ? "<th>Student</th>" : "<th>Lesson</th>"}<th>Date and time</th><th>Status</th><th>Report</th></tr></thead><tbody>${lessons.map((lesson) => lessonRow(lesson, basePath, showStudent)).join("")}</tbody></table></div>`;
}

function studentRows(students: Student[]): string {
  if (!students.length) return `<p class="muted">No students yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Level</th><th>International</th><th>Status</th><th>Actions</th></tr></thead><tbody>${students.map((student) => `<tr><td data-label="Name"><a href="/learn/admin/students/${encodeURIComponent(student.id)}">${escapeHtml(student.name)}</a></td><td data-label="Email">${escapeHtml(student.email)}</td><td data-label="Level">${escapeHtml(student.level ?? "Not set")}</td><td data-label="International">${student.international ? "Yes" : "No"}</td><td data-label="Status"><span class="status status-${student.status.toLowerCase()}">${student.status === "ACTIVE" ? "Active" : "Inactive"}</span></td><td data-label="Actions"><a href="/learn/admin/students/${encodeURIComponent(student.id)}/edit">Edit</a></td></tr>`).join("")}</tbody></table></div>`;
}

function hiddenCsrf(csrfToken: string): string {
  return `<input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}">`;
}

function billingConsequenceLabel(value: string | null): string {
  const labels: Record<string, string> = {
    NO_CHARGE: "No charge",
    CANCELLATION_PENDING_DECISION: "Pending decision",
    EXCEPTION_WAIVED: "Exception waived",
    ADMIN_CANCELLED: "Admin cancellation",
    RESCHEDULED: "Rescheduled"
  };
  return value ? labels[value] ?? value : "—";
}

function historyLabel(eventType: LessonHistory["event_type"]): string {
  return {
    STUDENT_CANCELLED: "Student cancelled lesson",
    CANCELLATION_REQUESTED: "Student requested cancellation",
    CANCELLATION_APPROVED: "Cancellation approved",
    CANCELLATION_REJECTED: "Cancellation request rejected",
    CANCELLATION_UNDONE: "Student restored lesson",
    ADMIN_CANCELLED: "Admin cancelled lesson",
    RESCHEDULED: "Lesson rescheduled"
  }[eventType];
}

function lessonHistorySection(history: LessonHistory[]): string {
  if (!history.length) return `<section class="card"><h2>History</h2><p class="muted">No cancellation or reschedule history.</p></section>`;
  const rows = history.map((event) => {
    const previous = event.previous_start_at && event.previous_end_at && event.previous_timezone
      ? `<div><strong>Previous</strong><br>${escapeHtml(formatLessonTime({ start_at: event.previous_start_at, end_at: event.previous_end_at, timezone: event.previous_timezone } as Lesson))}</div>`
      : "";
    const next = event.new_start_at && event.new_end_at && event.new_timezone
      ? `<div><strong>New</strong><br>${escapeHtml(formatLessonTime({ start_at: event.new_start_at, end_at: event.new_end_at, timezone: event.new_timezone } as Lesson))}</div>`
      : "";
    return `<article class="history-entry"><div><strong>${escapeHtml(historyLabel(event.event_type))}</strong><small>${escapeHtml(event.created_at)} · ${escapeHtml(event.actor_name ?? event.actor_role)}</small></div><div class="history-detail">${previous}${next}${event.reason ? `<div><strong>Reason</strong><br>${escapeHtml(event.reason)}</div>` : ""}${event.billing_consequence ? `<div><strong>Billing</strong><br>${escapeHtml(billingConsequenceLabel(event.billing_consequence))}</div>` : ""}</div></article>`;
  }).join("");
  return `<section class="card"><h2>History</h2><div class="history-list">${rows}</div></section>`;
}

function studentLessonActions(lesson: Lesson, csrfToken: string, pending: RescheduleRequest | null, canUndo: boolean, now: string): string {
  if (lesson.status === "cancelled") {
    return canUndo
      ? `<div class="form-actions lesson-actions"><a class="button secondary" href="/learn/student/lessons/${lessonRouteId(lesson.id)}/undo-cancellation">Undo cancellation</a></div>`
      : "";
  }
  if (lesson.status !== "scheduled") return "";
  const cancellation = canStudentCancel(lesson, now);
  const started = Date.parse(lesson.start_at) <= Date.parse(now);
  if (started) return "";
  const actions: string[] = [];
  if (cancellation) {
    actions.push(buttonLink(`/learn/student/lessons/${lessonRouteId(lesson.id)}/cancel`, "Cancel lesson"));
    actions.push(buttonLink(`/learn/student/lessons/${lessonRouteId(lesson.id)}/reschedule`, "Reschedule"));
  } else if (pending) {
    actions.push(`<span class="status status-pending">Reschedule request pending</span>`);
  } else {
    actions.push(`<span class="button secondary disabled-action" aria-disabled="true" tabindex="0" title="Lessons cannot be cancelled within 24 hours.">Cancel lesson</span>`);
    actions.push(buttonLink(`/learn/student/lessons/${lessonRouteId(lesson.id)}/reschedule`, "Request reschedule"));
  }
  return `<div class="form-actions lesson-actions">${actions.join("")}</div>`;
}

function cancellationConfirmation(csrfToken: string, lesson: Lesson): string {
  return `<section class="card form-card"><h1>Cancel this lesson?</h1><p class="lede">${escapeHtml(formatLessonTime(lesson))}</p><p>The lesson will be cancelled immediately.</p><form method="post" action="/learn/student/lessons/${lessonRouteId(lesson.id)}/cancel" class="form-actions">${hiddenCsrf(csrfToken)}<a class="button secondary" href="/learn/student/lessons/${lessonRouteId(lesson.id)}">Keep lesson</a><button class="button danger" type="submit">Cancel lesson</button></form></section>`;
}

function undoCancellationConfirmation(csrfToken: string, lesson: Lesson): string {
  return `<section class="card form-card"><h1>Restore this lesson?</h1><p class="lede">${escapeHtml(formatLessonTime(lesson))}</p><p>This will put the lesson back on your schedule.</p><form method="post" action="/learn/student/lessons/${lessonRouteId(lesson.id)}/undo-cancellation" class="form-actions">${hiddenCsrf(csrfToken)}<a class="button secondary" href="/learn/student/lessons/${lessonRouteId(lesson.id)}">Keep cancelled</a><button class="button" type="submit">Restore lesson</button></form></section>`;
}

function studentRescheduleWindow(lesson: Lesson): { minDate: string; maxDate: string } {
  const minDate = isoToLocalDateTime(lesson.start_at, lesson.timezone).slice(0, 10);
  const base = new Date(`${minDate}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + 7);
  return { minDate, maxDate: base.toISOString().slice(0, 10) };
}

function studentRescheduleFormFields(lesson: Lesson): string {
  const { minDate, maxDate } = studentRescheduleWindow(lesson);
  const hours = Array.from({ length: 13 }, (_, index) => index + 9)
    .map((hour) => `<option value="${String(hour).padStart(2, "0")}:00">${hour}:00</option>`)
    .join("");
  return `<label>Date<input type="date" name="requestDate" min="${minDate}" max="${maxDate}" value="${minDate}" required><span class="field-help">Choose a date within one week of the original lesson.</span></label><label>Start time<select name="requestHour" required>${hours}</select><span class="field-help">Hourly starts from 09:00 to 21:00.</span></label>`;
}

function studentRequestedRescheduleTime(form: FormData, lesson: Lesson): { start: string | null; end: string | null; error?: string } {
  const date = formText(form, "requestDate").trim();
  const hour = formText(form, "requestHour").trim();
  const { minDate, maxDate } = studentRescheduleWindow(lesson);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minDate || date > maxDate) {
    return { start: null, end: null, error: "Choose a date within one week of the original lesson." };
  }
  if (!/^(?:09|1[0-9]|20|21):00$/.test(hour)) return { start: null, end: null, error: "Choose an hourly start time between 09:00 and 21:00." };
  const start = localDateTimeToIso(`${date}T${hour}`, lesson.timezone);
  if (!start.value) return { start: null, end: null, error: start.error ?? "Choose a valid start time." };
  const end = new Date(Date.parse(start.value) + STANDARD_LESSON_DURATION_MINUTES * 60_000).toISOString();
  return { start: start.value, end };
}

function rescheduleForm(csrfToken: string, lesson: Lesson, action: string, error?: string, requestMode = false, studentMode = false): string {
  const start = isoToLocalDateTime(lesson.start_at, lesson.timezone);
  const end = isoToLocalDateTime(lesson.end_at, lesson.timezone);
  const fields = studentMode
    ? studentRescheduleFormFields(lesson)
    : `${inputField("Start", "startAt", start, "datetime-local", true)}${inputField("End", "endAt", end, "datetime-local", true)}<input type="hidden" name="timezone" value="${escapeHtml(lesson.timezone)}">`;
  const note = requestMode ? "<p>Your tutor will review the requested time before the lesson is changed.</p>" : "";
  return `<section class="card form-card"><h1>${studentMode ? "Choose a new lesson time" : "Reschedule lesson"}</h1>${note}${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}${fields}<div class="form-actions"><a class="button secondary" href="/learn/${action.includes("/admin/") ? "admin" : "student"}/lessons/${lessonRouteId(lesson.id)}">Keep current time</a><button class="button" type="submit">${requestMode ? "Submit request" : "Confirm reschedule"}</button></div></form></section>`;
}

function rescheduleQueue(requests: RescheduleRequest[], csrfToken: string): string {
  if (!requests.length) return `<section class="card empty-state compact-empty"><h2>No pending reschedule requests</h2><p>Student requests will appear here for review.</p></section>`;
  const rows = requests.map((request) => {
    const requested = formatLessonTime({ start_at: request.requested_start_at, end_at: request.requested_end_at, timezone: request.requested_timezone } as Lesson);
    const current = request.lesson_start_at
      ? formatLessonTime({ start_at: request.lesson_start_at, end_at: request.lesson_end_at ?? request.lesson_start_at, timezone: request.lesson_timezone ?? "Europe/London" } as Lesson)
      : "Lesson";
    return `<tr><td data-label="Student">${escapeHtml(request.student_name ?? "Student")}</td><td data-label="Current"><a href="/learn/admin/lessons/${lessonRouteId(request.lesson_id)}">${escapeHtml(current)}</a></td><td data-label="Requested">${escapeHtml(requested)}</td><td data-label="Requested at">${escapeHtml(request.created_at)}</td><td data-label="Actions"><div class="form-actions"><details class="decision-confirmation"><summary class="button">Approve</summary><p>This will move the lesson to the requested time.</p><form method="post" action="/learn/admin/reschedules/${encodeURIComponent(request.id)}/approve">${hiddenCsrf(csrfToken)}<button class="button" type="submit">Approve</button></form></details><details class="decision-confirmation"><summary class="button secondary">Reject</summary><p>The lesson will remain at its current time.</p><form method="post" action="/learn/admin/reschedules/${encodeURIComponent(request.id)}/reject">${hiddenCsrf(csrfToken)}<button class="button secondary" type="submit">Reject</button></form></details></div></td></tr>`;
  }).join("");
  return `<section class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Current</th><th>Requested</th><th>Requested at</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function inputField(label: string, name: string, value: string, type = "text", required = false): string {
  return `<label>${escapeHtml(label)}<input type="${type}" name="${name}" value="${escapeHtml(value)}"${required ? " required" : ""}></label>`;
}

function infoTip(text: string): string {
  const safeText = escapeHtml(text);
  return `<span class="field-info" tabindex="0" role="img" aria-label="${safeText}" data-tooltip="${safeText}">i</span>`;
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
  const international = student?.international ? " checked" : "";
  const system = student?.academic_year_system ?? "";
  const academicYear = student?.academic_year ?? "";
  const academicOptions = [
    ["ENGLISH", "English", ["Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13"]],
    ["SCOTTISH", "Scottish", ["P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"]],
    ["MATURE", "Mature", ["Mature"]],
    ["PRIVATE", "Private", ["Private"]],
    ["INTERNATIONAL", "International", ["International"]]
  ] as const;
  const academicSystemOptions = `<option value="">Choose a system</option>${academicOptions.map(([value, label]) => `<option value="${value}"${value === system ? " selected" : ""}>${label}</option>`).join("")}`;
  const academicYearOptionsMarkup = academicOptions.flatMap(([systemValue, , values]) => values.map((value) => `<option value="${value}" data-academic-system="${systemValue}"${value === academicYear ? " selected" : ""}>${value}</option>`)).join("");
  const dynamicAcademicSystem = system === "ENGLISH" || system === "SCOTTISH";
  const levelSuggestions = ["KS2", "KS3", "GCSE", "N5", "Higher", "A Level", "University", "ESOL", "EAL"];
  return `<section class="card form-card"><h1>${student ? "Edit student" : "Create student"}</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}" data-student-profile-form>${hiddenCsrf(csrfToken)}<div class="student-form-grid"><label>Pupil name<input type="text" name="name" value="${escapeHtml(student?.name ?? "")}" required></label><label>Pupil email ${infoTip("This is the email address the pupil uses to log in to Learn.")}<input type="email" name="email" value="${escapeHtml(student?.email ?? "")}" required autocomplete="email"></label><label>Parent or carer name<input type="text" name="parentName" value="${escapeHtml(student?.parent_name ?? "")}" maxlength="200" autocomplete="name"></label><label>Parent or carer email<input type="email" name="parentEmail" value="${escapeHtml(student?.parent_email ?? "")}" autocomplete="email"></label><label>Level ${infoTip("Used by lesson reports and updated when a report records a different level.")}<input list="student-level-options" name="level" value="${escapeHtml(student?.level ?? "")}" maxlength="120"><datalist id="student-level-options">${levelSuggestions.map((value) => `<option value="${value}"></option>`).join("")}</datalist></label><label>Academic system ${infoTip("Choose English or Scottish for automatic year progression. Mature, Private and International do not use an academic year.")}<select name="academicYearSystem" data-academic-system>${academicSystemOptions}</select></label><label data-academic-year-field${dynamicAcademicSystem ? "" : " hidden"}>Academic year ${infoTip("English and Scottish years advance automatically each 15 August.")}<select name="academicYear" data-academic-year${dynamicAcademicSystem ? "" : " disabled"}>${academicYearOptionsMarkup}</select></label></div><label class="field-wide">Billing address<textarea name="billingAddress" rows="3" maxlength="2000">${escapeHtml(student?.billing_address ?? "")}</textarea></label><label class="field-wide">Class texts ${infoTip("Optional texts to remember for GCSE, A Level, N5 or Higher students.")}<textarea name="classTexts" rows="3" maxlength="5000" placeholder="For example: Macbeth; Of Mice and Men">${escapeHtml(student?.class_texts ?? "")}</textarea></label><label class="field-wide">Additional support needs<textarea name="additionalSupportNeeds" rows="3" maxlength="5000">${escapeHtml(student?.additional_support_needs ?? "")}</textarea></label><div class="student-dst-field"><label class="toggle-control student-dst-toggle"><input type="checkbox" name="international" value="1"${international}><span>International pupil ${infoTip("Enables the UK clock-change reminder for this pupil. It does not select the academic system.")}</span></label></div><div class="form-actions"><a class="button secondary" href="/learn/admin/students">Cancel</a><button class="button" type="submit">Save student</button></div></form></section>`;
}

function parseStudentProfile(form: FormData, now: string): {
  value: {
    name: string;
    email: string;
    level: string | null;
    parentName: string;
    parentEmail: string;
    billingAddress: string;
    additionalSupportNeeds: string;
    academicYearSystem: StudentAcademicSystem;
    academicYear: string;
    academicYearAnchorDate: string | null;
    classTexts: string;
    international: boolean;
  } | null;
  error?: string;
} {
  const name = validName(formText(form, "name"));
  const email = validEmail(formText(form, "email"));
  const levelInput = formText(form, "level").trim();
  const level = validLevel(levelInput);
  const parentName = formText(form, "parentName").trim();
  const parentInput = formText(form, "parentEmail").trim();
  const parentEmail = parentInput ? validEmail(parentInput) ?? "" : "";
  const billingAddress = formText(form, "billingAddress").trim();
  const additionalSupportNeeds = formText(form, "additionalSupportNeeds").trim();
  const classTexts = formText(form, "classTexts").trim();
  const systemValue = formText(form, "academicYearSystem").trim();
  const academicYearSystem = systemValue ? (isStudentAcademicSystem(systemValue) ? systemValue : null) : "PRIVATE";
  const academicYear = academicYearSystem ? validateAcademicYear(academicYearSystem, formText(form, "academicYear")) : null;
  if (!name || !email || parentName.length > 200 || (levelInput && level === null) || (parentInput && !parentEmail) || !academicYearSystem || !academicYear) {
    return { value: null, error: "Enter valid student details, including a valid academic system and academic year." };
  }
  if (billingAddress.length > 2000 || additionalSupportNeeds.length > 5000 || classTexts.length > 5000) {
    return { value: null, error: "Billing address, support needs, and class texts must be within their character limits." };
  }
  return {
    value: {
      name,
      email,
      level,
      parentName,
      parentEmail,
      billingAddress,
      additionalSupportNeeds,
      academicYearSystem,
      academicYear,
      academicYearAnchorDate: academicYearSystem === "ENGLISH" || academicYearSystem === "SCOTTISH" ? now.slice(0, 10) : null,
      classTexts,
      international: form.has("international")
    }
  };
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
    return `<section class="card form-card"><h1>Create lesson</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form class="lesson-create-form" method="post" action="${action}" data-timezone="Europe/London" data-duration-minutes="${STANDARD_LESSON_DURATION_MINUTES}">${hiddenCsrf(csrfToken)}<div class="lesson-form-grid">${studentSelect}<label>Date<input type="date" name="lessonDate" value="${escapeHtml(selected.date)}" required></label><label>Start time<input type="time" name="startTime" value="${escapeHtml(selected.time)}" step="900" lang="en-GB" required aria-describedby="start-time-help"><span id="start-time-help" class="field-help">15-minute intervals · 24-hour time</span></label><div class="derived-time" aria-live="polite"><span>Duration / end time</span><strong>${STANDARD_LESSON_DURATION_MINUTES} minutes · Ends <output data-end-preview>${escapeHtml(preview)}</output></strong></div><div class="timezone-context"><span>Timezone</span><strong>Europe/London</strong></div><label class="field-wide">Lesson link<input type="url" name="externalUrl" value="" placeholder="https://"></label><details class="additional-details"><summary>Additional details</summary><label>Notes<textarea name="notes" rows="4" maxlength="10000"></textarea></label></details></div><input type="hidden" name="timezone" value="Europe/London"><input type="hidden" name="status" value="scheduled"><div class="form-actions"><a class="button secondary" href="/learn/admin/lessons">Cancel</a><button class="button" type="submit">Create lesson</button></div></form></section>`;
  }
  return `<section class="card form-card"><h1>Edit lesson</h1>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="${action}">${hiddenCsrf(csrfToken)}<div class="lesson-form-grid">${studentSelect}${inputField("Start", "startAt", start, "datetime-local", true)}${inputField("End", "endAt", end, "datetime-local", true)}${inputField("Timezone (IANA)", "timezone", timezone, "text", true)}${inputField("Lesson link", "externalUrl", lesson.external_url ?? "", "url")}<label class="field-wide">Notes<textarea name="notes" rows="4" maxlength="10000">${escapeHtml(lesson.notes)}</textarea></label></div><input type="hidden" name="status" value="${escapeHtml(lesson.status)}"><div class="form-actions"><button class="button" type="submit">Save lesson</button> <a class="button secondary" href="/learn/admin/lessons">Cancel</a></div></form></section>`;
}

async function parseForm(request: Request): Promise<FormData | null> {
  const contentType = request.headers.get("content-type") ?? "";
  const isUrlEncoded = contentType.includes("application/x-www-form-urlencoded");
  const isMultipart = contentType.includes("multipart/form-data");
  if (!isUrlEncoded && !isMultipart) return null;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > (isMultipart ? MAX_RESOURCE_SIZE_BYTES + 1_048_576 : 96_000)) return null;
  try {
    return await request.clone().formData();
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
  const match = /^\/learn\/(?:admin\/lessons|student\/lessons)\/([^/]+)(?:\/(?:edit|status|cancel|undo-cancellation|reschedule|report(?:\.pdf)?))?$/.exec(pathname.replace(/\/+$/, ""));
  const segment = match ? decodePathSegment(match[1]) : null;
  return segment ? lessonIdFromUrlKey(segment) : null;
}

function rescheduleRequestIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/admin\/reschedules\/([^/]+)\/(?:approve|reject)$/.exec(pathname.replace(/\/+$/, ""));
  return match ? decodePathSegment(match[1]) : null;
}

function notificationIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/admin\/notifications\/([^/]+)$/.exec(pathname.replace(/\/+$/, ""));
  return match ? decodePathSegment(match[1]) : null;
}

function accountingOutboxIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/admin\/accounting\/([^/]+)(?:\/(?:retry|reconcile))?$/.exec(pathname.replace(/\/+$/, ""));
  return match ? decodePathSegment(match[1]) : null;
}

function lessonRouteId(id: string): string {
  return encodeURIComponent(lessonUrlKey(id));
}

function resourceIdFromPath(pathname: string): string | null {
  const match = /^\/learn\/(?:admin|student)\/resources\/([^/]+)(?:\/(?:download|delete))?$/.exec(pathname.replace(/\/+$/, ""));
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

function freeAgentOAuthFailure(error: unknown, environment: FreeAgentEnvironment): Response {
  const diagnostic = error instanceof FreeAgentApiError
    ? { code: error.shape.code, status: error.shape.status, message: error.shape.message }
    : { code: "UNKNOWN", status: null, message: "Unexpected OAuth callback failure." };
  console.error("FreeAgent OAuth callback failed", diagnostic);
  const label = freeAgentEnvironmentLabel(environment);
  const failureMessage = diagnostic.message.toLowerCase().includes("token exchange")
    ? `${label} FreeAgent token exchange failed.`
    : diagnostic.message.toLowerCase().includes("company")
      ? `${label} FreeAgent company verification failed.`
      : diagnostic.message.toLowerCase().includes("token persistence")
        ? `${label} FreeAgent token could not be saved.`
        : diagnostic.message.toLowerCase().includes("connection persistence")
          ? `${label} FreeAgent connection could not be saved.`
          : `${label} FreeAgent authorization failed.`;
  return messagePage(`${label} FreeAgent authorization failed`, failureMessage, 502);
}

async function handleAccountingOAuthCallback(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return messagePage("Service unavailable", "The Learn database is not configured for this environment.", 503);
  const db = env.DB;
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code) {
    console.error("FreeAgent OAuth state validation failed", { stage: "state validation", reason: "missing callback parameters" });
    return messagePage("FreeAgent authorization failed", "FreeAgent did not return an authorization code.", 400);
  }
  const consumed = await consumeAccountingOAuthState(db, await hashOAuthState(state), new Date().toISOString());
  if (!consumed) {
    console.error("FreeAgent OAuth state validation failed", { stage: "state validation", reason: "missing, expired, or consumed state" });
    return messagePage("FreeAgent authorization failed", "That authorization request is invalid, expired, or already used.", 403);
  }
  console.info("FreeAgent OAuth state validated", {
    provider: consumed.provider,
    environment: consumed.environment,
    redirectIntent: consumed.redirect_intent,
    stateValidated: true,
    stateConsumed: true
  });
  const admin = await findActiveUserById(db, consumed.admin_user_id);
  if (!admin || admin.role !== "ADMIN") {
    console.error("FreeAgent OAuth state validation failed", { stage: "state validation", reason: "administrator inactive or not an admin" });
    return messagePage("FreeAgent authorization failed", "That authorization request is not assigned to an active administrator.", 403);
  }
  try {
    await connectFreeAgent(db, env, {
      code,
      environment: consumed.environment,
      redirectUri: freeAgentEnvironmentConfig(env, consumed.environment)?.oauthRedirectUri ?? "",
      now: new Date().toISOString()
    }, freeAgentFetch);
    let categoryMapping = "NOT_ATTEMPTED";
    try {
      const categoryResult = await resolveFoxTutorCategoryMapping(
        db,
        env,
        consumed.environment,
        new Date().toISOString(),
        freeAgentFetch
      );
      categoryMapping = categoryResult.resolution.status;
      if (categoryResult.resolution.message) {
        console.error("FreeAgent category mapping requires attention", {
          environment: consumed.environment,
          stage: "category matching",
          status: categoryResult.resolution.status,
          message: categoryResult.resolution.message
        });
      }
    } catch (error) {
      categoryMapping = "FAILED";
      if (error instanceof FreeAgentApiError) {
        console.error("FreeAgent category load failed", {
          environment: consumed.environment,
          stage: "category read",
          endpoint: "/v2/categories",
          code: error.shape.code,
          status: error.shape.status,
          message: error.shape.message
        });
      } else {
        console.error("FreeAgent category load failed", {
          environment: consumed.environment,
          stage: "category read",
          message: "Unexpected category loading failure."
        });
      }
    }
    console.info("FreeAgent OAuth callback completed", {
      provider: "FREEAGENT",
      environment: consumed.environment,
      authorizationCodeReceived: true,
      stateValidated: true,
      tokenExchange: "SUCCESS",
      companyRead: "SUCCESS",
      companyVerified: true,
      connectionPersisted: true,
      categoryMapping
    });
    const session = await createSession(db, admin, env.ENVIRONMENT === "production");
    return withSessionCookies(redirect("/learn/admin/accounting"), session.setCookies);
  } catch (error) {
    const diagnostic = error instanceof FreeAgentApiError
      ? { code: error.shape.code, message: error.shape.message }
      : { code: "UNKNOWN", message: "Unexpected OAuth connection failure." };
    try {
      await updateAccountingConnectionStatus(db, "ATTENTION", {
        environment: consumed.environment,
        code: diagnostic.code,
        message: diagnostic.message,
        now: new Date().toISOString()
      });
    } catch (statusError) {
      console.error("FreeAgent OAuth failure status update failed", {
        environment: consumed.environment,
        code: statusError instanceof Error ? statusError.name : "UNKNOWN"
      });
    }
    return freeAgentOAuthFailure(error, consumed.environment);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(input).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resourceReturnContext(value: string): ResourceUploadContext["returnContext"] {
  return value === "lesson" || value === "student" ? value : "resources";
}

function resolveResourceUploadContext(
  students: Student[],
  lessons: Lesson[],
  studentId?: string,
  lessonId?: string,
  returnContextValue = "resources"
): ResourceUploadContext {
  const returnContext = resourceReturnContext(returnContextValue);
  const activeStudent = students.find((student) => student.id === studentId && student.status === "ACTIVE");
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  if (returnContext === "lesson" && lesson && activeStudent?.id === lesson.student_id) {
    return { kind: "lesson", student: activeStudent, lesson, returnContext };
  }
  if (returnContext === "student" && activeStudent) {
    return { kind: "student", student: activeStudent, lessonId, returnContext };
  }
  return { kind: "generic", studentId, lessonId, returnContext: "resources" };
}

function resourceSuccessPage(user: AppUser, csrfToken: string, resourceId: string, context: ResourceUploadContext): Response {
  const returnPath = resourceReturnPath(context);
  const returnLabel = context.kind === "lesson" ? "Back to lesson" : context.kind === "student" ? "Back to student" : "Back to resources";
  return appPage(
    user,
    csrfToken,
    "Resource added",
    `<section class="card resource-success"><div data-notification-message="Resource uploaded" data-notification-type="success" hidden></div><h1>Resource added</h1><p class="lede">The file is ready to use.</p><div class="form-actions"><a class="button" href="/learn/admin/resources/${encodeURIComponent(resourceId)}">View resource</a><a class="button secondary" href="${returnPath}">${returnLabel}</a></div></section>`
  );
}

async function resourceUpload(
  request: Request,
  env: Env,
  active: ActiveSession,
  students: Student[],
  lessons: Lesson[],
  submittedForm?: FormData,
  inline = false
): Promise<Response> {
  if (!env.RESOURCES_BUCKET) return messagePage("Service unavailable", "Resource storage is not configured for this environment.", 503);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESOURCE_SIZE_BYTES + 1_048_576) return messagePage("Upload too large", "This file is too large. The maximum is 25 MB.", 413);
  let form: FormData;
  if (submittedForm) {
    form = submittedForm;
  } else {
    try {
      form = await request.formData();
    } catch (error) {
      if (error instanceof TypeError) return messagePage("Invalid upload", "The submitted upload could not be read.", 400);
      throw error;
    }
  }
  const studentId = formText(form, "studentId");
  const lessonId = formText(form, "lessonId") || null;
  const idempotencyKey = formText(form, "idempotencyKey");
  const returnContextValue = formText(form, "returnContext");
  const context = resolveResourceUploadContext(students, lessons, studentId, lessonId ?? undefined, returnContextValue);
  const values = { studentId, lessonId: lessonId ?? undefined, idempotencyKey, returnContext: context.returnContext };
  if (!csrfTokenMatches(form.get("csrf"), active)) return messagePage("Request not verified", "Refresh the page and try again.", 403);
  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(idempotencyKey)) return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "This upload could not be safely identified. Refresh the page and try again.", values));
  const existing = await findResourceByIdempotencyKey(env.DB as D1Database, idempotencyKey);
  if (existing) {
    if (existing.uploaded_by_user_id !== active.user.id) return messagePage("Conflict", "This upload could not be completed.", 409);
    if (existing.status === "available") return inline ? new Response(null, { status: 204 }) : resourceSuccessPage(active.user, active.csrfToken, existing.id, context);
    if (existing.status === "uploading") return messagePage("Upload in progress", "This upload is already being processed. Try again shortly.", 409);
    return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "This upload has already failed. Choose the file again to start a new upload.", { ...values, idempotencyKey: crypto.randomUUID() }));
  }
  const student = await findStudent(env.DB as D1Database, studentId);
  if (!student || student.status !== "ACTIVE") return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "Choose an active student.", values));
  const lesson = lessonId ? await findLesson(env.DB as D1Database, lessonId) : null;
  if (lessonId && (!lesson || lesson.student_id !== student.id)) {
    return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "This lesson does not belong to the selected student.", values));
  }
  const fileValue = form.get("file");
  if (!(fileValue instanceof File)) return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "Please choose a file.", values));
  const filePolicy = validateResourceFile(fileValue);
  if ("error" in filePolicy) return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, filePolicy.error, values));
  const bytes = new Uint8Array(await fileValue.arrayBuffer());
  if (!hasExpectedSignature(filePolicy.extension, bytes)) return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "The file contents do not match the selected document type.", values));
  if (lesson) {
    const currentLessonBytes = await activeResourceBytesForLesson(env.DB as D1Database, lesson.id);
    if (currentLessonBytes + bytes.byteLength > MAX_LESSON_STORAGE_BYTES) {
      return appPage(active.user, active.csrfToken, "Add resource", resourceUploadForm(active.csrfToken, students, lessons, context, "This lesson's resource storage limit has been reached. Delete an existing resource before uploading another.", values));
    }
  }
  const now = new Date();
  const resourceId = crypto.randomUUID();
  const storageKey = `resources/${resourceId}/original`;
  const nowIso = now.toISOString();
  const retentionUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await insertUploadingResource(env.DB as D1Database, {
    id: resourceId,
    student_id: student.id,
    lesson_id: lesson?.id ?? null,
    uploaded_by_user_id: active.user.id,
    original_filename: filePolicy.filename,
    storage_key: storageKey,
    content_type: filePolicy.contentType,
    size_bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    page_count: filePolicy.extension === "pdf" ? pdfPageCount(bytes) : null,
    status: "uploading",
    idempotency_key: idempotencyKey,
    created_at: nowIso,
    updated_at: nowIso,
    retention_until: retentionUntil
  });
  try {
    await env.RESOURCES_BUCKET.put(storageKey, bytes, {
      httpMetadata: {
        contentType: filePolicy.contentType,
        contentDisposition: `${filePolicy.extension === "pdf" ? "inline" : "attachment"}; filename="${sanitizeHeaderFilename(filePolicy.filename)}"`
      }
    });
  } catch (error) {
    await markResourceFailed(env.DB as D1Database, resourceId, new Date().toISOString());
    return messagePage("Upload failed", "The resource could not be stored. No downloadable resource was created.", 502);
  }
  try {
    await markResourceAvailable(env.DB as D1Database, resourceId, new Date().toISOString());
  } catch (error) {
    await env.RESOURCES_BUCKET.delete(storageKey);
    await markResourceFailed(env.DB as D1Database, resourceId, new Date().toISOString());
    return messagePage("Upload incomplete", "The resource was not made available because its metadata could not be committed.", 502);
  }
  const availableResource = await findResource(env.DB as D1Database, resourceId);
  const resourceStudent = await findActiveStudentRecipient(env.DB as D1Database, student.id);
  if (availableResource && resourceStudent?.learn_user_id && resourceStudent.learn_user_email) {
    const origin = canonicalLearnOrigin(env.PUBLIC_ORIGIN, new URL(request.url).origin);
    const lessonContext = lesson
      ? `${bookingDate(lesson)} · ${bookingTime(lesson)}`
      : undefined;
    const content = renderEmail("RESOURCE_ADDED", {
      studentName: resourceStudent.name,
      filename: availableResource.original_filename,
      lessonLabel: lessonContext,
      resourcePath: `/learn/student/resources/${encodeURIComponent(availableResource.id)}/download`
    }, origin);
    await emitNotification(env, {
      type: "RESOURCE_ADDED",
      eventId: availableResource.id,
      recipientUserId: resourceStudent.learn_user_id,
      studentId: resourceStudent.id,
      lessonId: lesson?.id ?? null,
      resourceId: availableResource.id,
      content
    });
  }
  return inline ? new Response(null, { status: 204 }) : resourceSuccessPage(active.user, active.csrfToken, resourceId, context);
}

async function downloadResource(request: Request, env: Env, resource: Resource): Promise<Response> {
  if (!env.RESOURCES_BUCKET) return messagePage("Service unavailable", "Resource storage is not configured for this environment.", 503);
  const object = await env.RESOURCES_BUCKET.get(resource.storage_key);
  if (!object) return messagePage("Resource unavailable", "This resource is no longer available.", 404);
  const headers = privateHeaders(resource.content_type);
  const forceDownload = new URL(request.url).searchParams.get("download") === "1";
  headers.set("Content-Disposition", `${!forceDownload && canRenderInline(resource.content_type) ? "inline" : "attachment"}; filename="${sanitizeHeaderFilename(resource.original_filename)}"`);
  headers.set("Content-Length", String(resource.size_bytes));
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
}

function reportPdfFilename(report: LessonReport): string {
  return reportPdfFilenameFromIsoDate(report.lesson_date);
}

async function downloadLessonReportPdf(request: Request, env: Env, report: LessonReport): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return messagePage("Method not allowed", "Report downloads are read-only.", 405);
  const [logoRgbResponse, logoAlphaResponse] = await Promise.all([
    env.ASSETS.fetch(new Request(new URL("/foxlearninglogo-240.rgb.deflate", request.url))),
    env.ASSETS.fetch(new Request(new URL("/foxlearninglogo-240.alpha.deflate", request.url)))
  ]);
  const logo = logoRgbResponse.ok && logoAlphaResponse.ok
    ? {
        width: 240,
        height: 230,
        rgb: new Uint8Array(await logoRgbResponse.arrayBuffer()),
        alpha: new Uint8Array(await logoAlphaResponse.arrayBuffer())
      }
    : undefined;
  const reportUrl = new URL(request.url);
  reportUrl.pathname = reportUrl.pathname.replace(/\.pdf$/, "");
  const pdf = generateLessonReportPdf(reportViewModel(report), { logo, reportUrl: reportUrl.toString() });
  const headers = privateHeaders("application/pdf");
  headers.set("Content-Disposition", `attachment; filename="${reportPdfFilename(report)}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Length", String(pdf.byteLength));
  return new Response(request.method === "HEAD" ? null : pdf, { status: 200, headers });
}

async function adminDashboard(user: AppUser, csrfToken: string, db: D1Database): Promise<Response> {
  const now = new Date().toISOString();
  await markElapsedScheduledLessonsCompleted(db, now);
  const upcoming = await listUpcomingLessons(db, now, 5, 0);
  const upcomingCount = await countUpcomingLessons(db, now);
  const reportQueue = await listStartedLessonsNeedingReports(db, now, 5);
  const activeStudents = await countActiveStudents(db);
  const rescheduleRequests = await countPendingRescheduleRequests(db);
  const preview = upcoming.length
    ? `<div class="dashboard-bookings">${upcoming.map((lesson) => `<a class="dashboard-booking" href="/learn/admin/lessons/${lessonRouteId(lesson.id)}"><span><strong>${escapeHtml(lesson.student_name ?? "Student")}</strong><small>${escapeHtml(bookingDate(lesson))} · ${escapeHtml(bookingTime(lesson))}</small></span><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></a>`).join("")}</div><a class="text-link" href="/learn/admin/bookings">View all bookings</a>`
    : `<div class="dashboard-empty"><p>No upcoming bookings.</p><a class="button" href="/learn/admin/lessons/new">Add lesson</a></div>`;
  const reportPreview = reportQueue.length
    ? `<div class="dashboard-bookings">${reportQueue.map((lesson) => `<a class="dashboard-booking" href="/learn/admin/lessons/${lessonRouteId(lesson.id)}/report"><span><strong>${escapeHtml(lesson.student_name ?? "Student")}</strong><small>${escapeHtml(bookingDate(lesson))} · ${escapeHtml(bookingTime(lesson))}</small></span><span class="status status-${lesson.report_status === "DRAFT" ? "draft" : "scheduled"}">${lesson.report_status === "DRAFT" ? "Edit draft" : "Create report"}</span></a>`).join("")}</div><a class="text-link" href="/learn/admin/lessons">View past lessons</a>`
    : `<div class="dashboard-empty"><p>No lesson reports waiting to be written.</p></div>`;
  const nextLessonHref = upcoming[0] ? `/learn/admin/lessons/${lessonRouteId(upcoming[0].id)}` : "/learn/admin/bookings";
  return appPage(user, csrfToken, "Dashboard", `<div class="page-heading"><h1>Dashboard</h1>${buttonLink("/learn/admin/lessons/new", "Add lesson")}</div><div class="summary-grid"><a class="summary-card" href="${nextLessonHref}"><span>Next Lesson</span><strong>${upcoming[0] ? escapeHtml(bookingDate(upcoming[0])) : "None"}</strong>${upcoming[0] ? `<small>${escapeHtml(bookingTime(upcoming[0]))}</small>` : ""}</a><a class="summary-card" href="/learn/admin/bookings"><span>Upcoming Bookings</span><strong>${upcomingCount}</strong></a><a class="summary-card" href="/learn/admin/students"><span>Active Students</span><strong>${activeStudents}</strong></a><a class="summary-card" href="/learn/admin/reschedules"><span>Reschedule requests</span><strong>${rescheduleRequests}</strong></a></div><section class="card dashboard-section"><div class="section-heading"><h2>Reports to write</h2><a class="text-link" href="/learn/admin/lessons">Past Lessons</a></div>${reportPreview}</section><section class="card dashboard-section"><div class="section-heading"><h2>Upcoming Bookings</h2><a class="text-link" href="/learn/admin/bookings">See all</a></div>${preview}</section>`);
}

function billingMinorValue(value: number | string | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return Number.isSafeInteger(value) ? BigInt(value) : null;
  if (!/^-?\d+$/.test(value)) return null;
  return BigInt(value);
}

function billingMoney(value: number | string | bigint | null | undefined): string {
  const minor = billingMinorValue(value);
  return minor === null ? "—" : `£${formatMinorUnits(minor)}`;
}

function billingDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00+00:00`);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CALENDAR_TIMEZONE
  }).format(parsed);
}

function billingReadinessLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

async function billingOperationsPage(
  user: AppUser,
  csrfToken: string,
  db: D1Database,
  request: Request
): Promise<Response> {
  const now = new Date();
  const today = currentCalendarDate(now);
  const nextSeven = new Date(Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)) + 7
  )).toISOString().slice(0, 10);
  const [upcoming, credits, alerts] = await Promise.all([
    listUpcomingBillingRows(db, today, nextSeven),
    listCustomerCreditBalances(db),
    listOpenBillingAlerts(db)
  ]);
  const readiness = upcoming.map((row) => {
    const gross = BigInt(row.amount_minor ?? 0);
    const invoiceAmount = row.invoice_id ? gross : 0n;
    const result = calculatePaymentReadiness({
      lessonDate: row.occurred_at.slice(0, 10),
      collectionDate: row.collection_date ?? row.occurred_at.slice(0, 10),
      now: `${today}T12:00:00.000Z`,
      grossAmountMinor: gross,
      creditAvailableMinor: BigInt(row.credit_available_minor ?? 0),
      invoiceAmountMinor: invoiceAmount,
      invoiceStatus: row.invoice_id ? row.status : null,
      paymentStatus: row.payment_status,
      mandateState: null
    });
    return { row, result };
  });
  const todayRows = readiness.filter(({ row }) => row.occurred_at.slice(0, 10) === today);
  const attention = readiness.filter(({ result }) => !result.paymentSecuredForLesson && result.state !== "NOT_YET_DUE").length;
  const secured = readiness.filter(({ result }) => result.paymentSecuredForLesson).length;
  const failed = readiness.filter(({ result }) => result.state === "PAYMENT_FAILED").length;
  const creditCovered = readiness.filter(({ result }) => result.state === "CREDIT_COVERED").length;
  const rowMarkup = readiness.length
    ? readiness.map(({ row, result }) => `<tr><td><a href="/learn/admin/lessons/${row.lesson_id ? lessonRouteId(row.lesson_id) : ""}">${escapeHtml(row.student_name ?? row.student_id)}</a>${row.student_id ? ` <a class="text-link" href="/learn/admin/billing/audit/${encodeURIComponent(row.student_id)}">Audit</a>` : ""}</td><td>${escapeHtml(billingDateLabel(row.occurred_at))}</td><td>${billingMoney(row.amount_minor)}</td><td>${billingMoney(result.currentCreditMinor)}</td><td>${billingMoney(result.invoiceAmountMinor)}</td><td>${escapeHtml(billingReadinessLabel(result.state))}</td><td>${escapeHtml(billingDateLabel(row.collection_date))}</td><td>${row.invoice_id ? `<a href="/learn/admin/billing/invoices/${encodeURIComponent(row.invoice_id)}">Invoice</a>` : row.billing_event_id ? `<a class="text-link" href="/learn/admin/billing/emergency-payg/${encodeURIComponent(row.billing_event_id)}">Emergency exception</a>` : "Not created"}</td></tr>`).join("")
    : `<tr><td colspan="8">No upcoming lessons require billing attention.</td></tr>`;
  const creditRows = credits.length
    ? credits.map((credit) => `<tr><td><a href="/learn/admin/billing/credits/${encodeURIComponent(credit.credit_id)}">${escapeHtml(credit.student_name ?? credit.student_id)}</a></td><td>${billingMoney(credit.original_amount_minor)}</td><td>${billingMoney(credit.remaining_amount_minor)}</td><td>${escapeHtml(credit.status)}</td></tr>`).join("")
    : `<tr><td colspan="4">No customer credits.</td></tr>`;
  const alertRows = alerts.length
    ? alerts.map((alert) => `<tr><td>${escapeHtml(alert.severity)}</td><td>${escapeHtml(alert.alert_type)}</td><td>${escapeHtml(alert.student_name ?? alert.student_id ?? "Unknown")}</td><td>${escapeHtml(alert.current_state)}</td><td><form method="post" action="/learn/admin/billing/alerts/${encodeURIComponent(alert.id)}">${hiddenCsrf(csrfToken)}${alert.status === "OPEN" ? `<button class="button secondary" name="action" value="ACKNOWLEDGE" type="submit">Acknowledge</button>` : `<button class="button secondary" name="action" value="RESOLVE" type="submit">Resolve</button>`}</form></td></tr>`).join("")
    : `<tr><td colspan="5">No open billing alerts.</td></tr>`;
  const todayLabel = billingDateLabel(today);
  return appPage(user, csrfToken, "Billing health", `<div class="page-heading"><div><h1>Billing health</h1><p class="lede">Operational payment readiness for ${escapeHtml(todayLabel)} through the next seven days. Business time is always Europe/London.</p></div></div><div class="summary-grid"><section class="summary-card"><span>Today</span><strong>${todayRows.length}</strong><small>lessons</small></section><section class="summary-card"><span>Payment secured</span><strong>${secured}</strong><small>next seven days</small></section><section class="summary-card"><span>Credit-covered</span><strong>${creditCovered}</strong></section><section class="summary-card"><span>Needs attention</span><strong>${attention}</strong></section><section class="summary-card"><span>Failed payments</span><strong>${failed}</strong></section></div><section class="card"><div class="section-heading"><div><h2>Next seven days</h2><p class="muted">Collection date is seven calendar days before the lesson date. Payment-secured means credit coverage or a confirmed provider payment.</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Lesson</th><th>Charge</th><th>Credit available</th><th>Invoice amount</th><th>Readiness</th><th>Collection</th><th>Document</th></tr></thead><tbody>${rowMarkup}</tbody></table></div></section><section class="card"><div class="section-heading"><div><h2>Customer credit</h2><p class="muted">Immutable credit history remains the source of the balance shown here.</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Original</th><th>Available</th><th>Status</th></tr></thead><tbody>${creditRows}</tbody></table></div></section><section class="card"><div class="section-heading"><h2>Alerts</h2><a class="text-link" href="/learn/admin/billing">Refresh</a></div><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Alert</th><th>Student</th><th>State</th><th>Action</th></tr></thead><tbody>${alertRows}</tbody></table></div></section>`);
}

async function recurringSeriesPage(user: AppUser, csrfToken: string, db: D1Database): Promise<Response> {
  const [series, students] = await Promise.all([listRecurringSeries(db), listStudents(db)]);
  const studentNames = new Map(students.map((student) => [student.id, student.name]));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const rows = series.length
    ? series.map((item) => `<tr><td>${escapeHtml(studentNames.get(item.student_id) ?? item.student_id)}</td><td>${escapeHtml(dayNames[item.day_of_week] ?? "Day")} ${escapeHtml(item.local_start_time)}</td><td>${item.duration_minutes} minutes</td><td>${billingMoney(item.price_minor)}</td><td>${escapeHtml(item.start_date)}${item.end_date ? ` to ${escapeHtml(item.end_date)}` : ""}</td><td><span class="status status-${item.status.toLowerCase()}">${escapeHtml(item.status)}</span></td><td>${item.status === "ACTIVE" ? `<form method="post" action="/learn/admin/series/${encodeURIComponent(item.id)}/pause">${hiddenCsrf(csrfToken)}<input type="hidden" name="startsOn" value="${escapeHtml(currentCalendarDate())}"><input type="hidden" name="endsOn" value="${escapeHtml(currentCalendarDate())}"><input type="hidden" name="reason" value="Administrator pause"><button class="button secondary" type="submit">Pause</button></form>` : item.status === "PAUSED" ? `<form method="post" action="/learn/admin/series/${encodeURIComponent(item.id)}/resume">${hiddenCsrf(csrfToken)}<button class="button secondary" type="submit">Resume</button></form>` : "—"}</td></tr>`).join("")
    : `<tr><td colspan="7">No recurring lesson series.</td></tr>`;
  return appPage(user, csrfToken, "Recurring series", `<div class="page-heading"><div><h1>Recurring lesson series</h1><p class="lede">FoxTutor owns recurrence. Future lessons are materialised only through the bounded six-week Europe/London horizon.</p></div>${buttonLink("/learn/admin/series/new", "Create series")}</div><section class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Weekly time</th><th>Duration</th><th>Price</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
}

function recurringSeriesForm(csrfToken: string, students: Student[], error?: string): string {
  const options = students.filter((student) => student.status === "ACTIVE").map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`).join("");
  return `<section class="card form-card"><div class="page-heading"><div><h1>Create recurring series</h1><p class="lede">The first six weeks will be materialised after creation. FoxTutor time is always Europe/London.</p></div></div>${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}<form method="post" action="/learn/admin/series/new"><label>Student and payer<select name="studentId" required>${options}</select></label><div class="form-grid"><label>Day<select name="dayOfWeek" required><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label><label>Local start time<input type="time" name="localStartTime" step="900" required></label><label>Duration (minutes)<input type="number" name="durationMinutes" min="1" max="1440" value="55" required></label><label>Price (£)<input type="number" name="price" min="0.01" step="0.01" value="55.00" required></label><label>Start date<input type="date" name="startDate" value="${escapeHtml(currentCalendarDate())}" required></label><label>End date (optional)<input type="date" name="endDate"></label></div><p class="muted">The payer is currently the selected student. Any future payer relationship workflow must be explicit and audited.</p><div class="form-actions"><a class="button secondary" href="/learn/admin/series">Cancel</a><button class="button" type="submit">${hiddenCsrf(csrfToken)}Create series</button></div></form></section>`;
}

async function handleAdmin(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const url = new URL(request.url);
  const csrfToken = active.csrfToken;
  if (route === "admin") return adminDashboard(active.user, csrfToken, db);
  if (route === "admin-series") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Use the series controls to make changes.", 405);
    return recurringSeriesPage(active.user, csrfToken, db);
  }
  if (route === "admin-series-form") {
    const students = await listStudents(db);
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create recurring series", recurringSeriesForm(csrfToken, students));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    const studentId = formText(form ?? new FormData(), "studentId");
    const dayOfWeek = Number(formText(form ?? new FormData(), "dayOfWeek"));
    const durationMinutes = Number(formText(form ?? new FormData(), "durationMinutes"));
    const price = formText(form ?? new FormData(), "price");
    const startDate = formText(form ?? new FormData(), "startDate");
    const endDate = formText(form ?? new FormData(), "endDate") || null;
    const localStartTime = formText(form ?? new FormData(), "localStartTime");
    const student = students.find((candidate) => candidate.id === studentId && candidate.status === "ACTIVE");
    const validDate = (value: string | null): boolean => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)));
    const priceMinor = /^\d+(?:\.\d{1,2})?$/.test(price) ? BigInt(Math.round(Number(price) * 100)) : 0n;
    if (!student || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(localStartTime) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440 || priceMinor <= 0n || !validDate(startDate) || (endDate && !validDate(endDate)) || (endDate && endDate < startDate)) {
      return appPage(active.user, csrfToken, "Create recurring series", recurringSeriesForm(csrfToken, students, "Enter a valid student, weekly time, price and date range."));
    }
    const now = new Date().toISOString();
    const seriesId = crypto.randomUUID();
    await createRecurringSeries(db, {
      id: seriesId,
      studentId: student.id,
      payerStudentId: student.id,
      dayOfWeek,
      localStartTime,
      durationMinutes,
      startDate,
      endDate,
      priceMinor,
      now
    });
    const createdSeries = await findRecurringSeries(db, seriesId);
    if (!createdSeries) return messagePage("Series creation failed", "The recurring lesson series could not be read after it was saved.", 500);
    await ensureRecurringSeriesMaterialised(db, createdSeries, currentCalendarDate(new Date(now)), now);
    return redirect("/learn/admin/series");
  }
  if (route === "admin-series-action") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const match = /^\/learn\/admin\/series\/([^/]+)\/(pause|resume|end)$/.exec(url.pathname);
    const seriesId = match ? decodePathSegment(match[1] ?? "") : null;
    const action = match?.[2];
    if (!seriesId || !action) return messagePage("Series not found", "That recurring series does not exist.", 404);
    const form = await parseForm(request);
    const now = new Date().toISOString();
    if (action === "pause") {
      const startsOn = formText(form ?? new FormData(), "startsOn") || currentCalendarDate();
      const endsOn = formText(form ?? new FormData(), "endsOn") || startsOn;
      const reason = formText(form ?? new FormData(), "reason") || "Administrator pause";
      await addRecurringPause(db, { id: crypto.randomUUID(), seriesId, startsOn, endsOn, reason, actorUserId: active.user.id, now });
      await setRecurringSeriesStatus(db, { id: seriesId, status: "PAUSED", actorUserId: active.user.id, now, details: `${startsOn} to ${endsOn}: ${reason}` });
    } else if (action === "resume") {
      await setRecurringSeriesStatus(db, { id: seriesId, status: "ACTIVE", actorUserId: active.user.id, now, details: "Recurring series resumed." });
      const resumedSeries = await findRecurringSeries(db, seriesId);
      if (!resumedSeries) return messagePage("Series resume failed", "The recurring lesson series could not be read after it was resumed.", 500);
      await ensureRecurringSeriesMaterialised(db, resumedSeries, currentCalendarDate(new Date(now)), now);
    } else {
      const endDate = formText(form ?? new FormData(), "endDate") || currentCalendarDate();
      await setRecurringSeriesStatus(db, { id: seriesId, status: "ENDED", endDate, actorUserId: active.user.id, now, details: `Series ended on ${endDate}.` });
    }
    return redirect("/learn/admin/series");
  }
  if (route === "admin-billing") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Use the alert controls provided on the billing dashboard.", 405);
    return billingOperationsPage(active.user, csrfToken, db, request);
  }
  if (route === "admin-billing-audit") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Use the read-only billing audit page.", 405);
    const match = /^\/learn\/admin\/billing\/audit\/([^/]+)$/.exec(url.pathname);
    const studentId = match ? decodePathSegment(match[1] ?? "") : "";
    if (!studentId) return messagePage("Student not found", "That student does not exist.", 404);
    const student = await findStudent(db, studentId);
    if (!student) return messagePage("Student not found", "That student does not exist.", 404);
    await reconcileBillingAccountMandate(db, env, studentId, new Date().toISOString(), freeAgentFetch);
    const audit = await auditBillingChain(db, studentId, new Date().toISOString(), {
      providerEnvironment: configuredEnvironment(env)
    });
    const reasonRows = audit.reasons.length
      ? audit.reasons.map((reason) => `<tr><td>${escapeHtml(reason.code)}</td><td>${escapeHtml(reason.detail)}</td></tr>`).join("")
      : `<tr><td colspan="2">No exceptions detected.</td></tr>`;
    const account = audit.snapshot.billingAccount;
    const link = audit.snapshot.accountingLink;
    return appPage(
      active.user,
      csrfToken,
      "Billing chain audit",
      `<div class="page-heading"><div><h1>Billing chain audit</h1><p class="lede">Read-only FreeAgent reconciliation for ${escapeHtml(student.name)}.</p></div><a class="button secondary" href="/learn/admin/billing">Back to billing</a></div><section class="card"><dl class="detail-grid"><div><dt>Overall status</dt><dd>${escapeHtml(audit.status)}</dd></div><div><dt>Provider environment</dt><dd>${escapeHtml(audit.snapshot.providerEnvironment?.toUpperCase() ?? "UNKNOWN")}</dd></div><div><dt>Billing account</dt><dd>${escapeHtml(account?.id ?? "Missing")}</dd></div><div><dt>FreeAgent link</dt><dd>${escapeHtml(link?.status ?? "Missing")}</dd></div><div><dt>Contact reference</dt><dd>${escapeHtml(account?.providerContactReference ?? "—")}</dd></div><div><dt>Mandate state</dt><dd>${escapeHtml(account?.mandateState ?? "—")}</dd></div><div><dt>Provisioning state</dt><dd>${escapeHtml(account?.provisioningState ?? "—")}</dd></div><div><dt>Last active verification</dt><dd>${escapeHtml(account?.verifiedAt ?? "—")}</dd></div><div><dt>Last reconciled</dt><dd>${escapeHtml(account?.lastReconciledAt ?? "—")}</dd></div><div><dt>Next reconciliation</dt><dd>${escapeHtml(account?.nextReconcileAt ?? "—")}</dd></div><div><dt>Last error</dt><dd>${escapeHtml(account?.lastErrorCode ?? "None")}${account?.lastErrorMessage ? ` — ${escapeHtml(account.lastErrorMessage)}` : ""}</dd></div><div><dt>Invoice</dt><dd>${escapeHtml(audit.snapshot.invoice?.id ?? "None")}</dd></div><div><dt>Payment state</dt><dd>${escapeHtml(audit.snapshot.payment?.status ?? "Not recorded")}</dd></div></dl></section><section class="card"><h2>Reasons</h2><div class="table-wrap"><table><thead><tr><th>Code</th><th>Detail</th></tr></thead><tbody>${reasonRows}</tbody></table></div></section>`
    );
  }
  if (route === "admin-billing-action") {
    const emergencyMatch = /^\/learn\/admin\/billing\/emergency-payg\/([^/]+)$/.exec(url.pathname);
    if (emergencyMatch) {
      const billingEventId = decodePathSegment(emergencyMatch[1] ?? "");
      if (!billingEventId) return messagePage("Billing event not found", "That billing event does not exist.", 404);
      const event = await db.prepare(
        "SELECT id, student_id, status FROM billing_events WHERE id = ?"
      ).bind(billingEventId).first<{ id: string; student_id: string; status: string }>();
      if (!event) return messagePage("Billing event not found", "That billing event does not exist.", 404);
      if (request.method === "GET") {
        return appPage(active.user, csrfToken, "Emergency billing exception", `<div class="page-heading"><div><h1>Emergency billing exception</h1><p class="lede">This admin-only exception prevents Direct Debit collection for one billing event. It is never shown as a customer payment choice.</p></div></div><section class="card form-card"><form method="post" action="/learn/admin/billing/emergency-payg/${encodeURIComponent(event.id)}">${hiddenCsrf(csrfToken)}<label>Reason<textarea name="reason" minlength="10" maxlength="500" required></textarea><span class="field-help">Use only for a last-minute addition where a normal Direct Debit authorisation cannot reasonably be established in time.</span></label><div class="form-actions"><a class="button secondary" href="/learn/admin/billing">Cancel</a><button class="button danger" type="submit">Record emergency exception</button></div></form></section>`);
      }
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      const form = await parseForm(request);
      const reason = formText(form ?? new FormData(), "reason");
      const reasonError = validateEmergencyPaygReason(reason);
      if (reasonError) return messagePage("Reason required", reasonError, 400);
      const existingInvoice = await db.prepare("SELECT 1 FROM billing_invoices WHERE billing_event_id = ?").bind(event.id).first();
      if (!canRecordEmergencyPayg({ actorRole: active.user.role, reason, lessonAlreadySecured: Boolean(existingInvoice) })) {
        return messagePage("Exception unavailable", "An emergency exception is only available to an administrator before provider invoicing or collection.", 409);
      }
      const created = await createEmergencyPaygOverride(db, {
        id: crypto.randomUUID(),
        billingEventId: event.id,
        studentId: event.student_id,
        reason,
        createdByUserId: active.user.id,
        now: new Date().toISOString()
      });
      return created ? redirect("/learn/admin/billing") : messagePage("Exception already recorded", "That billing event already has an emergency exception.", 409);
    }
    const invoiceMatch = /^\/learn\/admin\/billing\/invoices\/([^/]+)$/.exec(url.pathname);
    if (invoiceMatch && request.method === "GET") {
      const invoiceId = decodePathSegment(invoiceMatch[1] ?? "");
      const invoice = invoiceId ? await findBillingInvoice(db, invoiceId) : null;
      if (!invoice) return messagePage("Invoice not found", "That billing invoice does not exist.", 404);
      const event = await db.prepare("SELECT * FROM billing_events WHERE id = ?").bind(invoice.billing_event_id).first<{ lesson_id: string | null; lesson_date: string | null; payer_student_id: string; }>();
      const payment = await db.prepare("SELECT * FROM billing_payments WHERE invoice_id = ?").bind(invoice.id).first<{ status: string; provider_reference: string | null; provider_status: string | null; collection_date: string; }>();
      const operations = await db.prepare("SELECT * FROM billing_invoice_operations WHERE invoice_id = ? ORDER BY created_at DESC").bind(invoice.id).all<{ operation_type: string; status: string; provider_status: string | null; safe_error_message: string | null; }>();
      const operationRows = operations.results.length
        ? operations.results.map((operation) => `<tr><td>${escapeHtml(operation.operation_type)}</td><td>${escapeHtml(operation.status)}</td><td>${escapeHtml(operation.provider_status ?? "—")}</td><td>${escapeHtml(operation.safe_error_message ?? "—")}</td></tr>`).join("")
        : `<tr><td colspan="4">No provider operations.</td></tr>`;
      return appPage(active.user, csrfToken, "Invoice detail", `<div class="page-heading"><div><h1>Invoice detail</h1><p class="lede">FoxTutor invoice ${escapeHtml(invoice.id)}</p></div><a class="button secondary" href="/learn/admin/billing">Back to billing</a></div><section class="card"><dl class="detail-grid"><div><dt>Amount</dt><dd>${billingMoney(invoice.net_amount_minor)}</dd></div><div><dt>Credit applied</dt><dd>${billingMoney(invoice.credit_applied_minor)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(invoice.status)}</dd></div><div><dt>Provider status</dt><dd>${escapeHtml(invoice.provider_status ?? "—")}</dd></div><div><dt>Provider reference</dt><dd>${escapeHtml(invoice.freeagent_reference ?? "—")}</dd></div><div><dt>Lesson date</dt><dd>${escapeHtml(billingDateLabel(event?.lesson_date ?? invoice.lesson_date))}</dd></div><div><dt>Collection date</dt><dd>${escapeHtml(billingDateLabel(payment?.collection_date ?? invoice.collection_date))}</dd></div><div><dt>Payment state</dt><dd>${escapeHtml(payment?.status ?? "Not scheduled")}</dd></div></dl>${invoice.freeagent_url ? `<p><a class="text-link" href="${escapeHtml(invoice.freeagent_url)}" target="_blank" rel="noopener">Open provider invoice</a></p>` : ""}</section><section class="card"><h2>Provider operations</h2><div class="table-wrap"><table><thead><tr><th>Operation</th><th>Status</th><th>Provider</th><th>Message</th></tr></thead><tbody>${operationRows}</tbody></table></div></section>`);
    }
    const creditMatch = /^\/learn\/admin\/billing\/credits\/([^/]+)$/.exec(url.pathname);
    if (creditMatch && request.method === "GET") {
      const creditId = decodePathSegment(creditMatch[1] ?? "");
      const credit = creditId ? await findCreditById(db, creditId) : null;
      if (!credit) return messagePage("Credit not found", "That customer credit does not exist.", 404);
      const transactions = await db.prepare("SELECT * FROM credit_ledger_transactions WHERE credit_id = ? ORDER BY created_at ASC, id ASC").bind(credit.credit_id).all<{ created_at: string; transaction_type: string; amount_minor: number | string; invoice_id: string | null; provider_reference: string | null; }>();
      const transactionRows = transactions.results.length
        ? transactions.results.map((transaction) => `<tr><td>${escapeHtml(billingDateLabel(transaction.created_at))}</td><td>${escapeHtml(transaction.transaction_type)}</td><td>${billingMoney(transaction.amount_minor)}</td><td>${escapeHtml(transaction.invoice_id ?? "—")}</td><td>${escapeHtml(transaction.provider_reference ?? "—")}</td></tr>`).join("")
        : `<tr><td colspan="5">No ledger transactions.</td></tr>`;
      return appPage(active.user, csrfToken, "Credit detail", `<div class="page-heading"><div><h1>Credit detail</h1><p class="lede">Why this customer is in credit, and where it has been used.</p></div><a class="button secondary" href="/learn/admin/billing">Back to billing</a></div><section class="card"><dl class="detail-grid"><div><dt>Student</dt><dd>${escapeHtml(credit.student_name ?? credit.student_id)}</dd></div><div><dt>Original value</dt><dd>${billingMoney(credit.original_amount_minor)}</dd></div><div><dt>Consumed/refunded</dt><dd>${billingMoney(credit.amount_consumed_minor)}</dd></div><div><dt>Remaining</dt><dd>${billingMoney(credit.remaining_amount_minor)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(credit.status)}</dd></div><div><dt>Source lesson</dt><dd>${escapeHtml(credit.source_event_id)}</dd></div><div><dt>Provider credit note</dt><dd>${escapeHtml(credit.freeagent_credit_note_reference ?? "Not created")}</dd></div></dl></section><section class="card"><h2>Immutable ledger</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Invoice</th><th>Provider reference</th></tr></thead><tbody>${transactionRows}</tbody></table></div></section>`);
    }
    const alertMatch = /^\/learn\/admin\/billing\/alerts\/([^/]+)$/.exec(url.pathname);
    if (!alertMatch || request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const alertId = decodePathSegment(alertMatch[1] ?? "");
    const form = await parseForm(request);
    const action = formText(form ?? new FormData(), "action");
    if (!alertId || (action !== "ACKNOWLEDGE" && action !== "RESOLVE")) return messagePage("Invalid alert action", "Choose an available alert action.", 400);
    const changed = await updateBillingAlertStatus(db, alertId, { status: action === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : "RESOLVED", userId: active.user.id }, new Date().toISOString());
    return changed ? redirect("/learn/admin/billing") : messagePage("Alert unavailable", "That alert has already changed.", 409);
  }
  if (route === "admin-accounting-connect") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Use the FreeAgent connection link from the accounting page.", 405);
    const connectionMatch = /^\/learn\/admin\/accounting\/connect\/([^/]+)$/.exec(url.pathname);
    const environment = parseFreeAgentEnvironment(connectionMatch?.[1]);
    if (!environment) return messagePage("FreeAgent environment required", "Choose Connect Sandbox or Connect Production.", 400);
    const credentials = freeAgentEnvironmentConfig(env, environment);
    if (!credentials) {
      const configurationIssue = freeAgentEnvironmentConfigIssue(env, environment);
      const issueMessage = configurationIssue === "token_encryption_key"
        ? `${freeAgentEnvironmentLabel(environment)} FreeAgent token encryption key is not configured.`
        : configurationIssue === "client_id"
          ? `${freeAgentEnvironmentLabel(environment)} FreeAgent OAuth client ID is not configured.`
          : configurationIssue === "client_secret"
            ? `${freeAgentEnvironmentLabel(environment)} FreeAgent OAuth client secret is not configured.`
            : `${freeAgentEnvironmentLabel(environment)} FreeAgent configuration is not available.`;
      return messagePage(
        `${freeAgentEnvironmentLabel(environment)} FreeAgent unavailable`,
        issueMessage,
        503
      );
    }
    if (!credentials.oauthRedirectUri || (
      !credentials.companySubdomain &&
      !(environment === "production" && temporaryProductionCompatibilityEnabled(env))
    )) {
      return messagePage(
        `${freeAgentEnvironmentLabel(environment)} FreeAgent unavailable`,
        `${freeAgentEnvironmentLabel(environment)} FreeAgent OAuth configuration is incomplete or the intended company is not pinned.`,
        503
      );
    }
    const state = randomOAuthState();
    const now = new Date().toISOString();
    await createAccountingOAuthState(db, {
      stateHash: await hashOAuthState(state),
      adminUserId: active.user.id,
      environment,
      provider: "FREEAGENT",
      redirectIntent: "accounting",
      expiresAt: new Date(Date.parse(now) + 10 * 60_000).toISOString(),
      createdAt: now
    });
    console.info("FreeAgent OAuth state created", {
      provider: "FREEAGENT",
      environment,
      redirectIntent: "accounting",
      expiresAt: new Date(Date.parse(now) + 10 * 60_000).toISOString()
    });
    return redirect(freeAgentAuthorizationUrl(environment, {
      clientId: credentials.clientId,
      redirectUri: credentials.oauthRedirectUri,
      state,
      accessLevel: env.FREEAGENT_ACCESS_LEVEL ?? "4"
    }));
  }
  if (route === "admin-accounting-callback") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state || !code) return messagePage("FreeAgent connection failed", "FreeAgent did not return an authorization code.", 400);
    const consumed = await consumeAccountingOAuthState(db, await hashOAuthState(state), new Date().toISOString());
    if (!consumed || consumed.admin_user_id !== active.user.id) return messagePage("FreeAgent connection failed", "That authorization request is invalid or expired.", 403);
    try {
      await connectFreeAgent(db, env, {
        code,
        environment: consumed.environment,
        redirectUri: freeAgentEnvironmentConfig(env, consumed.environment)?.oauthRedirectUri ?? "",
        now: new Date().toISOString()
      }, freeAgentFetch);
      return redirect("/learn/admin/accounting");
    } catch (error) {
      return freeAgentOAuthFailure(error, consumed.environment);
    }
  }
  if (route === "admin-accounting") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Accounting monitoring is read-only.", 405);
    const [rows, counts, status, students, links] = await Promise.all([
      listAccountingOutbox(db, undefined, 100, 0),
      accountingOutboxCounts(db),
      accountingIntegrationStatuses(db, env),
      listStudents(db),
      listExternalAccountingLinks(db, configuredEnvironment(env) ?? undefined)
    ]);
    return appPage(active.user, csrfToken, "Accounting", `<div class="page-heading"><div><h1>Accounting</h1><p class="lede">Operational boundary between Learn and FreeAgent.</p></div></div>${accountingList(rows, counts, status, students, links, csrfToken)}`);
  }
  if (route === "admin-accounting-settings") {
    const environment = parseFreeAgentEnvironment(url.searchParams.get("environment"))
      ?? configuredEnvironment(env)
      ?? "sandbox";
    let status = await accountingIntegrationStatus(db, env, environment);
    let categories: FreeAgentCategory[] = [];
    let categoryError: string | undefined;
    if (status.connected && environment) {
      try {
        const categoryResult = await resolveFoxTutorCategoryMapping(db, env, environment, new Date().toISOString(), freeAgentFetch);
        categories = categoryResult.categories;
        if (categoryResult.resolution.status !== "CONFIGURED") categoryError = categoryResult.resolution.message ?? "FreeAgent accounting category mapping requires attention.";
        status = await accountingIntegrationStatus(db, env, environment);
      } catch (error) {
        if (error instanceof FreeAgentApiError) {
          console.error("FreeAgent category load failed", {
            environment,
            endpoint: "/v2/categories",
            code: error.shape.code,
            status: error.shape.status,
            message: error.shape.message
          });
        }
        categoryError = "FreeAgent accounting categories could not be loaded. Check the connected FreeAgent account or reconnect it.";
      }
    } else if (!status.connected) {
      categoryError = `${freeAgentEnvironmentLabel(environment)} FreeAgent integration is not connected.`;
    }
    const persisted = await findAccountingBillingSettings(db, environment);
    const fallback = configuredInvoice(env, environment);
    const values = {
      amount: persisted?.amount ?? fallback?.amount ?? env.FREEAGENT_INVOICE_AMOUNT ?? "55.00",
      itemType: persisted?.item_type ?? fallback?.itemType ?? env.FREEAGENT_INVOICE_ITEM_TYPE ?? "Hours",
      categoryUrl: persisted?.category_url ?? fallback?.categoryUrl ?? env.FREEAGENT_INVOICE_CATEGORY_URL ?? "",
      paymentTermsDays: String(persisted?.payment_terms_days ?? fallback?.paymentTermsInDays ?? env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "0"),
      salesTaxRate: persisted?.sales_tax_rate ?? fallback?.salesTaxRate ?? env.FREEAGENT_INVOICE_SALES_TAX_RATE ?? "0"
    };
    if (request.method === "GET") {
      return appPage(active.user, csrfToken, "Billing settings", accountingBillingSettingsPage(csrfToken, values, status, categories, categoryError));
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const result = validateBillingSettings({
      amount: formText(form, "amount"),
      itemType: formText(form, "itemType"),
      categoryUrl: formText(form, "categoryUrl"),
      paymentTermsDays: formText(form, "paymentTermsDays"),
      currency: formText(form, "currency"),
      salesTaxRate: formText(form, "salesTaxRate")
    }, environment, categories);
    if (!result.value) return appPage(active.user, csrfToken, "Billing settings", accountingBillingSettingsPage(csrfToken, values, status, categories, categoryError, result.error ?? "Billing settings are invalid."), false);
    await saveAccountingBillingSettings(db, {
      ...result.value,
      providerEnvironment: environment,
      providerCompanySubdomain: status.companySubdomain,
      updatedByUserId: active.user.id,
      now: new Date().toISOString()
    });
    return redirect(`/learn/admin/accounting/settings?environment=${environment}`);
  }
  if (route === "admin-accounting-contact") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const match = /^\/learn\/admin\/accounting\/contacts\/([^/]+)(\/remove)?$/.exec(url.pathname);
    const studentId = match ? decodePathSegment(match[1] ?? "") : null;
    if (!studentId || !(await findStudent(db, studentId))) return messagePage("Not found", "That Learn payer does not exist.", 404);
    const form = await parseForm(request);
    const environment = parseFreeAgentEnvironment(form ? formText(form, "environment") : null) ?? configuredEnvironment(env);
    if (!environment) return messagePage("FreeAgent environment is not configured", "Select a valid Sandbox or Production accounting environment.", 500);
    if (match?.[2] === "/remove") {
      const removed = await removeExternalAccountingLink(db, studentId, environment);
      return removed ? redirect("/learn/admin/accounting") : messagePage("Mapping still in use", "Resolve the accounting event before removing this contact mapping.", 409);
    }
    const externalReference = formText(form ?? new FormData(), "externalReference").trim();
    if (!/^\d+$/.test(externalReference)) return messagePage("Invalid contact", "Enter a numeric FreeAgent contact ID.", 400);
    try {
      await verifyFreeAgentContactMapping(db, env, { studentId, externalReference, environment, now: new Date().toISOString() }, freeAgentFetch);
    } catch (error) {
      if (error instanceof FreeAgentApiError && error.shape.code === "CONFLICT") {
        return messagePage("Contact mapping in use", error.message, 409);
      }
      const link = await findExternalAccountingLink(db, studentId, environment);
      if (link) {
        await updateExternalAccountingLinkStatus(db, studentId, {
          environment,
          status: "INVALID",
          lastErrorCode: error instanceof FreeAgentApiError ? error.shape.code : "UNKNOWN",
          lastErrorMessage: error instanceof FreeAgentApiError && error.shape.code === "NOT_FOUND"
            ? `${freeAgentEnvironmentLabel(environment)} FreeAgent contact ${externalReference} was not found.`
            : `${freeAgentEnvironmentLabel(environment)} FreeAgent contact verification failed.`,
          now: new Date().toISOString()
        });
      }
      const message = error instanceof FreeAgentApiError && error.shape.code === "NOT_FOUND"
        ? `${freeAgentEnvironmentLabel(environment)} FreeAgent contact ${externalReference} was not found.`
        : `${freeAgentEnvironmentLabel(environment)} FreeAgent contact verification failed.`;
      return messagePage(`${freeAgentEnvironmentLabel(environment)} contact verification failed`, message, error instanceof FreeAgentApiError && error.shape.status && error.shape.status >= 400 && error.shape.status < 500 ? error.shape.status : 502);
    }
    return redirect("/learn/admin/accounting");
  }
  if (route === "admin-accounting-retry") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const id = accountingOutboxIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That accounting event does not exist.", 404);
    const before = await findAccountingOutbox(db, id);
    if (!before) return messagePage("Not found", "That accounting event does not exist.", 404);
    const now = new Date().toISOString();
    const changed = await makeAccountingRetryable(db, id, now);
    const after = await findAccountingOutbox(db, id);
    await recordAccountingRetryAudit(db, {
      id: crypto.randomUUID(),
      outboxId: id,
      businessEventId: before.business_event_id,
      actorUserId: active.user.id,
      priorStatus: before.status,
      requestResult: changed ? "ACCEPTED" : "REJECTED",
      resultingStatus: after?.status ?? null,
      providerReference: after?.external_reference ?? before.external_reference,
      safeErrorCode: after?.safe_error_code ?? before.safe_error_code,
      safeErrorMessage: after?.safe_error_message ?? before.safe_error_message,
      now
    });
    if (!changed) return messagePage("Retry unavailable", "This event is not safe to retry in its current state.", 409);
    return redirect("/learn/admin/accounting");
  }
  if (route === "admin-accounting-reconcile") {
    const id = accountingOutboxIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That accounting event does not exist.", 404);
    const outbox = await findAccountingOutbox(db, id);
    if (!outbox) return messagePage("Not found", "That accounting event does not exist.", 404);
    if (outbox.status !== "UNKNOWN") return redirect("/learn/admin/accounting");
    if (request.method === "GET") {
      return appPage(active.user, csrfToken, "Reconcile accounting event", `<section class="card form-card"><h1>Reconcile accounting event</h1><p class="lede">Do not create a second invoice. Enter the FreeAgent invoice ID only after checking the configured company.</p><form method="post" action="${url.pathname}">${hiddenCsrf(csrfToken)}<label>FreeAgent invoice ID<input name="externalReference" inputmode="numeric" pattern="[0-9]+" required></label><div class="form-actions"><a class="button secondary" href="/learn/admin/accounting">Cancel</a><button class="button" type="submit">Reconcile</button></div></form></section>`);
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    const externalReference = formText(form ?? new FormData(), "externalReference").trim();
    if (!/^\d+$/.test(externalReference)) return messagePage("Invalid reference", "Enter a numeric FreeAgent invoice ID.", 400);
    try {
      const reconciled = await reconcileAccountingOutbox(db, env, outbox, externalReference, new Date().toISOString(), freeAgentFetch);
      return reconciled ? redirect("/learn/admin/accounting") : messagePage("Reconciliation unavailable", "The event could not be reconciled.", 409);
    } catch {
      return messagePage("Reconciliation failed", "FreeAgent could not confirm that invoice.", 502);
    }
  }
  if (route === "admin-notifications") {
    const previewMatch = url.pathname.match(/^\/learn\/admin\/notifications\/preview\/([^/]+)$/);
    if (previewMatch) {
      const eventType = decodeURIComponent(previewMatch[1] ?? "");
      if (!isNotificationType(eventType) || request.method !== "GET") return messagePage("Preview unavailable", "That notification preview does not exist.", 404);
      const preview = notificationPreview(eventType, canonicalLearnOrigin(env.PUBLIC_ORIGIN));
      const headers = privateHeaders("text/html; charset=utf-8");
      headers.set("Cache-Control", "private, no-store");
      headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'");
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(notificationEventLabel(eventType))} preview · FoxTutor</title></head><body>${preview.html}</body></html>`, { status: 200, headers });
    }
    if (url.pathname === "/learn/admin/notifications/settings") {
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      const form = await parseForm(request);
      if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
      const eventTypeValue = formText(form, "eventType");
      if (!isNotificationType(eventTypeValue)) return messagePage("Invalid notification", "That notification type is not supported.", 400);
      const timingText = formText(form, "timingMinutes").trim();
      const timingMinutes = timingText ? Number.parseInt(timingText, 10) : null;
      const subjectPrefix = formText(form, "subjectPrefix").trim();
      const bodyNote = formText(form, "bodyNote").trim();
      const reminder = eventTypeValue === "LESSON_REMINDER";
      const validTiming = timingMinutes === null
        || (Number.isInteger(timingMinutes) && timingMinutes >= (reminder ? 1 : -10080) && timingMinutes <= 10080);
      if (!validTiming
        || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(subjectPrefix)
        || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(bodyNote)
        || subjectPrefix.length > 120
        || bodyNote.length > 1000) {
        return messagePage("Invalid notification controls", "Check the timing and message fields, then try again.", 400);
      }
      await upsertNotificationSetting(db, {
        eventType: eventTypeValue,
        enabled: form.has("enabled"),
        timingMinutes,
        subjectPrefix,
        bodyNote,
        updatedAt: new Date().toISOString(),
        updatedByUserId: active.user.id
      });
      return redirect("/learn/admin/notifications");
    }
    const requested = (url.searchParams.get("status") ?? "").toUpperCase();
    const status = ["PENDING", "SENDING", "UNKNOWN", "FAILED", "SENT", "SUPPRESSED"].includes(requested) ? requested as "PENDING" | "SENDING" | "UNKNOWN" | "FAILED" | "SENT" | "SUPPRESSED" : undefined;
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const requestedSize = Number.parseInt(url.searchParams.get("size") ?? "12", 10);
    const pageSize = [12, 24, 48].includes(requestedSize) ? requestedSize : 12;
    const [listedRows, counts, settings, total] = await Promise.all([
      listNotifications(db, status, pageSize, (page - 1) * pageSize),
      notificationCounts(db),
      listNotificationSettings(db),
      countNotifications(db, status)
    ]);
    const notificationHtml = `<div data-notification-console>${notificationList(listedRows, counts, settings, csrfToken, status, page, pageSize, total)}</div>`;
    if (request.method === "GET" && request.headers.get("X-Notification-Fragment") === "1") {
      const headers = privateHeaders("application/json; charset=utf-8");
      headers.set("Cache-Control", "no-store");
      return new Response(JSON.stringify({ html: notificationHtml, url: url.toString() }), { status: 200, headers });
    }
    return appPage(active.user, csrfToken, "Notifications", `<div class="page-heading"><div><h1>Notifications</h1><p class="lede">Monitor outbound email, inspect its content, and control future delivery.</p></div></div>${notificationHtml}`);
  }
  if (route === "admin-notification") {
    const previewMatch = /^\/learn\/admin\/notifications\/([^/]+)\/preview$/.exec(url.pathname.replace(/\/+$/, ""));
    const id = previewMatch ? decodePathSegment(previewMatch[1]) : notificationIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That notification does not exist.", 404);
    const notification = await findNotificationById(db, id);
    if (!notification) return messagePage("Not found", "That notification does not exist.", 404);
    if (previewMatch) {
      if (request.method !== "GET") return messagePage("Preview unavailable", "Notification previews are read-only.", 405);
      const headers = privateHeaders("text/html; charset=utf-8");
      headers.set("Cache-Control", "private, no-store");
      headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'");
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(notification.subject)} · FoxTutor</title></head><body>${notification.html_body}</body></html>`, { status: 200, headers });
    }
    if (request.method === "GET") return appPage(active.user, csrfToken, "Notification", notificationDetail(notification, csrfToken));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (notification.status !== "PENDING") return messagePage("Schedule unavailable", "Only pending notifications can be rescheduled.", 409);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const scheduled = localDateTimeToIso(formText(form, "scheduledAt"), CALENDAR_TIMEZONE);
    if (!scheduled.value || Date.parse(scheduled.value) <= Date.now()) {
      return appPage(active.user, csrfToken, "Notification", notificationDetail(notification, csrfToken, scheduled.error ?? "Choose a future delivery time."));
    }
    const changed = await updateNotificationSchedule(db, id, scheduled.value, new Date().toISOString());
    if (!changed) return messagePage("Schedule unavailable", "The notification is no longer pending.", 409);
    return redirect(`/learn/admin/notifications/${encodeURIComponent(id)}`);
  }
  if (route === "admin-reschedules") {
    return appPage(active.user, csrfToken, "Reschedule requests", `<div class="page-heading"><h1>Reschedule requests</h1></div>${rescheduleQueue(await listPendingRescheduleRequests(db), csrfToken)}`);
  }
  if (route === "admin-reschedule-approve" || route === "admin-reschedule-reject") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const requestId = rescheduleRequestIdFromPath(url.pathname);
    if (!requestId) return messagePage("Not found", "That reschedule request does not exist.", 404);
    const rescheduleRequest = await findRescheduleRequest(db, requestId);
    if (!rescheduleRequest) return messagePage("Not found", "That reschedule request does not exist.", 404);
    if (rescheduleRequest.status !== "PENDING") return redirect("/learn/admin/reschedules");
    const lesson = await findLesson(db, rescheduleRequest.lesson_id);
    if (!lesson || lesson.student_id !== rescheduleRequest.student_id) return messagePage("Conflict", "The reschedule request is no longer valid.", 409);
    const decision = route === "admin-reschedule-approve" ? "APPROVED" : "REJECTED";
    if (decision === "APPROVED" && lesson.status !== "scheduled") return messagePage("Request unavailable", "This lesson is no longer scheduled.", 409);
    if (decision === "APPROVED" && await hasOverlappingLesson(db, lesson.student_id, rescheduleRequest.requested_start_at, rescheduleRequest.requested_end_at, lesson.id)) {
      return messagePage("Request unavailable", "The requested time overlaps another lesson.", 409);
    }
    const now = new Date().toISOString();
    const changed = await decideRescheduleRequest(db, {
      requestId,
      lessonId: lesson.id,
      studentId: lesson.student_id,
      adminUserId: active.user.id,
      decision,
      decisionReason: "",
      previousStartAt: lesson.start_at,
      previousEndAt: lesson.end_at,
      previousTimezone: lesson.timezone,
      now
    });
    if (changed) {
      const student = await findActiveStudentRecipient(db, lesson.student_id);
      if (student?.learn_user_id && student.learn_user_email) {
        const updatedLesson = decision === "APPROVED" ? await findLesson(db, lesson.id) : lesson;
        const type = decision === "APPROVED" ? "LESSON_RESCHEDULED" : "LESSON_CHANGED";
        const content = renderEmail(type, lessonMailData(updatedLesson ?? lesson), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
        await emitNotification(env, {
          type,
          eventId: requestId,
          recipientUserId: student.learn_user_id,
          studentId: student.id,
          lessonId: lesson.id,
          content
        }, now);
      }
    }
    return redirect("/learn/admin/reschedules");
  }
  if (route === "admin-lesson-reschedule") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLesson(db, id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    if (request.method === "GET") {
      if (lesson.status !== "scheduled") return messagePage("Reschedule unavailable", "Only scheduled lessons can be rescheduled.", 409);
      return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, lesson, url.pathname));
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (lesson.status !== "scheduled") return messagePage("Reschedule unavailable", "Only scheduled lessons can be rescheduled.", 409);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const timezone = formText(form, "timezone").trim();
    const start = localDateTimeToIso(formText(form, "startAt"), timezone);
    const end = localDateTimeToIso(formText(form, "endAt"), timezone);
    const error = start.value && end.value && end.value > start.value
      ? Date.parse(start.value) <= Date.now() ? "Choose a future time." : null
      : start.error ?? end.error ?? "The end time must be after the start time.";
    if (!start.value || !end.value || error) return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, lesson, url.pathname, error ?? "Enter a valid new time."));
    if (start.value === lesson.start_at && end.value === lesson.end_at && timezone === lesson.timezone) return redirect(`/learn/admin/lessons/${lessonRouteId(lesson.id)}`);
    if (await hasOverlappingLesson(db, lesson.student_id, start.value, end.value, lesson.id)) return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, lesson, url.pathname, "That time overlaps another lesson."));
    const now = new Date().toISOString();
    const changed = await rescheduleLesson(db, {
      lessonId: lesson.id,
      studentId: lesson.student_id,
      actorUserId: active.user.id,
      actorRole: "ADMIN",
      startAt: start.value,
      endAt: end.value,
      timezone,
      reason: "Administrative reschedule",
      previousStartAt: lesson.start_at,
      previousEndAt: lesson.end_at,
      previousTimezone: lesson.timezone,
      now
    });
    if (changed) {
      const updatedLesson = await findLesson(db, lesson.id);
      const student = await findActiveStudentRecipient(db, lesson.student_id);
      if (updatedLesson && student?.learn_user_id && student.learn_user_email) {
        const content = renderEmail("LESSON_RESCHEDULED", lessonMailData(updatedLesson), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
        await emitNotification(env, {
          type: "LESSON_RESCHEDULED",
          eventId: `${lesson.id}:${now}`,
          recipientUserId: student.learn_user_id,
          studentId: student.id,
          lessonId: lesson.id,
          content
        }, now);
      }
    }
    return redirect(`/learn/admin/lessons/${lessonRouteId(lesson.id)}`);
  }
  if (route === "admin-resource-search") {
    if (request.method !== "GET") return messagePage("Method not allowed", "Resource suggestions are read-only.", 405);
    return resourceSuggestionsResponse(await listResourceSuggestions(db, url.searchParams.get("q") ?? "", 5, url.searchParams.get("student") ?? undefined));
  }
  if (route === "admin-resources") {
    if (request.method === "GET" && request.headers.get("X-Resource-Fragment") === "1") {
      return resourceFragmentResponse(await adminResourceFragment(db, url, csrfToken));
    }
    const { page, pageSize } = parseResourcePagination(url);
    const filters = parseResourceFilters(url);
    const students = await listActiveStudentsForResourceFilter(db, filters.studentId);
    const lessons = await listLessonsForResourceFilter(db, filters.studentId, filters.lessonId);
    const options = resourceListOptions(filters, page, pageSize);
    const total = await countResources(db, options);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const resources = await listResources(db, { ...options, offset: (safePage - 1) * pageSize });
    const hasFilters = Boolean(filters.search || filters.studentId || filters.lessonId || filters.type || filters.added !== "any");
    const deleted = Number(url.searchParams.get("deleted") ?? 0);
    const failed = Number(url.searchParams.get("failed") ?? 0);
    const notification = deleted || failed
      ? `<div data-notification-message="${escapeHtml(deleted ? `${deleted} resource${deleted === 1 ? "" : "s"} deleted` : `${failed} resource${failed === 1 ? "" : "s"} could not be deleted`)}" data-notification-type="${failed ? "error" : "success"}" hidden></div>`
      : "";
    const heading = `<div class="page-heading"><h1>Resources</h1>${buttonLink("/learn/admin/resources/new", "Add resource")}</div>${notification}<div data-resource-finder-ui>${resourceFilterForm(filters, students, lessons)}</div><p class="resource-update-error form-error" data-resource-update-error role="alert" hidden>We couldn't update the resource list. Please try again.</p><div data-resource-results aria-live="polite" aria-busy="false">${`<p class="resource-result-count" data-resource-result-count role="status">${total} resource${total === 1 ? "" : "s"}</p>`}${resources.length ? resourceSelectionToolbar() : ""}<form id="resource-bulk-delete-form" method="post" action="/learn/admin/resources/bulk-delete">${hiddenCsrf(csrfToken)}${resourceFilterHiddenInputs(filters, safePage, pageSize)}</form>${resourceRows(resources, { admin: true, csrfToken, filtered: hasFilters })}${resourcePagination(safePage, pageSize, total, "/learn/admin/resources", filters)}</div>`;
    return appPage(active.user, csrfToken, "Resources", heading);
  }
  if (route === "admin-resource-form") {
    const students = await listStudents(db);
    const lessons = await listLessons(db);
    const requestedLessonId = url.searchParams.get("lesson") ?? undefined;
    const requestedStudentId = url.searchParams.get("student") ?? undefined;
    const requestedLesson = lessons.find((lesson) => lesson.id === requestedLessonId);
    const requestedStudent = students.find((student) => student.id === (requestedLesson?.student_id ?? requestedStudentId) && student.status === "ACTIVE");
    const context = requestedLesson && requestedStudent && requestedLesson.student_id === requestedStudent.id
      ? { kind: "lesson", student: requestedStudent, lesson: requestedLesson, returnContext: "lesson" } as ResourceUploadContext
      : requestedStudent
        ? { kind: "student", student: requestedStudent, returnContext: "student" } as ResourceUploadContext
        : { kind: "generic", studentId: undefined, lessonId: undefined, returnContext: "resources" } as ResourceUploadContext;
    if (request.method === "GET") return appPage(active.user, csrfToken, "Add resource", resourceUploadForm(csrfToken, students, lessons, context));
    if (request.method !== "POST") return messagePage("Request not verified", "Refresh the page and try again.", 403);
    return withSessionCookies(await resourceUpload(request, env, active, students, lessons), undefined);
  }
  if (route === "admin-resource-bulk-delete") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (!env.RESOURCES_BUCKET) return messagePage("Service unavailable", "Resource storage is not configured for this environment.", 503);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted selection is invalid.", 400);
    const ids = form.getAll("resourceId").filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
    const uniqueIds = [...new Set(ids)].slice(0, 48);
    if (!uniqueIds.length) return redirect("/learn/admin/resources");
    let deleted = 0;
    let failed = 0;
    for (const id of uniqueIds) {
      const resource = await findResource(db, id);
      if (!resource || resource.deleted_at || resource.status !== "available") {
        failed++;
        continue;
      }
      try {
        await env.RESOURCES_BUCKET.delete(resource.storage_key);
        await deleteResourceMetadata(db, resource.id, new Date().toISOString());
        deleted++;
      } catch (error) {
        failed++;
      }
    }
    const resultQuery = new URLSearchParams();
    for (const key of ["q", "student", "lesson", "type", "added", "sort", "size"]) {
      const value = formText(form, key);
      if (value) resultQuery.set(key, value);
    }
    const requestedPage = Number(formText(form, "page"));
    if (Number.isInteger(requestedPage) && requestedPage > 0) resultQuery.set("page", String(requestedPage));
    resultQuery.set("deleted", String(deleted));
    if (failed) resultQuery.set("failed", String(failed));
    return redirect(`/learn/admin/resources?${resultQuery.toString()}`);
  }
  if (route === "admin-resource" || route === "admin-resource-download" || route === "admin-resource-delete") {
    const id = resourceIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That resource does not exist.", 404);
    const resource = await findResource(db, id);
    if (!resource || resource.deleted_at || resource.status !== "available") return messagePage("Not found", "That resource does not exist.", 404);
    if (route === "admin-resource-download") {
      if (request.method !== "GET" && request.method !== "HEAD") return messagePage("Method not allowed", "Resource downloads are read-only.", 405);
      return downloadResource(request, env, resource);
    }
    if (route === "admin-resource-delete") {
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      if (!env.RESOURCES_BUCKET) return messagePage("Service unavailable", "Resource storage is not configured for this environment.", 503);
      await env.RESOURCES_BUCKET.delete(resource.storage_key);
      try {
        await deleteResourceMetadata(db, resource.id, new Date().toISOString());
      } catch (error) {
        return messagePage("Deletion incomplete", "The file was removed from storage, but its metadata needs reconciliation.", 502);
      }
      return redirect("/learn/admin/resources?deleted=1");
    }
    return appPage(active.user, csrfToken, "Resource", resourceSummary(resource, true, csrfToken));
  }
  if (route === "admin-calendar") {
    const lessons = await listLessons(db);
    const feed = await findActiveCalendarFeedForOwner(db, active.user.id);
    return appPage(active.user, csrfToken, "Calendar", calendarPage(csrfToken, "/learn/admin/calendar/feed", lessons, "ADMIN", feed, await currentCalendarFeedUrl(request, env, feed)));
  }
  if (route === "admin-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (!env.CALENDAR_FEED_ENCRYPTION_KEY) return messagePage("Calendar unavailable", "The calendar subscription could not be updated. Try again later.", 503);
    const hadFeed = Boolean(await findActiveCalendarFeedForOwner(db, active.user.id));
    const token = generateFeedToken();
    const now = new Date().toISOString();
    await rotateCalendarFeed(db, {
      id: crypto.randomUUID(),
      ownerUserId: active.user.id,
      studentId: null,
      tokenHash: await hashFeedToken(token),
      tokenLast4: feedTokenLast4(token),
      tokenCiphertext: await encryptFeedToken(token, env.CALENDAR_FEED_ENCRYPTION_KEY),
      now
    });
    const lessons = await listLessons(db);
    const feed = await findActiveCalendarFeedForOwner(db, active.user.id);
    const subscription = calendarSubscriptionCard(csrfToken, "/learn/admin/calendar/feed", feed, calendarFeedUrl(request, env, token), true);
    if (request.headers.get("X-Calendar-Fragment") === "1") return calendarFragmentResponse(subscription, hadFeed ? "Calendar link regenerated" : "Calendar link generated");
    return appPage(active.user, csrfToken, "Calendar", calendarPage(csrfToken, "/learn/admin/calendar/feed", lessons, "ADMIN", feed, calendarFeedUrl(request, env, token), true));
  }
  if (route === "admin-bookings") {
    const { page, pageSize } = parseLessonPagination(url);
    const now = new Date().toISOString();
    const total = await countUpcomingLessons(db, now);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const bookings = await listUpcomingLessons(db, now, pageSize, (safePage - 1) * pageSize);
    return appPage(active.user, csrfToken, "Bookings", lessonList(bookings, total, safePage, pageSize, { path: "/learn/admin/bookings", label: "Bookings", title: "Upcoming Bookings", emptyHeading: "No upcoming bookings", emptyCopy: "There are no scheduled lessons coming up.", emptyAction: "Add lesson" }));
  }
  if (route === "admin-lessons") {
    const { page, pageSize } = parseLessonPagination(url);
    const now = new Date().toISOString();
    await markElapsedScheduledLessonsCompleted(db, now);
    const total = await countPastLessons(db, now);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const lessons = await listPastLessons(db, now, pageSize, (safePage - 1) * pageSize);
    return appPage(active.user, csrfToken, "Past Lessons", lessonList(lessons, total, safePage, pageSize, { path: "/learn/admin/lessons", label: "Past Lessons", title: "Past Lessons", emptyHeading: "No past lessons", emptyCopy: "Completed and historical lessons will appear here." }));
  }
  if (route === "admin-students") {
    return appPage(active.user, csrfToken, "Students", `<div class="page-heading"><h1>Students</h1>${buttonLink("/learn/admin/students/new", "Create student")}</div>${studentRows(await listStudents(db))}`);
  }
  if (route === "admin-student-form") {
    if (request.method === "GET") return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new"));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const now = new Date().toISOString();
    const profile = parseStudentProfile(form, now);
    if (!profile.value) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, profile.error));
    const account = await findStudentAccount(db, profile.value.email);
    if (!account) return appPage(active.user, csrfToken, "Create student", studentForm(csrfToken, "/learn/admin/students/new", undefined, "The login email must belong to an active STUDENT Learn account."));
    if (await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    const studentId = crypto.randomUUID();
    await insertStudent(db, { ...profile.value, id: studentId, learnUserId: account.id, now });
    await provisionBillingAccount(db, env, studentId, now);
    const createdStudent = await findActiveStudentRecipient(db, studentId);
    if (createdStudent?.learn_user_id && createdStudent.learn_user_email) {
      const content = renderEmail("STUDENT_INVITED", { studentName: createdStudent.name, origin: canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin) }, canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
      await emitNotification(env, {
        type: "STUDENT_INVITED",
        eventId: createdStudent.id,
        recipientUserId: createdStudent.learn_user_id,
        studentId: createdStudent.id,
        content
      }, now);
    }
    return redirect("/learn/admin/students");
  }
  if (route === "admin-student" || route === "admin-student-edit" || route === "admin-student-deactivate") {
    const id = studentIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That student record does not exist.", 404);
    const student = await findStudent(db, id);
    if (!student) return messagePage("Not found", "That student record does not exist.", 404);
    if (route === "admin-student") {
      const lessonPagination = parseStudentSectionPagination(url, "lessonsPage", "lessonsSize");
      const resourcePagination = parseStudentSectionPagination(url, "resourcesPage", "resourcesSize");
      const [lessonTotal, resourceTotal] = await Promise.all([countLessonsForStudentRecord(db, student.id), countResourcesForStudentRecord(db, student.id)]);
      const lessonPageCount = Math.max(1, Math.ceil(lessonTotal / lessonPagination.pageSize));
      const resourcePageCount = Math.max(1, Math.ceil(resourceTotal / resourcePagination.pageSize));
      const safeLessonPage = Math.min(lessonPagination.page, lessonPageCount);
      const safeResourcePage = Math.min(resourcePagination.page, resourcePageCount);
      const [lessons, resources] = await Promise.all([
        listLessonsForStudentRecord(db, student.id, lessonPagination.pageSize, (safeLessonPage - 1) * lessonPagination.pageSize),
        listResourcesForStudentRecord(db, student.id, resourcePagination.pageSize, (safeResourcePage - 1) * resourcePagination.pageSize)
      ]);
      const detailValue = (value: string | null | undefined) => value ? escapeHtml(value).replace(/\n/g, "<br>") : "—";
      const profileDetails = `<section class="card detail-grid"><p><strong>Status</strong><br>${student.status === "ACTIVE" ? "Active" : "Inactive"}</p><p><strong>Level</strong><br>${escapeHtml(student.level ?? "Not set")}</p><p><strong>Academic system</strong><br>${escapeHtml(student.academic_year_system)}</p><p><strong>Academic year</strong><br>${escapeHtml(["MATURE", "PRIVATE", "INTERNATIONAL"].includes(student.academic_year_system) ? "Not applicable" : student.academic_year)}</p><p><strong>Pupil email</strong><br>${escapeHtml(student.email)}</p><p><strong>Parent or carer name</strong><br>${escapeHtml(student.parent_name || "Not set")}</p><p><strong>Parent or carer email</strong><br>${escapeHtml(student.parent_email || "Not set")}</p><p><strong>International pupil</strong><br>${student.international ? "Yes — DST reminders enabled" : "No"}</p><p><strong>Learn account</strong><br>${student.learn_user_id ? "Explicitly linked" : "Not linked"}</p><p class="full-width"><strong>Billing address</strong><br>${detailValue(student.billing_address)}</p><p class="full-width"><strong>Class texts</strong><br>${detailValue(student.class_texts)}</p><p class="full-width"><strong>Additional support needs</strong><br>${detailValue(student.additional_support_needs)}</p><p><strong>Created</strong><br>${escapeHtml(notificationTimestamp(student.created_at))}</p><p><strong>Updated</strong><br>${escapeHtml(notificationTimestamp(student.updated_at))}</p></section>`;
      const lessonSection = `<details class="card student-collapsible" open><summary><span><strong>Lessons</strong><small>${lessonTotal} lesson${lessonTotal === 1 ? "" : "s"}</small></span></summary><div class="student-collapsible-body">${lessonTable(lessons, "/learn/admin/lessons", true)}${studentSectionPagination(safeLessonPage, lessonPagination.pageSize, lessonTotal, `/learn/admin/students/${encodeURIComponent(student.id)}`, "Student lessons", "lessonsPage", "lessonsSize")}</div></details>`;
      const resourceAction = student.status === "ACTIVE" ? `<div class="student-section-action">${buttonLink(`/learn/admin/resources/new?student=${encodeURIComponent(student.id)}`, "Add resource")}</div>` : "";
      const resourceSection = `<details class="card student-collapsible" open><summary><span><strong>Resources</strong><small>Documents for this student.</small></span></summary><div class="student-collapsible-body">${resourceAction}${resources.length ? resourceRows(resources, { admin: true, csrfToken }) : `<p class="muted">No resources for this student yet.</p>`}${studentSectionPagination(safeResourcePage, resourcePagination.pageSize, resourceTotal, `/learn/admin/students/${encodeURIComponent(student.id)}`, "Student resources", "resourcesPage", "resourcesSize")}</div></details>`;
      return appPage(active.user, csrfToken, "Student", `<div class="page-heading"><div><h1>${escapeHtml(student.name)}</h1><p class="lede">${escapeHtml(student.email)}</p></div><div class="form-actions">${buttonLink(`/learn/admin/students/${encodeURIComponent(student.id)}/edit`, "Edit student")}${buttonLink(`/learn/admin/lessons/new?student=${encodeURIComponent(student.id)}`, "Create lesson")}</div></div>${profileDetails}${lessonSection}${resourceSection}${student.status === "ACTIVE" ? `<form method="post" action="/learn/admin/students/${encodeURIComponent(student.id)}/deactivate" class="inline-form student-deactivate-form">${hiddenCsrf(csrfToken)}<button class="button danger" type="submit">Deactivate student</button></form>` : ""}`);
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
    const now = new Date().toISOString();
    const profile = parseStudentProfile(form, now);
    if (!profile.value) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, profile.error));
    const account = await findStudentAccount(db, profile.value.email);
    if (!account) return appPage(active.user, csrfToken, "Edit student", studentForm(csrfToken, url.pathname, student, "The login email must belong to an active STUDENT Learn account."));
    if (account.id !== student.learn_user_id && await findStudentLinkedToUser(db, account.id)) return messagePage("Conflict", "That Learn account is already linked to another student record.", 409);
    await updateStudent(db, { ...profile.value, id: student.id, learnUserId: account.id, now });
    return redirect(`/learn/admin/students/${encodeURIComponent(student.id)}`);
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
    const now = new Date().toISOString();
    const lessonId = crypto.randomUUID();
    await insertLesson(db, { ...validation.value, id: lessonId, now });
    const createdLesson = await findLesson(db, lessonId);
    const recipient = await findActiveStudentRecipient(db, student.id);
    if (createdLesson && recipient?.learn_user_id && recipient.learn_user_email) {
      const content = renderEmail("LESSON_CREATED", lessonMailData(createdLesson), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
      await emitNotification(env, {
        type: "LESSON_CREATED",
        eventId: createdLesson.id,
        recipientUserId: recipient.learn_user_id,
        studentId: recipient.id,
        lessonId: createdLesson.id,
        content
      }, now);
    }
    return redirect("/learn/admin/lessons");
  }
  if (route === "admin-lesson-report") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    await markElapsedScheduledLessonsCompleted(db, new Date().toISOString());
    const lesson = await findLesson(db, id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    if (!lessonReportEligible(lesson)) return messagePage("Report unavailable", "The lesson report becomes available when the lesson start time has passed.", 409);
    const existing = await findLessonReport(db, lesson.id);
    const studentRecord = await findStudent(db, lesson.student_id);
    if (!studentRecord) return messagePage("Report unavailable", "The lesson student record does not exist.", 409);
    if (request.method === "GET") {
      const lessonResources = await listResourcesForLesson(db, lesson.id);
      return appPage(active.user, csrfToken, reportDocumentTitle(lesson), existing?.status === "SENT"
        ? reportDocument(
          existing,
          true,
          csrfToken,
          url.searchParams.get("delivery") === "failed"
            ? `Report resend failed${url.searchParams.get("reason") ? `: ${url.searchParams.get("reason")}` : "."}`
            : url.searchParams.get("delivery") === "unknown"
              ? "Report resend status is unknown; check Notifications before trying again."
              : undefined
        )
        : lessonReportForm(csrfToken, url.pathname, lesson, studentRecord, existing,
          url.searchParams.get("delivery") === "failed"
            ? `Report saved. Email delivery failed${url.searchParams.get("reason") ? `: ${url.searchParams.get("reason")}` : "; you can send it again without retyping the report."}`
            : url.searchParams.get("delivery") === "unknown"
              ? "Report saved. Email delivery is unknown; retry only after checking Notifications."
              : undefined,
          lessonResources), true);
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) {
      return reportActionResponse(request, { ok: false, message: "Request not verified. Refresh the page and try again." }, 403)
        ?? messagePage("Request not verified", "Refresh the page and try again.", 403);
    }
    const form = await parseForm(request);
    if (!form) {
      return reportActionResponse(request, { ok: false, message: "The submitted form is invalid or too large." }, 400)
        ?? messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    }
    if (existing?.status === "SENT") {
      if (formText(form, "action") !== "resend") {
        return reportActionResponse(request, { ok: false, message: "This report has already been sent." }, 409)
          ?? appPage(active.user, csrfToken, reportDocumentTitle(lesson), reportDocument(existing, true, csrfToken), true);
      }
      const student = await findActiveStudentRecipient(db, lesson.student_id);
      if (!student?.learn_user_id || !student.learn_user_email) {
        return reportActionResponse(request, { ok: false, message: "The lesson student does not have an active Learn account." }, 409)
          ?? messagePage("Report unavailable", "The lesson student does not have an active Learn account.", 409);
      }
      const notification = await emitLessonReportNotification(
        env,
        lesson,
        existing,
        student,
        await listResourcesForLesson(db, lesson.id),
        `${existing.id}:resend:${crypto.randomUUID()}`,
        new Date().toISOString(),
        canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin)
      );
      if (notification?.status === "SENT") {
        const updatedReport = await findLessonReport(db, lesson.id);
        const response = reportActionResponse(request, {
          ok: true,
          action: "resend",
          message: "Report resent successfully.",
          reportHtml: updatedReport ? reportDocument(updatedReport, true, csrfToken) : reportDocument(existing, true, csrfToken)
        });
        if (response) return response;
        return redirect(url.pathname);
      }
      if (notification?.status === "UNKNOWN") {
        return reportActionResponse(request, { ok: false, message: "Report resend status is unknown; check Notifications before trying again." }, 503)
          ?? redirect(`${url.pathname}?delivery=unknown`);
      }
      const reason = notification?.error_message ? `&reason=${encodeURIComponent(notification.error_message)}` : "";
      return reportActionResponse(request, { ok: false, message: `Report resend failed${notification?.error_message ? `: ${notification.error_message}` : "."}` }, 502)
        ?? redirect(`${url.pathname}?delivery=failed${reason}`);
    }
    const level = formText(form, "level").trim();
    const thisLessonsFocus = formText(form, "thisLessonsFocus").trim();
    const nextLessonsFocus = formText(form, "nextLessonsFocus").trim();
    const homeLearningTask = formText(form, "homeLearningTask").trim();
    const notes = formText(form, "notes").trim();
    const evenBetterIf = formText(form, "evenBetterIf").trim();
    const tooLong = [level, thisLessonsFocus, nextLessonsFocus, homeLearningTask, notes, evenBetterIf].some((value) => value.length > 12_000);
    const wantsSend = formText(form, "action") === "send";
    const draftReport = { ...existing, level, this_lessons_focus: thisLessonsFocus, next_lessons_focus: nextLessonsFocus, home_learning_task: homeLearningTask, notes, even_better_if: evenBetterIf } as LessonReport;
    if (!level || tooLong || (wantsSend && !thisLessonsFocus)) {
      const message = wantsSend && !thisLessonsFocus ? "Enter This Lesson's Focus before sending the report." : "Level is required and each report field must be 12,000 characters or fewer.";
      const response = reportActionResponse(request, { ok: false, message }, 422);
      if (response) return response;
      return appPage(active.user, csrfToken, reportDocumentTitle(lesson), lessonReportForm(
        csrfToken,
        url.pathname,
        lesson,
        studentRecord,
        draftReport,
        message,
        await listResourcesForLesson(db, lesson.id)
      ), true);
    }
    const attachments = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    if (wantsSend && attachments.length > 5) {
      const response = reportActionResponse(request, { ok: false, message: "Choose no more than 5 lesson attachments." }, 422);
      if (response) return response;
      return appPage(active.user, csrfToken, reportDocumentTitle(lesson), lessonReportForm(
        csrfToken,
        url.pathname,
        lesson,
        studentRecord,
        draftReport,
        "Choose no more than 5 lesson attachments.",
        await listResourcesForLesson(db, lesson.id)
      ), true);
    }
    if (wantsSend) {
      const attachmentKey = formText(form, "attachmentIdempotencyKey") || crypto.randomUUID();
      for (const [index, attachment] of attachments.entries()) {
        const uploadForm = new FormData();
        uploadForm.set("csrf", formText(form, "csrf"));
        uploadForm.set("studentId", studentRecord.id);
        uploadForm.set("lessonId", lesson.id);
        uploadForm.set("returnContext", "lesson");
        uploadForm.set("idempotencyKey", `${attachmentKey}-${index + 1}`);
        uploadForm.set("file", attachment);
        const uploadResponse = await resourceUpload(request, env, active, [studentRecord], [lesson], uploadForm, true);
        if (uploadResponse.status !== 204) {
          const response = reportActionResponse(request, { ok: false, message: `The attachment "${attachment.name}" could not be uploaded. Check the file type and size, then try again.` }, 422);
          if (response) return response;
          return appPage(active.user, csrfToken, reportDocumentTitle(lesson), lessonReportForm(
            csrfToken,
            url.pathname,
            lesson,
            studentRecord,
            draftReport,
            `The attachment "${attachment.name}" could not be uploaded. Check the file type and size, then try again.`,
            await listResourcesForLesson(db, lesson.id)
          ), true);
        }
      }
    }
    const reportId = existing?.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    await upsertLessonReport(db, {
      id: reportId,
      lesson_id: lesson.id,
      student_id: lesson.student_id,
      created_by_user_id: active.user.id,
      pupil_name: existing?.pupil_name || studentRecord.name,
      level,
      lesson_date: existing?.lesson_date || reportDateValue(lesson),
      lesson_start_at: existing?.lesson_start_at || lesson.start_at,
      lesson_end_at: existing?.lesson_end_at || lesson.end_at,
      lesson_timezone: existing?.lesson_timezone || lesson.timezone,
      this_lessons_focus: thisLessonsFocus,
      next_lessons_focus: nextLessonsFocus,
      home_learning_task: homeLearningTask,
      notes,
      even_better_if: evenBetterIf,
      status: "DRAFT",
      now
    });
    await updateStudentLevel(db, studentRecord.id, level, now);
    if (!wantsSend) {
      return reportActionResponse(request, { ok: true, action: "save", message: "Draft saved." })
        ?? redirect(`${url.pathname}?saved=1`);
    }
    const savedReport = await findLessonReport(db, lesson.id);
    if (!savedReport) {
      return reportActionResponse(request, { ok: false, message: "The report could not be saved." }, 500)
        ?? messagePage("Report unavailable", "The report could not be saved.", 500);
    }
    const student = await findActiveStudentRecipient(db, lesson.student_id);
    if (!student?.learn_user_id || !student.learn_user_email) {
      return reportActionResponse(request, { ok: false, message: "The lesson student does not have an active Learn account." }, 409)
        ?? messagePage("Report unavailable", "The lesson student does not have an active Learn account.", 409);
    }
    const resources = await listResourcesForLesson(db, lesson.id);
    const origin = canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin);
    const notification = await emitLessonReportNotification(env, lesson, savedReport, student, resources, reportId, now, origin);
    if (notification?.status === "SENT") {
      const updatedReport = await findLessonReport(db, lesson.id);
      const response = reportActionResponse(request, {
        ok: true,
        action: "send",
        message: "Report sent successfully.",
        reportHtml: updatedReport ? reportDocument(updatedReport, true, csrfToken) : reportDocument(savedReport, true, csrfToken)
      });
      if (response) return response;
      return redirect(url.pathname);
    }
    if (notification?.status === "UNKNOWN") {
      return reportActionResponse(request, { ok: false, message: "Report delivery status is unknown; check Notifications before trying again." }, 503)
        ?? redirect(`${url.pathname}?delivery=unknown`);
    }
    const reason = notification?.error_message ? `&reason=${encodeURIComponent(notification.error_message)}` : "";
    return reportActionResponse(request, { ok: false, message: `Report delivery failed${notification?.error_message ? `: ${notification.error_message}` : "."}` }, 502)
      ?? redirect(`${url.pathname}?delivery=failed${reason}`);
  }
  if (route === "admin-lesson-report-pdf") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const report = await findLessonReport(db, id);
    if (!report || report.status !== "SENT") return messagePage("Not found", "That lesson report does not exist.", 404);
    return await downloadLessonReportPdf(request, env, report);
  }
  if (route === "admin-lesson" || route === "admin-lesson-edit" || route === "admin-lesson-status") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    if (route === "admin-lesson") await markElapsedScheduledLessonsCompleted(db, new Date().toISOString());
    const lesson = await findLesson(db, id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    if (route === "admin-lesson") {
      const resources = await listResourcesForLesson(db, lesson.id);
      const report = await findLessonReport(db, lesson.id);
      const history = await listLessonHistory(db, lesson.id);
      const reportAction = lessonReportEligible(lesson) ? buttonLink(`${url.pathname}/report`, report?.status === "SENT" ? "View report" : report?.status === "DRAFT" ? "Edit report" : "Create report") : "";
      const rescheduleAction = lesson.status === "scheduled" ? buttonLink(`${url.pathname}/reschedule`, "Reschedule") : "";
      const reportDetails = !lessonReportEligible(lesson)
        ? "Available when the lesson start time has passed."
        : report?.status === "SENT"
          ? `${report.sent_at ? `${escapeHtml(reportSentAt(report.sent_at, report.lesson_timezone))} · ` : ""}<a href="${url.pathname}/report">View report</a> · <a href="${url.pathname}/report.pdf">Download PDF</a>`
          : report?.status === "DRAFT"
            ? `Draft · <a href="${url.pathname}/report">Edit report</a>`
            : `Not created · <a href="${url.pathname}/report">Create report</a>`;
      return appPage(active.user, csrfToken, "Lesson", `<div class="page-heading"><div><h1>${escapeHtml(lesson.student_name ?? "Lesson")}</h1><p class="lede">${escapeHtml(formatLessonTime(lesson))}</p></div><div class="form-actions">${buttonLink(`${url.pathname}/edit`, "Edit lesson")}${rescheduleAction}${reportAction}</div></div><section class="card detail-grid"><p><strong>Status</strong><br><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></p><p><strong>External lesson URL</strong><br>${lesson.status === "scheduled" && lesson.external_url ? `<a href="${escapeHtml(lesson.external_url)}" rel="noreferrer">Join lesson</a>` : lesson.external_url ? "Unavailable for cancelled/completed lesson" : "Not set"}</p><p class="full-width"><strong>Private notes</strong><br>${lesson.notes ? escapeHtml(lesson.notes).replace(/\n/g, "<br>") : "No notes"}</p><p><strong>Lesson report</strong><br>${reportDetails}</p></section><form method="post" action="${url.pathname}/status" class="inline-form">${hiddenCsrf(csrfToken)}<label>Change status<select name="status">${(["scheduled", "completed", "cancelled"] as LessonStatus[]).map((status) => `<option value="${status}"${status === lesson.status ? " selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></label><button class="button" type="submit">Save status</button></form>${lessonHistorySection(history)}<section class="card resource-section"><div class="section-heading"><div><h2>Resources</h2></div>      ${buttonLink(`/learn/admin/resources/new?student=${encodeURIComponent(lesson.student_id)}&lesson=${lessonRouteId(lesson.id)}`, "Add resource")}</div>${resources.length ? resourceRows(resources) : `<p class="muted">No resources attached to this lesson.</p>`}</section>`);
    }
    if (route === "admin-lesson-status") {
      if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
      const form = await parseForm(request);
      const nextStatus = form ? formText(form, "status") : "";
      if (!isLessonStatus(nextStatus) || !canTransitionLessonStatus(lesson.status, nextStatus)) return messagePage("Invalid status change", "That lesson lifecycle transition is not allowed.", 409);
      const now = new Date().toISOString();
      if (nextStatus === "cancelled" && lesson.status === "scheduled") {
        const billingConfiguration = await configuredInvoiceFromDatabase(db, env, now);
        const changed = await cancelLesson(db, {
          lessonId: lesson.id,
          studentId: lesson.student_id,
          actorUserId: active.user.id,
          actorRole: "ADMIN",
          eventType: "ADMIN_CANCELLED",
          billingConsequence: billingConsequenceForAdminCancellation(),
          reason: "Administrative cancellation",
          now,
          previousStartAt: lesson.start_at,
          previousEndAt: lesson.end_at,
          previousTimezone: lesson.timezone,
          creditAmountMinor: billingConfiguration?.amountMinorUnits ?? null,
          payerStudentId: lesson.student_id
        });
        if (!changed) return redirect(`/learn/admin/lessons/${lessonRouteId(lesson.id)}`);
        const student = await findActiveStudentRecipient(db, lesson.student_id);
        if (student?.learn_user_id && student.learn_user_email) {
          const content = renderEmail("CANCELLATION_PROCESSED", lessonMailData(lesson, false), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
          await emitNotification(env, {
            type: "CANCELLATION_PROCESSED",
            eventId: lesson.id,
            recipientUserId: student.learn_user_id,
            studentId: student.id,
            lessonId: lesson.id,
            content
          }, now);
        }
      } else {
        await updateLessonStatus(db, lesson.id, nextStatus, now);
      }
      return redirect(`/learn/admin/lessons/${lessonRouteId(lesson.id)}`);
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
    const studentChanged = lesson.student_id !== validation.value.studentId;
    const scheduleChanged = lesson.start_at !== validation.value.startAt
      || lesson.end_at !== validation.value.endAt
      || lesson.timezone !== validation.value.timezone;
    if (studentChanged && scheduleChanged) return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "Change the student and schedule in separate steps.", lesson));
    if (scheduleChanged && lesson.status !== "scheduled") return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "Only scheduled lessons can be rescheduled.", lesson));
    if (scheduleChanged && Date.parse(validation.value.startAt) <= Date.now()) return appPage(active.user, csrfToken, "Edit lesson", lessonForm(csrfToken, url.pathname, students, "Choose a future time.", lesson));
    const changed = hasMaterialLessonChange(lesson, {
      student_id: validation.value.studentId,
      start_at: validation.value.startAt,
      end_at: validation.value.endAt,
      timezone: validation.value.timezone,
      external_url: validation.value.externalUrl
    });
    const now = new Date().toISOString();
    const rescheduled = scheduleChanged && !studentChanged
      ? await rescheduleLesson(db, {
        lessonId: lesson.id,
        studentId: lesson.student_id,
        actorUserId: active.user.id,
        actorRole: "ADMIN",
        startAt: validation.value.startAt,
        endAt: validation.value.endAt,
        timezone: validation.value.timezone,
        reason: "Administrative lesson edit",
        previousStartAt: lesson.start_at,
        previousEndAt: lesson.end_at,
        previousTimezone: lesson.timezone,
        now
      })
      : false;
    if (scheduleChanged && validation.value.studentId === lesson.student_id && !rescheduled) {
      return messagePage("Lesson changed", "This lesson changed while you were editing it. Refresh and try again.", 409);
    }
    await updateLesson(db, { ...validation.value, id: lesson.id, now });
    if (changed) {
      const updatedLesson = await findLesson(db, lesson.id);
      const student = await findActiveStudentRecipient(db, validation.value.studentId);
      if (updatedLesson && student?.learn_user_id && student.learn_user_email) {
        const eventId = `${lesson.id}:${lesson.start_at}:${lesson.end_at}:${lesson.timezone}:${lesson.external_url ?? ""}->${updatedLesson.start_at}:${updatedLesson.end_at}:${updatedLesson.timezone}:${updatedLesson.external_url ?? ""}`;
        const type = rescheduled ? "LESSON_RESCHEDULED" : "LESSON_CHANGED";
        const content = renderEmail(type, lessonMailData(updatedLesson), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
        await emitNotification(env, {
          type,
          eventId,
          recipientUserId: student.learn_user_id,
          studentId: student.id,
          lessonId: updatedLesson.id,
          content
        }, now);
      }
    }
    return redirect(`/learn/admin/lessons/${lessonRouteId(lesson.id)}`);
  }
  return messagePage("Not found", "That Learn route does not exist.", 404);
}

function studentDashboard(user: AppUser, csrfToken: string): Response {
  return appPage(user, csrfToken, "Dashboard", `<h1>Dashboard</h1><section class="card"><h2>Calendar</h2>${buttonLink("/learn/student/calendar", "View calendar")}</section>`);
}

function studentBillingStage(stage: string, context: { userId: string; studentId?: string | null }): void {
  console.info("student_billing_stage", {
    stage,
    userId: context.userId,
    studentId: context.studentId ?? null
  });
}

async function runStudentBillingStage<T>(
  stage: string,
  context: { userId: string; studentId?: string | null },
  operation: () => Promise<T>
): Promise<T> {
  studentBillingStage(`${stage}_START`, context);
  try {
    const result = await operation();
    studentBillingStage(`${stage}_COMPLETE`, context);
    return result;
  } catch (error) {
    console.error("student_billing_stage_failed", {
      stage,
      userId: context.userId,
      studentId: context.studentId ?? null,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message.slice(0, 240) : "Unknown billing failure"
    });
    throw error;
  }
}

async function studentDirectDebitStatus(
  db: D1Database,
  env: Env,
  studentId: string
): Promise<DirectDebitStatus> {
  const account = await findBillingAccount(db, studentId);
  if (account) {
    const nextReconcileAt = account.next_reconcile_at ? Date.parse(account.next_reconcile_at) : Number.NaN;
    const reconciliationDue = !Number.isFinite(nextReconcileAt) || nextReconcileAt <= Date.now();
    const reconciledAt = account.last_reconciled_at ? Date.parse(account.last_reconciled_at) : Number.NaN;
    const stale = !Number.isFinite(reconciledAt) || reconciledAt <= Date.now() - 24 * 60 * 60_000;
    const unresolvedWithoutRecordedError = account.mandate_state === "UNKNOWN" && !account.last_error_code;
    if (unresolvedWithoutRecordedError || (reconciliationDue && (account.mandate_state === "UNKNOWN" || stale))) {
      return reconcileBillingAccountMandate(db, env, studentId, new Date().toISOString(), freeAgentFetch);
    }
    return account.mandate_state;
  }
  const link = await findExternalAccountingLink(db, studentId, env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production" ? env.FREEAGENT_ENVIRONMENT : undefined);
  if (!link || link.status !== "VERIFIED") return "SETUP_REQUIRED";
  try {
    const contact = await providerCall(db, env, new Date().toISOString(), freeAgentFetch, (client, token) =>
      client.getContact(token, link.external_url)
    );
    return mapDirectDebitStatus(contact?.directDebitMandateState ?? null, true);
  } catch (error) {
    console.error("student_billing_mandate_status_failed", {
      studentId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error instanceof FreeAgentApiError ? error.shape.code : "UNKNOWN"
    });
    return "UNKNOWN";
  }
}

function billingCustomerStatusLabel(kind: BillingHistoryItem["kind"], status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "SUBMITTED") return "Collection submitted";
  if (normalized === "PAYMENT_PENDING" || normalized === "PENDING") return "Payment processing";
  if (normalized === "SCHEDULED") return "Collection scheduled";
  if (normalized === "CONFIRMED" || normalized === "PAID") return "Payment confirmed";
  if (normalized === "FAILED") return "Payment failed";
  if (normalized === "UNKNOWN" || normalized === "RECONCILIATION_REQUIRED") return "Needs checking";
  if (normalized === "SENT" || normalized === "INVOICE_CREATED") return "Invoice outstanding";
  if (normalized === "CREDIT_COVERED" || normalized === "SETTLED") return "Covered by credit";
  if (kind === "CREDIT" || kind === "CREDIT_CONSUMED") return billingReadinessLabel(normalized);
  return billingReadinessLabel(normalized);
}

function directDebitStatusClass(status: DirectDebitStatus): string {
  if (status === "ACTIVE") return "active";
  if (status === "FAILED" || status === "INACTIVE") return "failed";
  if (status === "AUTHORISATION_PENDING") return "pending";
  if (status === "SETUP_REQUIRED") return "sent";
  if (status === "UNKNOWN") return "unknown";
  return "suppressed";
}

async function studentBillingPage(user: AppUser, csrfToken: string, db: D1Database, env: Env): Promise<Response> {
  const context = { userId: user.id };
  studentBillingStage("STUDENT_BILLING_START", context);
  studentBillingStage("AUTHENTICATED_USER_RESOLVED", context);
  const student = await runStudentBillingStage("ACTIVE_STUDENT_RESOLVED", context, () => findActiveStudentForUser(db, user.id));
  if (!student) {
    studentBillingStage("STUDENT_BILLING_END", context);
    return messagePage("Billing unavailable", "Your Learn account is not linked to an active student record.", 409);
  }
  const studentContext = { userId: user.id, studentId: student.id };
  const today = currentCalendarDate();
  const nextSeven = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  studentBillingStage("CURRENT_DATE_RESOLVED", studentContext);
  const [credits, history, upcoming] = await Promise.all([
    runStudentBillingStage("CREDIT_QUERY", studentContext, async () => (await listCustomerCreditBalances(db)).filter((row) => row.student_id === student.id)),
    runStudentBillingStage("HISTORY_QUERY", studentContext, () => listBillingHistory(db, student.id)),
    runStudentBillingStage("UPCOMING_QUERY", studentContext, () => listUpcomingBillingRows(db, today, nextSeven, student.id)),
  ]);
  const mandateStatus = await runStudentBillingStage("DIRECT_DEBIT_STATUS_QUERY", studentContext, () =>
    studentDirectDebitStatus(db, env, student.id)
  );
  const mandateCopy = directDebitStatusCopy(mandateStatus);
  studentBillingStage("TOTALS_CALCULATED", { ...studentContext, studentId: student.id });
  const availableCredit = credits.reduce((total, credit) => total + (billingMinorValue(credit.remaining_amount_minor) ?? 0n), 0n);
  const outstanding = upcoming.reduce((total, row) => total + (billingMinorValue(row.amount_minor) ?? 0n), 0n);
  const creditRows = credits.length
    ? credits.map((credit) => `<tr><td>${escapeHtml(billingDateLabel(credit.created_at))}</td><td>Cancellation credit</td><td>${billingMoney(credit.original_amount_minor)}</td><td>${billingMoney(credit.amount_consumed_minor)}</td><td>${billingMoney(credit.remaining_amount_minor)}</td><td>${escapeHtml(billingCustomerStatusLabel("CREDIT", credit.status))}</td></tr>`).join("")
    : `<tr><td colspan="6">No credit history.</td></tr>`;
  const upcomingRows = upcoming.length
    ? upcoming.map((row) => `<tr><td>${escapeHtml(billingDateLabel(row.occurred_at))}</td><td>${billingMoney(row.amount_minor)}</td><td>${billingMoney(row.credit_available_minor)}</td><td>${escapeHtml(billingCustomerStatusLabel(row.kind, row.status))}</td><td>${escapeHtml(row.collection_date ? billingDateLabel(row.collection_date) : "Not scheduled")}</td></tr>`).join("")
    : `<tr><td colspan="5">No lessons in the next seven days.</td></tr>`;
  const historyRows = history.length
    ? history.map((item) => `<tr><td>${escapeHtml(billingDateLabel(item.occurred_at))}</td><td>${escapeHtml(item.description)}</td><td>${billingMoney(item.amount_minor)}</td><td>${escapeHtml(billingCustomerStatusLabel(item.kind, item.status))}</td></tr>`).join("")
    : `<tr><td colspan="4">No billing history yet.</td></tr>`;
  const mandateAction = mandateStatus === "ACTIVE"
    ? ""
    : `<div class="direct-debit-actions"><a class="button secondary" href="mailto:billing@foxtutor.org?subject=Direct%20Debit%20setup%20help">Contact billing</a></div><p class="direct-debit-support">Billing support: <a href="mailto:billing@foxtutor.org">billing@foxtutor.org</a></p>`;
  studentBillingStage("BILLING_HTML_RENDER_START", studentContext);
  const response = appPage(user, csrfToken, "Billing", `<div class="page-heading"><div><h1>My billing</h1><p class="lede">Your billing summary and Direct Debit status.</p></div></div><div class="summary-grid student-billing-summary"><section class="summary-card"><span>Available credit</span><strong>${billingMoney(availableCredit)}</strong><small>available to use</small></section><section class="summary-card"><span>Upcoming charges</span><strong>${billingMoney(outstanding)}</strong><small>next seven days</small></section></div><section class="card direct-debit-card" aria-labelledby="direct-debit-heading"><div class="section-heading"><div><h2 id="direct-debit-heading">Direct Debit</h2><p class="lede">${escapeHtml(mandateCopy.description)}</p></div><span class="status status-${directDebitStatusClass(mandateStatus)}">${escapeHtml(mandateCopy.label)}</span></div><p>FoxTutor uses the secure provider flow for Direct Debit. Bank details must be entered only through that provider flow, never by email or in FoxTutor Learn. FoxTutor stores only the status needed to run billing.</p>${mandateStatus === "AUTHORISATION_PENDING" ? "<p>Use the secure provider authorisation request you received. The provider may take a few working days to confirm it.</p>" : ""}<p class="muted">${escapeHtml(mandateCopy.action)}</p>${mandateAction}</section><section class="card"><h2>Upcoming lessons and charges</h2><div class="table-wrap"><table><thead><tr><th>Lesson</th><th>Charge</th><th>Credit</th><th>Invoice/payment</th><th>Collection date</th></tr></thead><tbody>${upcomingRows}</tbody></table></div></section><section class="card"><h2>Credit history</h2><p class="muted">Credit is created when an eligible cancellation is processed and is applied to future lesson charges automatically.</p><div class="table-wrap"><table><thead><tr><th>Created</th><th>Source</th><th>Original</th><th>Consumed</th><th>Remaining</th><th>Status</th></tr></thead><tbody>${creditRows}</tbody></table></div></section><section class="card"><h2>Billing history</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Activity</th><th>Amount</th><th>Status</th></tr></thead><tbody>${historyRows}</tbody></table></div></section>`);
  studentBillingStage("BILLING_HTML_RENDER_COMPLETE", studentContext);
  studentBillingStage("STUDENT_BILLING_END", studentContext);
  return response;
}

async function handleStudent(request: Request, env: Env, active: ActiveSession, route: LearnRoute): Promise<Response> {
  const db = env.DB as D1Database;
  const csrfToken = active.csrfToken;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (route === "student" && pathname === "/learn/student") return studentDashboard(active.user, csrfToken);
  if (route === "student-billing") return studentBillingPage(active.user, csrfToken, db, env);
  if (route === "student-calendar") {
    const lessons = await listLessonsForUser(db, active.user.id);
    const feed = await findActiveCalendarFeedForOwner(db, active.user.id);
    return appPage(active.user, csrfToken, "Calendar", calendarPage(csrfToken, "/learn/student/calendar/feed", lessons, "STUDENT", feed, await currentCalendarFeedUrl(request, env, feed)));
  }
  if (route === "student-resources") {
    const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const resources = await listResourcesForStudent(db, active.user.id, search);
    if (request.method === "GET" && request.headers.get("X-Resource-Fragment") === "1") {
      return resourceFragmentResponse({
        finderHtml: "",
        resultsHtml: studentResourceResults(resources, search),
        url: `/learn/student/resources${search ? `?q=${encodeURIComponent(search)}` : ""}`,
        total: resources.length
      });
    }
    return appPage(active.user, csrfToken, "Resources", `<div class="student-resource-page"><div class="page-heading"><h1>Resources</h1></div><form class="resource-student-search" method="get" action="/learn/student/resources" data-student-resource-finder><label class="sr-only" for="student-resource-search">Search your resources</label><span class="resource-search-icon" aria-hidden="true">${resourceSearchIcon()}</span><input id="student-resource-search" type="search" name="q" value="${escapeHtml(search)}" placeholder="Search your resources…" autocomplete="off"><button class="resource-search-submit" type="submit" aria-label="Search">${resourceSearchIcon()}</button></form><p class="resource-update-error form-error" data-student-resource-update-error role="alert" hidden>We couldn't update the resource list. Please try again.</p><div data-student-resource-results aria-live="polite" aria-busy="false">${studentResourceResults(resources, search)}</div></div>`);
  }
  if (route === "student-resource-download") {
    const id = resourceIdFromPath(url.pathname);
    if (!id || (request.method !== "GET" && request.method !== "HEAD")) return messagePage("Not found", "That resource does not exist.", 404);
    const resource = await findResourceForStudent(db, id, active.user.id);
    if (!resource) return messagePage("Not found", "That resource does not exist.", 404);
    return downloadResource(request, env, resource);
  }
  if (route === "student-calendar-feed") {
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const student = await findActiveStudentForUser(db, active.user.id);
    if (!student) return messagePage("Calendar unavailable", "Your Learn account is not linked to an active student record.", 409);
    if (!env.CALENDAR_FEED_ENCRYPTION_KEY) return messagePage("Calendar unavailable", "The calendar subscription could not be updated. Try again later.", 503);
    const hadFeed = Boolean(await findActiveCalendarFeedForOwner(db, active.user.id));
    const token = generateFeedToken();
    const now = new Date().toISOString();
    await rotateCalendarFeed(db, {
      id: crypto.randomUUID(),
      ownerUserId: active.user.id,
      studentId: student.id,
      tokenHash: await hashFeedToken(token),
      tokenLast4: feedTokenLast4(token),
      tokenCiphertext: await encryptFeedToken(token, env.CALENDAR_FEED_ENCRYPTION_KEY),
      now
    });
    const lessons = await listLessonsForUser(db, active.user.id);
    const feed = await findActiveCalendarFeedForOwner(db, active.user.id);
    const subscription = calendarSubscriptionCard(csrfToken, "/learn/student/calendar/feed", feed, calendarFeedUrl(request, env, token), true);
    if (request.headers.get("X-Calendar-Fragment") === "1") return calendarFragmentResponse(subscription, hadFeed ? "Calendar link regenerated" : "Calendar link generated");
    return appPage(active.user, csrfToken, "Calendar", calendarPage(csrfToken, "/learn/student/calendar/feed", lessons, "STUDENT", feed, calendarFeedUrl(request, env, token), true));
  }
  if (route === "student" || route === "student-lessons") {
    const lessons = await listLessonsForUser(db, active.user.id);
    const now = Date.now();
    const upcoming = lessons.filter((lesson) => lesson.status === "scheduled" && new Date(lesson.start_at).getTime() >= now);
    const past = lessons.filter((lesson) => lesson.status !== "cancelled" && (lesson.status === "completed" || new Date(lesson.start_at).getTime() < now));
    return appPage(active.user, csrfToken, "My lessons", `<h1>My lessons</h1><section class="card"><h2>Upcoming</h2>${lessonTable(upcoming, "/learn/student/lessons", false)}</section><section class="card"><h2>Past</h2>${lessonTable(past, "/learn/student/lessons", false)}</section>`);
  }
  if (route === "student-lesson-cancel") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLessonForUser(db, id, active.user.id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    const now = new Date().toISOString();
    if (request.method === "GET") {
      if (!canStudentCancel(lesson, now)) {
        return messagePage("Cancellation unavailable", "Student cancellation is only available more than 24 hours before the lesson.", 409);
      }
      return appPage(active.user, csrfToken, "Cancel lesson", cancellationConfirmation(csrfToken, lesson));
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const currentLesson = await findLessonForUser(db, id, active.user.id);
    if (!currentLesson) return messagePage("Not found", "That lesson does not exist.", 404);
    if (!canStudentCancel(currentLesson, new Date().toISOString())) return messagePage("Cancellation unavailable", "Student cancellation is only available more than 24 hours before the lesson.", 409);
    const changed = await cancelLesson(db, {
      lessonId: currentLesson.id,
      studentId: currentLesson.student_id,
      actorUserId: active.user.id,
      actorRole: "STUDENT",
      eventType: "STUDENT_CANCELLED",
      billingConsequence: billingConsequenceForStudentCancellation(),
      now: new Date().toISOString(),
      previousStartAt: currentLesson.start_at,
      previousEndAt: currentLesson.end_at,
      previousTimezone: currentLesson.timezone
    });
    if (changed) {
      const student = await findActiveStudentRecipient(db, currentLesson.student_id);
      if (student?.learn_user_id && student.learn_user_email) {
        const content = renderEmail("CANCELLATION_PROCESSED", {
          ...lessonMailData(currentLesson, false),
          undoPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(currentLesson.id))}/undo-cancellation`
        }, canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
        await emitNotification(env, {
          type: "CANCELLATION_PROCESSED",
          eventId: currentLesson.id,
          recipientUserId: student.learn_user_id,
          studentId: student.id,
          lessonId: currentLesson.id,
          content
        });
      }
    }
    return redirect(`/learn/student/lessons/${lessonRouteId(currentLesson.id)}`);
  }
  if (route === "student-lesson-undo-cancellation") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLessonForUser(db, id, active.user.id);
    if (!lesson || lesson.status !== "cancelled") return messagePage("Undo unavailable", "That lesson is not currently cancelled.", 409);
    const history = await listLessonHistory(db, lesson.id);
    const latestCancellation = history.find((event) => ["STUDENT_CANCELLED", "ADMIN_CANCELLED", "CANCELLATION_APPROVED"].includes(event.event_type));
    const canUndo = latestCancellation?.event_type === "STUDENT_CANCELLED"
      && latestCancellation.actor_role === "STUDENT"
      && latestCancellation.initiated_by_user_id === active.user.id;
    if (!canUndo) return messagePage("Undo unavailable", "Only a student cancellation can be undone.", 403);
    if (request.method === "GET") return appPage(active.user, csrfToken, "Undo cancellation", undoCancellationConfirmation(csrfToken, lesson));
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const changed = await undoStudentCancellation(db, {
      lessonId: lesson.id,
      studentId: lesson.student_id,
      actorUserId: active.user.id,
      now: new Date().toISOString(),
      startAt: lesson.start_at,
      endAt: lesson.end_at,
      timezone: lesson.timezone
    });
    return changed ? redirect(`/learn/student/lessons/${lessonRouteId(lesson.id)}`) : messagePage("Undo unavailable", "The lesson could not be restored. Refresh and try again.", 409);
  }
  if (route === "student-lesson-reschedule") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLessonForUser(db, id, active.user.id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    const now = new Date().toISOString();
    const pending = await findPendingRescheduleRequestForLesson(db, lesson.id);
    if (request.method === "GET") {
      if (lesson.status !== "scheduled" || Date.parse(lesson.start_at) <= Date.parse(now)) return messagePage("Reschedule unavailable", "Only future scheduled lessons can be rescheduled.", 409);
      if (pending) return appPage(active.user, csrfToken, "Reschedule request", `<section class="card form-card"><h1>Reschedule request pending</h1><p>Your tutor will review the requested time.</p></section>`);
      return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, lesson, url.pathname, undefined, !canStudentReschedule(lesson, now), true));
    }
    if (request.method !== "POST" || !(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    const currentLesson = await findLessonForUser(db, id, active.user.id);
    if (!currentLesson) return messagePage("Not found", "That lesson does not exist.", 404);
    const currentNow = new Date().toISOString();
    if (currentLesson.status !== "scheduled" || Date.parse(currentLesson.start_at) <= Date.parse(currentNow)) return messagePage("Reschedule unavailable", "Only future scheduled lessons can be rescheduled.", 409);
    if (await findPendingRescheduleRequestForLesson(db, currentLesson.id)) return redirect(`/learn/student/lessons/${lessonRouteId(currentLesson.id)}`);
    const form = await parseForm(request);
    if (!form) return messagePage("Invalid request", "The submitted form is invalid or too large.", 400);
    const timezone = currentLesson.timezone;
    const studentTime = studentRequestedRescheduleTime(form, currentLesson);
    const start = studentTime.start ? { value: studentTime.start, error: undefined } : { value: null, error: studentTime.error };
    const end = studentTime.end ? { value: studentTime.end, error: undefined } : { value: null, error: studentTime.error };
    let error: string | null = null;
    if (!start.value) error = start.error ?? "Enter a valid start time.";
    else if (!end.value) error = end.error ?? "Enter a valid end time.";
    else if (end.value <= start.value) error = "The end time must be after the start time.";
    else if (Date.parse(start.value) <= Date.now()) error = "Choose a future time.";
    if (error || !start.value || !end.value) return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, currentLesson, url.pathname, error ?? "Choose a valid new time.", !canStudentReschedule(currentLesson, currentNow), true));
    const startAt = start.value;
    const endAt = end.value;
    if (startAt === currentLesson.start_at && endAt === currentLesson.end_at && timezone === currentLesson.timezone) return redirect(`/learn/student/lessons/${lessonRouteId(currentLesson.id)}`);
    if (await hasOverlappingLesson(db, currentLesson.student_id, startAt, endAt, currentLesson.id)) return appPage(active.user, csrfToken, "Reschedule lesson", rescheduleForm(csrfToken, currentLesson, url.pathname, "That time overlaps another lesson."));
    if (!canStudentReschedule(currentLesson, currentNow)) {
      const created = await createRescheduleRequest(db, {
        id: crypto.randomUUID(),
        lessonId: currentLesson.id,
        studentId: currentLesson.student_id,
        userId: active.user.id,
        startAt,
        endAt,
        timezone,
        reason: "Student reschedule request",
        now: currentNow
      });
      return created
        ? redirect(`/learn/student/lessons/${lessonRouteId(currentLesson.id)}`)
        : messagePage("Reschedule unavailable", "This request could not be created. Refresh and try again.", 409);
    }
    const changed = await rescheduleLesson(db, {
      lessonId: currentLesson.id,
      studentId: currentLesson.student_id,
      actorUserId: active.user.id,
      actorRole: "STUDENT",
      startAt,
      endAt,
      timezone,
      reason: "Student reschedule",
      previousStartAt: currentLesson.start_at,
      previousEndAt: currentLesson.end_at,
      previousTimezone: currentLesson.timezone,
      now: new Date().toISOString()
    });
    if (changed) {
      const updatedLesson = await findLesson(db, currentLesson.id);
      const student = await findActiveStudentRecipient(db, currentLesson.student_id);
      if (updatedLesson && student?.learn_user_id && student.learn_user_email) {
        const content = renderEmail("LESSON_RESCHEDULED", lessonMailData(updatedLesson), canonicalLearnOrigin(env.PUBLIC_ORIGIN, url.origin));
        await emitNotification(env, {
          type: "LESSON_RESCHEDULED",
          eventId: `${currentLesson.id}:${updatedLesson.start_at}:${updatedLesson.end_at}:${updatedLesson.timezone}`,
          recipientUserId: student.learn_user_id,
          studentId: student.id,
          lessonId: currentLesson.id,
          content
        });
      }
    }
    return redirect(`/learn/student/lessons/${lessonRouteId(currentLesson.id)}`);
  }
  if (route === "student-lesson-report" || route === "student-lesson-report-pdf") {
    const id = lessonIdFromPath(url.pathname);
    if (!id) return messagePage("Not found", "That lesson report does not exist.", 404);
    const report = await findSentLessonReportForStudent(db, id, active.user.id);
    if (!report) return messagePage("Not found", "That lesson report does not exist.", 404);
    if (route === "student-lesson-report-pdf") return await downloadLessonReportPdf(request, env, report);
    return appPage(active.user, csrfToken, reportDocumentTitleFromSnapshot(report), reportDocument(report, false), true);
  }
  if (route === "student-lesson") {
    const id = lessonIdFromPath(new URL(request.url).pathname);
    if (!id) return messagePage("Not found", "That lesson does not exist.", 404);
    const lesson = await findLessonForUser(db, id, active.user.id);
    if (!lesson) return messagePage("Not found", "That lesson does not exist.", 404);
    const history = await listLessonHistory(db, lesson.id);
    const now = new Date().toISOString();
    const pending = await findPendingRescheduleRequestForLesson(db, lesson.id);
    const latestCancellation = history.find((event) => ["STUDENT_CANCELLED", "ADMIN_CANCELLED", "CANCELLATION_APPROVED"].includes(event.event_type));
    const canUndo = lesson.status === "cancelled"
      && latestCancellation?.event_type === "STUDENT_CANCELLED"
      && latestCancellation.actor_role === "STUDENT"
      && latestCancellation.initiated_by_user_id === active.user.id;
    if (lesson.status === "cancelled") {
      return appPage(active.user, csrfToken, "Cancelled lesson", `<section class="card cancellation-result"><h1>Lesson cancelled</h1><p class="lede">${escapeHtml(formatLessonTime(lesson))}</p><p>This lesson is no longer scheduled.</p>${studentLessonActions(lesson, csrfToken, pending, canUndo, now)}</section>`);
    }
    const resources = await listResourcesForLessonForStudent(db, lesson.id, active.user.id);
    const report = await findSentLessonReportForStudent(db, lesson.id, active.user.id);
    const join = lesson.status === "scheduled" && lesson.external_url
      ? `<a class="button" href="${escapeHtml(lesson.external_url)}" rel="noreferrer">Join lesson</a>`
      : "";
    return appPage(active.user, csrfToken, "Lesson", `<div class="page-heading"><div><h1>${escapeHtml(formatLessonTime(lesson))}</h1></div>${studentLessonActions(lesson, csrfToken, pending, false, now)}</div><section class="card detail-grid"><p><strong>Status</strong><br><span class="status status-${lesson.status}">${statusLabel(lesson.status)}</span></p><p><strong>Lesson destination</strong><br>${join || (lesson.external_url ? "Unavailable for cancelled/completed lesson" : "Not provided")}</p></section>${report ? `<section class="card"><div class="section-heading"><div><h2>Report available</h2></div>${buttonLink(`/learn/student/lessons/${lessonRouteId(lesson.id)}/report`, "View report")}</div></section>` : ""}<section class="card resource-section"><div class="section-heading"><div><h2>Resources</h2></div></div>${resources.length ? `<div class="resource-student-list">${resources.map((resource) => `<article class="resource-student-item"><div><strong>${escapeHtml(resource.original_filename)}</strong><p>${escapeHtml(fileTypeLabel(resource.content_type))} · ${escapeHtml(resourceSize(resource.size_bytes))}</p></div>${resourceActionButtons(resource, false)}</article>`).join("")}</div>` : `<p class="muted">No resources have been shared for this lesson.</p>`}</section>`);
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
  if (route === "admin-accounting-callback") return handleAccountingOAuthCallback(request, env);
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
  if (route === "legal-terms") return withSessionCookies(appPage(active.user, active.csrfToken, "Terms & Conditions", legalPage("Terms & Conditions", learnTermsContent)), sessionResult.setCookies);
  if (route === "legal-privacy") return withSessionCookies(appPage(active.user, active.csrfToken, "Privacy Policy", legalPage("Privacy Policy", learnPrivacyContent)), sessionResult.setCookies);
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
  },
  async scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    const db = env.DB;
    if (!db) return;
    const now = new Date(controller.scheduledTime).toISOString();
    context.waitUntil((async () => {
      await markElapsedScheduledLessonsCompleted(db, now);
      await ensureAllRecurringSeriesMaterialised(db, now.slice(0, 10), now);
      await runBillingProvisioningScheduler(db, env, now, freeAgentFetch, 5);
      const pendingBillingEvents = await listPendingBillingEvents(db, now, 50);
      await Promise.all(pendingBillingEvents.map((event) => ensureBillingInvoiceForEvent(db, {
        billingEventId: event.id,
        now,
        providerEnvironment: configuredEnvironment(env)
      })));
      await ensureDueDirectDebitOperations(db, now.slice(0, 10), now);
      const dueAccounting = await listDueAccountingOutbox(db, now, 10);
      const dueBillingProviderOperations = env.FREEAGENT_BILLING_PROVIDER_ENABLED === "true"
        ? await listDueBillingProviderOperations(db, now, 10)
        : [];
      await Promise.all([
        runReminderScheduler(db, env, now),
        runDstWarningScheduler(db, env, now),
        processDueBillingInvoiceOperations(db, env, now, freeAgentFetch, 20),
        reconcileBillingInvoices(db, env, now, freeAgentFetch, 20),
        ...dueAccounting.map((event) => processAccountingOutbox(db, env, event.id, now, freeAgentFetch)),
        ...dueBillingProviderOperations.map((operation) => processCreditNoteProviderOperation(db, env, operation.id, now, freeAgentFetch))
      ]);
      const london = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(new Date(controller.scheduledTime));
      const londonHour = london.find((part) => part.type === "hour")?.value;
      const londonMinute = london.find((part) => part.type === "minute")?.value;
      if (londonHour === "03" && londonMinute === "00") {
        await runBillingSentinel(db, now);
      }
    })());
  }
};
