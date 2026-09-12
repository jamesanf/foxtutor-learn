import type { AppUser, Role } from "../auth/authorization";
import { canAccess, classifyLearnRoute, requiredRole } from "../auth/authorization";
import { identityEmail } from "../auth/identity";
import { findActiveUser } from "../db/users";
import { privateHeaders } from "../security/headers";
import { clearSessionCookies, createSession, csrfValid, readSession, type ActiveSession } from "../security/session";

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  ENVIRONMENT?: string;
  PUBLIC_ORIGIN?: string;
  MAIL_API_URL?: string;
  MAIL_API_TOKEN?: string;
}

function htmlDocument(title: string, body: string): Response {
  const headers = privateHeaders("text/html; charset=utf-8");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><title>${title} | Foxtutor Learn</title><link rel="stylesheet" href="/learn.css"></head><body>${body}</body></html>`,
    { headers }
  );
}

function messagePage(title: string, message: string, status: number): Response {
  return new Response(
    htmlDocument(
      title,
      `<main class="centered"><div class="card"><p class="eyebrow">FOXTUTOR LEARN</p><h1>${title}</h1><p>${message}</p><a class="button" href="/learn">Return to Learn</a></div></main>`
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
    ? [["/learn/admin", "Dashboard"], ["/learn/admin/students", "Students"], ["/learn/admin/calendar", "Calendar"], ["/learn/admin/settings", "Settings"]]
    : [["/learn/student", "Dashboard"], ["/learn/student/lessons", "Lessons"], ["/learn/student/resources", "Resources"], ["/learn/student/settings", "Settings"]];
  return links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("");
}

function shell(user: AppUser, csrfToken: string): Response {
  const area = user.role === "ADMIN" ? "Admin dashboard" : "Student dashboard";
  const empty = user.role === "ADMIN"
    ? "The administration workspace is ready for students, lessons and resources in Phase 2."
    : "Your lessons and resources will appear here when they are assigned.";
  const body = `<div class="app-shell"><header class="topbar"><a class="brand" href="/learn"><span class="brand-mark">F</span><span>Foxtutor <strong>Learn</strong></span></a><div class="identity"><span>${escapeHtml(user.display_name)}<small>${user.role}</small></span><form method="post" action="/learn/logout"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><button type="submit" class="link-button">Log out</button></form></div></header><div class="layout"><nav aria-label="Primary navigation">${navigation(user.role)}</nav><main class="content"><p class="eyebrow">PRIVATE LEARNING PORTAL</p><h1>${area}</h1><p class="lede">${escapeHtml(user.email)}</p><section class="empty-state"><div class="empty-icon" aria-hidden="true">*</div><h2>Welcome to Learn</h2><p>${empty}</p></section></main></div></div>`;
  return htmlDocument(area, body);
}

async function requireApplicationSession(request: Request, env: Env): Promise<{ active: ActiveSession | null; response?: Response; setCookies?: string[] }> {
  if (!env.DB) return { active: null, response: messagePage("Service unavailable", "The Learn database is not configured for this environment.", 503) };
  const email = identityEmail(request, env.ENVIRONMENT);
  if (!email) return { active: null, response: messagePage("Authentication required", "Use the configured Google account to enter the private Learn portal.", 401) };
  const user = await findActiveUser(env.DB, email);
  if (!user) return { active: null, response: messagePage("Account not provisioned", "This Google identity is authenticated but has not been invited to Foxtutor Learn.", 403) };
  const existing = await readSession(request, env.DB);
  if (existing && existing.user.id === user.id) return { active: existing };
  const created = await createSession(env.DB, user);
  const response = new Response(null, { status: 204 });
  for (const value of created.setCookies) response.headers.append("Set-Cookie", value);
  return { active: created.active, setCookies: created.setCookies };
}

async function learn(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = classifyLearnRoute(url.pathname);
  if (route === "asset") {
    const assetPath = url.pathname === "/learn.css" ? "/learn.css" : "/learn.js";
    const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, url)));
    const headers = privateHeaders(asset.headers.get("Content-Type") ?? "text/plain");
    return new Response(asset.body, { status: asset.status, headers });
  }
  const sessionResult = await requireApplicationSession(request, env);
  if (sessionResult.response && sessionResult.response.status !== 204) return sessionResult.response;
  const active = sessionResult.active;
  if (!active) return messagePage("Authentication required", "A valid Learn session is required.", 401);
  if (route === "logout") {
    if (!(await csrfValid(request, active))) return messagePage("Request not verified", "Refresh the page and try again.", 403);
    if (env.DB) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(active.user.id).run();
    return redirect("/learn", clearSessionCookies());
  }
  if (route === "entry") {
    return redirect(active.user.role === "ADMIN" ? "/learn/admin" : "/learn/student", sessionResult.setCookies);
  }
  if (route === "not-found") return messagePage("Not found", "That Learn route does not exist.", 404);
  if (!canAccess(active.user, route)) {
    const expected = requiredRole(route);
    return messagePage("Not authorized", `This area is restricted to ${expected === "ADMIN" ? "administrators" : "students"}.`, 403);
  }
  const response = shell(active.user, active.csrfToken);
  for (const value of sessionResult.setCookies ?? []) response.headers.append("Set-Cookie", value);
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/learn" || url.pathname.startsWith("/learn/") || url.pathname === "/learn.css" || url.pathname === "/learn.js") {
      return learn(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
