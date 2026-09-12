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
  | "admin-student-form"
  | "admin-student"
  | "admin-student-edit"
  | "admin-student-deactivate"
  | "admin-lessons"
  | "admin-lesson-form"
  | "admin-lesson"
  | "admin-lesson-edit"
  | "admin-lesson-status"
  | "student"
  | "student-lessons"
  | "student-lesson"
  | "logout"
  | "asset"
  | "not-found";

export function classifyLearnRoute(pathname: string): LearnRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/learn") return "entry";
  if (path === "/learn/admin") return "admin";
  if (path === "/learn/admin/students") return "admin-students";
  if (path === "/learn/admin/students/new") return "admin-student-form";
  if (/^\/learn\/admin\/students\/[^/]+\/edit$/.test(path)) return "admin-student-edit";
  if (/^\/learn\/admin\/students\/[^/]+\/deactivate$/.test(path)) return "admin-student-deactivate";
  if (/^\/learn\/admin\/students\/[^/]+$/.test(path)) return "admin-student";
  if (path === "/learn/admin/lessons") return "admin-lessons";
  if (path === "/learn/admin/lessons/new") return "admin-lesson-form";
  if (/^\/learn\/admin\/lessons\/[^/]+\/edit$/.test(path)) return "admin-lesson-edit";
  if (/^\/learn\/admin\/lessons\/[^/]+\/status$/.test(path)) return "admin-lesson-status";
  if (/^\/learn\/admin\/lessons\/[^/]+$/.test(path)) return "admin-lesson";
  if (path === "/learn/student" || path === "/learn/student/lessons") return "student";
  if (/^\/learn\/student\/lessons\/[^/]+$/.test(path)) return "student-lesson";
  if (path === "/learn/logout") return "logout";
  if (path === "/learn/assets/learn.css" || path === "/learn/assets/learn.js") return "asset";
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
