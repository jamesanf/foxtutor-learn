export type Role = "ADMIN" | "STUDENT";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
}

export type LearnRoute =
  | "entry"
  | "admin"
  | "admin-students"
  | "admin-calendar"
  | "admin-calendar-feed"
  | "admin-bookings"
  | "admin-resources"
  | "admin-resource-search"
  | "admin-resource-form"
  | "admin-resource"
  | "admin-resource-delete"
  | "admin-resource-bulk-delete"
  | "admin-resource-download"
  | "admin-student-form"
  | "admin-student"
  | "admin-student-edit"
  | "admin-student-deactivate"
  | "admin-lessons"
  | "admin-lesson-form"
  | "admin-lesson"
  | "admin-lesson-edit"
  | "admin-lesson-status"
  | "admin-lesson-report"
  | "admin-lesson-report-pdf"
  | "admin-notifications"
  | "admin-notification"
  | "admin-accounting"
  | "admin-billing"
  | "admin-billing-action"
  | "admin-billing-audit"
  | "admin-series"
  | "admin-series-form"
  | "admin-series-action"
  | "admin-accounting-settings"
  | "admin-accounting-connect"
  | "admin-accounting-callback"
  | "admin-accounting-contact"
  | "admin-accounting-retry"
  | "admin-accounting-reconcile"
  | "admin-reschedules"
  | "admin-reschedule-approve"
  | "admin-reschedule-reject"
  | "admin-lesson-reschedule"
  | "student"
  | "student-billing"
  | "student-calendar"
  | "student-calendar-feed"
  | "student-lessons"
  | "student-lesson"
  | "student-lesson-cancel"
  | "student-lesson-undo-cancellation"
  | "student-lesson-reschedule"
  | "student-lesson-report"
  | "student-lesson-report-pdf"
  | "student-resources"
  | "student-resource-download"
  | "legal-terms"
  | "legal-privacy"
  | "logout"
  | "asset"
  | "not-found";

export function classifyLearnRoute(pathname: string): LearnRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/learn") return "entry";
  if (path === "/learn/admin") return "admin";
  if (path === "/learn/admin/students") return "admin-students";
  if (path === "/learn/admin/calendar") return "admin-calendar";
  if (path === "/learn/admin/calendar/feed") return "admin-calendar-feed";
  if (path === "/learn/admin/bookings") return "admin-bookings";
  if (path === "/learn/admin/resources") return "admin-resources";
  if (path === "/learn/admin/resources/search") return "admin-resource-search";
  if (path === "/learn/admin/resources/new") return "admin-resource-form";
  if (/^\/learn\/admin\/resources\/[^/]+\/download$/.test(path)) return "admin-resource-download";
  if (path === "/learn/admin/resources/bulk-delete") return "admin-resource-bulk-delete";
  if (/^\/learn\/admin\/resources\/[^/]+\/delete$/.test(path)) return "admin-resource-delete";
  if (/^\/learn\/admin\/resources\/[^/]+$/.test(path)) return "admin-resource";
  if (path === "/learn/admin/students/new") return "admin-student-form";
  if (/^\/learn\/admin\/students\/[^/]+\/edit$/.test(path)) return "admin-student-edit";
  if (/^\/learn\/admin\/students\/[^/]+\/deactivate$/.test(path)) return "admin-student-deactivate";
  if (/^\/learn\/admin\/students\/[^/]+$/.test(path)) return "admin-student";
  if (path === "/learn/admin/lessons") return "admin-lessons";
  if (path === "/learn/admin/lessons/new") return "admin-lesson-form";
  if (/^\/learn\/admin\/lessons\/[^/]+\/edit$/.test(path)) return "admin-lesson-edit";
  if (/^\/learn\/admin\/lessons\/[^/]+\/status$/.test(path)) return "admin-lesson-status";
  if (/^\/learn\/admin\/lessons\/[^/]+\/reschedule$/.test(path)) return "admin-lesson-reschedule";
  if (/^\/learn\/admin\/lessons\/[^/]+\/report\.pdf$/.test(path)) return "admin-lesson-report-pdf";
  if (/^\/learn\/admin\/lessons\/[^/]+\/report$/.test(path)) return "admin-lesson-report";
  if (/^\/learn\/admin\/lessons\/[^/]+$/.test(path)) return "admin-lesson";
  if (path === "/learn/admin/notifications" || path === "/learn/admin/notifications/settings" || path.startsWith("/learn/admin/notifications/preview/")) return "admin-notifications";
  if (/^\/learn\/admin\/notifications\/[^/]+\/preview$/.test(path)) return "admin-notification";
  if (/^\/learn\/admin\/notifications\/[^/]+$/.test(path)) return "admin-notification";
  if (path === "/learn/admin/accounting") return "admin-accounting";
  if (path === "/learn/admin/billing") return "admin-billing";
  if (/^\/learn\/admin\/billing\/audit\/[^/]+$/.test(path)) return "admin-billing-audit";
  if (/^\/learn\/admin\/billing\/(?:alerts|invoices|credits|emergency-payg)\//.test(path)) return "admin-billing-action";
  if (path === "/learn/admin/series") return "admin-series";
  if (path === "/learn/admin/series/new") return "admin-series-form";
  if (/^\/learn\/admin\/series\/[^/]+\/(?:pause|resume|end)$/.test(path)) return "admin-series-action";
  if (path === "/learn/admin/accounting/settings") return "admin-accounting-settings";
  if (path === "/learn/admin/accounting/connect" || /^\/learn\/admin\/accounting\/connect\/(sandbox|production)$/.test(path)) return "admin-accounting-connect";
  if (path === "/learn/admin/accounting/oauth/callback") return "admin-accounting-callback";
  if (/^\/learn\/admin\/accounting\/contacts\/[^/]+(?:\/remove)?$/.test(path)) return "admin-accounting-contact";
  if (/^\/learn\/admin\/accounting\/[^/]+\/retry$/.test(path)) return "admin-accounting-retry";
  if (/^\/learn\/admin\/accounting\/[^/]+\/reconcile$/.test(path)) return "admin-accounting-reconcile";
  if (path === "/learn/admin/reschedules") return "admin-reschedules";
  if (/^\/learn\/admin\/reschedules\/[^/]+\/approve$/.test(path)) return "admin-reschedule-approve";
  if (/^\/learn\/admin\/reschedules\/[^/]+\/reject$/.test(path)) return "admin-reschedule-reject";
  if (path === "/learn/student") return "student";
  if (path === "/learn/student/billing") return "student-billing";
  if (path === "/learn/student/calendar") return "student-calendar";
  if (path === "/learn/student/calendar/feed") return "student-calendar-feed";
  if (path === "/learn/student/lessons") return "student";
  if (/^\/learn\/student\/lessons\/[^/]+\/report\.pdf$/.test(path)) return "student-lesson-report-pdf";
  if (/^\/learn\/student\/lessons\/[^/]+\/report$/.test(path)) return "student-lesson-report";
  if (/^\/learn\/student\/lessons\/[^/]+\/cancel$/.test(path)) return "student-lesson-cancel";
  if (/^\/learn\/student\/lessons\/[^/]+\/undo-cancellation$/.test(path)) return "student-lesson-undo-cancellation";
  if (/^\/learn\/student\/lessons\/[^/]+\/reschedule$/.test(path)) return "student-lesson-reschedule";
  if (/^\/learn\/student\/lessons\/[^/]+$/.test(path)) return "student-lesson";
  if (path === "/learn/student/resources") return "student-resources";
  if (/^\/learn\/student\/resources\/[^/]+\/download$/.test(path)) return "student-resource-download";
  if (path === "/learn/terms") return "legal-terms";
  if (path === "/learn/privacy") return "legal-privacy";
  if (path === "/learn/logout") return "logout";
  if (
    path === "/learn/assets/learn.css" ||
    path === "/learn/assets/learn.js" ||
    path === "/learn/assets/learn_logo-120.webp" ||
    path === "/learn/assets/learn_logo-240.webp" ||
    path === "/learn/assets/foxlearninglogo-120.webp" ||
    path === "/learn/assets/foxlearninglogo-240.webp" ||
    path === "/learn/assets/fonts/geist-latin-wght-normal.woff2" ||
    path === "/learn/assets/my-favicon/favicon.ico" ||
    path === "/learn/assets/my-favicon/favicon-96x96.png" ||
    path === "/learn/assets/my-favicon/apple-touch-icon.png" ||
    path === "/learn/assets/my-favicon/site.webmanifest" ||
    path === "/learn/assets/my-favicon/web-app-manifest-192x192.png" ||
    path === "/learn/assets/my-favicon/web-app-manifest-512x512.png"
  ) return "asset";
  return "not-found";
}

export function requiredRole(route: LearnRoute): Role | null {
  if (route === "admin" || route.startsWith("admin-")) return "ADMIN";
  if (route === "student" || route.startsWith("student-")) return "STUDENT";
  return null;
}

export function canAccess(user: AppUser, route: LearnRoute): boolean {
  const role = requiredRole(route);
  return role === null || user.role === role;
}
