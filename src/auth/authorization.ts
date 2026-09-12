export type Role = "ADMIN" | "STUDENT";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
}

export type LearnRoute = "entry" | "admin" | "student" | "logout" | "asset" | "not-found";

export function classifyLearnRoute(pathname: string): LearnRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/learn") return "entry";
  if (path === "/learn/admin" || path.startsWith("/learn/admin/")) return "admin";
  if (path === "/learn/student" || path.startsWith("/learn/student/")) return "student";
  if (path === "/learn/logout") return "logout";
  if (path === "/learn/assets/learn.css" || path === "/learn/assets/learn.js") return "asset";
  return "not-found";
}

export function requiredRole(route: LearnRoute): Role | null {
  if (route === "admin") return "ADMIN";
  if (route === "student") return "STUDENT";
  return null;
}

export function canAccess(user: AppUser, route: LearnRoute): boolean {
  const role = requiredRole(route);
  return role === null || user.role === role;
}
