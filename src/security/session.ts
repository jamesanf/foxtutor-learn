import type { AppUser } from "../auth/authorization";
import { cookie, parseCookies } from "./cookies";

export interface ActiveSession {
  user: AppUser;
  csrfToken: string;
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function readSession(request: Request, db: D1Database): Promise<ActiveSession | null> {
  const cookies = parseCookies(request);
  if (!cookies.learn_session || !cookies.learn_csrf) return null;
  const sessionHash = await digest(cookies.learn_session);
  const csrfHash = await digest(cookies.learn_csrf);
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.role, u.status
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.session_hash = ? AND s.csrf_hash = ? AND s.expires_at > ? AND u.status = 'ACTIVE'`
    )
    .bind(sessionHash, csrfHash, new Date().toISOString())
    .first<AppUser>();
  if (!row) return null;
  await db.prepare("UPDATE sessions SET last_seen_at = ? WHERE session_hash = ?").bind(new Date().toISOString(), sessionHash).run();
  return { user: row, csrfToken: cookies.learn_csrf };
}

export async function createSession(
  db: D1Database,
  user: AppUser
): Promise<{ active: ActiveSession; setCookies: string[] }> {
  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const now = new Date();
  const expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await db
    .prepare(
      "INSERT INTO sessions(session_hash,user_id,csrf_hash,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?,?)"
    )
    .bind(await digest(sessionToken), user.id, await digest(csrfToken), now.toISOString(), expiry.toISOString(), now.toISOString())
    .run();
  return {
    active: { user, csrfToken },
    setCookies: [cookie("learn_session", sessionToken, 14 * 24 * 60 * 60, true), cookie("learn_csrf", csrfToken, 14 * 24 * 60 * 60, false)]
  };
}

export function clearSessionCookies(): string[] {
  return [cookie("learn_session", "", 0, true), cookie("learn_csrf", "", 0, false)];
}

export async function csrfValid(request: Request, active: ActiveSession): Promise<boolean> {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return true;
  const form = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")
    ? await request.clone().formData()
    : null;
  const supplied = request.headers.get("X-CSRF-Token") ?? form?.get("csrf");
  return typeof supplied === "string" && supplied === active.csrfToken;
}
