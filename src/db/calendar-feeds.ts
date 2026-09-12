export interface CalendarFeed {
  id: string;
  owner_user_id: string;
  student_id: string | null;
  token_last4: string;
  created_at: string;
  revoked_at: string | null;
  last_rotated_at: string;
}

export interface ResolvedCalendarFeed extends CalendarFeed {
  owner_role: "ADMIN" | "STUDENT";
}

const feedColumns = "f.id, f.owner_user_id, f.student_id, f.token_last4, f.created_at, f.revoked_at, f.last_rotated_at";

export async function findActiveCalendarFeedForOwner(
  db: D1Database,
  ownerUserId: string
): Promise<CalendarFeed | null> {
  return db
    .prepare(`SELECT ${feedColumns} FROM calendar_feeds f WHERE f.owner_user_id = ? AND f.revoked_at IS NULL`)
    .bind(ownerUserId)
    .first<CalendarFeed>();
}

export async function rotateCalendarFeed(
  db: D1Database,
  feed: {
    id: string;
    ownerUserId: string;
    studentId: string | null;
    tokenHash: string;
    tokenLast4: string;
    now: string;
  }
): Promise<void> {
  const existing = await findActiveCalendarFeedForOwner(db, feed.ownerUserId);
  if (existing) {
    await db
      .prepare(
        "UPDATE calendar_feeds SET student_id = ?, token_hash = ?, token_last4 = ?, revoked_at = NULL, last_rotated_at = ? WHERE id = ? AND owner_user_id = ?"
      )
      .bind(feed.studentId, feed.tokenHash, feed.tokenLast4, feed.now, existing.id, feed.ownerUserId)
      .run();
    return;
  }
  await db
    .prepare(
      "INSERT INTO calendar_feeds(id, owner_user_id, student_id, token_hash, token_last4, created_at, revoked_at, last_rotated_at) VALUES(?, ?, ?, ?, ?, ?, NULL, ?)"
    )
    .bind(feed.id, feed.ownerUserId, feed.studentId, feed.tokenHash, feed.tokenLast4, feed.now, feed.now)
    .run();
}

export async function revokeCalendarFeed(db: D1Database, ownerUserId: string, now: string): Promise<void> {
  await db.prepare("UPDATE calendar_feeds SET revoked_at = ? WHERE owner_user_id = ? AND revoked_at IS NULL").bind(now, ownerUserId).run();
}

export async function findCalendarFeedByTokenHash(
  db: D1Database,
  tokenHash: string
): Promise<ResolvedCalendarFeed | null> {
  return db
    .prepare(
      `SELECT ${feedColumns}, u.role AS owner_role
       FROM calendar_feeds f
       JOIN users u ON u.id = f.owner_user_id
       LEFT JOIN students s ON s.id = f.student_id
       WHERE f.token_hash = ? AND f.revoked_at IS NULL
         AND u.status = 'ACTIVE'
         AND (
           (u.role = 'ADMIN' AND f.student_id IS NULL)
           OR (u.role = 'STUDENT' AND s.id = f.student_id AND s.learn_user_id = u.id AND s.status = 'ACTIVE')
         )`
    )
    .bind(tokenHash)
    .first<ResolvedCalendarFeed>();
}
