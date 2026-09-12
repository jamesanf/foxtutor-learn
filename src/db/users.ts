import type { AppUser } from "../auth/authorization";
import { normalizeEmail } from "../auth/identity";

export async function findActiveUser(db: D1Database, rawEmail: string): Promise<AppUser | null> {
  const email = normalizeEmail(rawEmail);
  if (!email) return null;
  return db
    .prepare("SELECT id, email, display_name, role, status FROM users WHERE email = ? AND status = 'ACTIVE'")
    .bind(email)
    .first<AppUser>();
}
