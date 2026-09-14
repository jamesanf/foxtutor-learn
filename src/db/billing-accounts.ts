export type BillingMandateState =
  | "NOT_CONFIGURED"
  | "SETUP_REQUIRED"
  | "AUTHORISATION_PENDING"
  | "ACTIVE"
  | "FAILED"
  | "INACTIVE"
  | "UNKNOWN";

export type BillingProvisioningState =
  | "CONTACT_SYNC_REQUIRED"
  | "SETUP_REQUIRED"
  | "AUTHORISATION_PENDING"
  | "ACTIVE"
  | "FAILED"
  | "INACTIVE"
  | "UNKNOWN";

export interface BillingAccount {
  id: string;
  student_id: string;
  payment_method: "DIRECT_DEBIT";
  mandate_state: BillingMandateState;
  provisioning_state: BillingProvisioningState;
  provider_environment: "sandbox" | "production" | null;
  provider_contact_reference: string | null;
  provider_contact_url: string | null;
  verified_at: string | null;
  last_reconciled_at: string | null;
  last_notification_at: string | null;
  notification_count: number;
  next_reconcile_at: string | null;
  claim_expires_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  student_email?: string | null;
  learn_user_id?: string | null;
}

const accountSelect = `SELECT b.*, s.name AS student_name, s.email AS student_email, s.learn_user_id
  FROM billing_accounts b
  JOIN students s ON s.id = b.student_id`;

export async function ensureBillingAccount(
  db: D1Database,
  studentId: string,
  now: string,
  providerEnvironment?: "sandbox" | "production" | null
): Promise<void> {
  await db.prepare(
    `INSERT INTO billing_accounts
      (id, student_id, payment_method, mandate_state, provisioning_state, provider_environment, created_at, updated_at)
     VALUES (?, ?, 'DIRECT_DEBIT', 'UNKNOWN', 'CONTACT_SYNC_REQUIRED', ?, ?, ?)
     ON CONFLICT(student_id) DO NOTHING`
  ).bind(`billing-account:${studentId}`, studentId, providerEnvironment ?? null, now, now).run();
}

export async function findBillingAccount(db: D1Database, studentId: string): Promise<BillingAccount | null> {
  return db.prepare(`${accountSelect} WHERE b.student_id = ?`).bind(studentId).first<BillingAccount>();
}

export async function listDueBillingAccounts(
  db: D1Database,
  now: string,
  limit = 5
): Promise<BillingAccount[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 20));
  const result = await db.prepare(
    `${accountSelect}
     WHERE s.status = 'ACTIVE'
       AND (b.next_reconcile_at IS NULL OR b.next_reconcile_at <= ?)
       AND (b.claim_expires_at IS NULL OR b.claim_expires_at < ?)
     ORDER BY CASE WHEN b.provisioning_state = 'CONTACT_SYNC_REQUIRED' THEN 0 ELSE 1 END,
              b.updated_at ASC, b.id ASC
     LIMIT ?`
  ).bind(now, now, boundedLimit).all<BillingAccount>();
  return result.results;
}

export async function claimBillingAccount(
  db: D1Database,
  id: string,
  now: string,
  claimExpiresAt: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE billing_accounts
     SET claim_expires_at = ?, updated_at = ?
     WHERE id = ?
       AND (claim_expires_at IS NULL OR claim_expires_at < ?)
       AND (next_reconcile_at IS NULL OR next_reconcile_at <= ?)`
  ).bind(claimExpiresAt, now, id, now, now).run();
  return Boolean(result.meta.changes);
}

export async function updateBillingAccount(
  db: D1Database,
  id: string,
  input: {
    mandateState: BillingMandateState;
    provisioningState: BillingProvisioningState;
    providerContactReference?: string | null;
    providerContactUrl?: string | null;
    verifiedAt?: string | null;
    lastReconciledAt?: string | null;
    nextReconcileAt?: string | null;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    claimExpiresAt?: string | null;
  },
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE billing_accounts
     SET mandate_state = ?,
         provisioning_state = ?,
         provider_contact_reference = COALESCE(?, provider_contact_reference),
         provider_contact_url = COALESCE(?, provider_contact_url),
         verified_at = COALESCE(?, verified_at),
         last_reconciled_at = COALESCE(?, last_reconciled_at),
         next_reconcile_at = ?,
         last_error_code = ?,
         last_error_message = ?,
         claim_expires_at = ?,
         updated_at = ?
     WHERE id = ?`
  ).bind(
    input.mandateState,
    input.provisioningState,
    input.providerContactReference ?? null,
    input.providerContactUrl ?? null,
    input.verifiedAt ?? null,
    input.lastReconciledAt ?? null,
    input.nextReconcileAt ?? null,
    input.lastErrorCode ?? null,
    input.lastErrorMessage ?? null,
    input.claimExpiresAt ?? null,
    now,
    id
  ).run();
}

export async function recordBillingProvisioningEvent(
  db: D1Database,
  input: {
    id: string;
    billingAccountId: string;
    eventType: "ACCOUNT_CREATED" | "CONTACT_FOUND" | "CONTACT_CREATED" | "CONTACT_SYNC_FAILED" | "MANDATE_STATE_CHANGED" | "SETUP_NOTIFICATION_SENT" | "SETUP_REMINDER_SENT";
    safeDetail: string;
    idempotencyKey: string;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO billing_provisioning_events
      (id, billing_account_id, event_type, safe_detail, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(input.id, input.billingAccountId, input.eventType, input.safeDetail.slice(0, 240), input.idempotencyKey, input.now).run();
}

export async function markBillingNotificationSent(
  db: D1Database,
  id: string,
  now: string,
  nextNotificationAt: string | null
): Promise<void> {
  await db.prepare(
    `UPDATE billing_accounts
     SET last_notification_at = ?, notification_count = notification_count + 1,
         next_reconcile_at = COALESCE(next_reconcile_at, ?), updated_at = ?
     WHERE id = ?`
  ).bind(now, nextNotificationAt, now, id).run();
}

export async function createEmergencyPaygOverride(
  db: D1Database,
  input: {
    id: string;
    billingEventId: string;
    studentId: string;
    reason: string;
    createdByUserId: string;
    now: string;
  }
): Promise<boolean> {
  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("An emergency payment exception requires a reason.");
  const result = await db.prepare(
    `INSERT INTO billing_emergency_payg_overrides
      (id, billing_event_id, student_id, reason, status, created_by_user_id, created_at)
     SELECT ?, ?, ?, ?, 'ACTIVE', ?, ?
     WHERE EXISTS (SELECT 1 FROM billing_events WHERE id = ?)
     ON CONFLICT(billing_event_id) DO NOTHING`
  ).bind(input.id, input.billingEventId, input.studentId, reason, input.createdByUserId, input.now, input.billingEventId).run();
  return Boolean(result.meta.changes);
}

export async function countOpenEmergencyPaygOverrides(db: D1Database): Promise<number> {
  const row = await db.prepare(
    "SELECT COUNT(*) AS count FROM billing_emergency_payg_overrides WHERE status = 'ACTIVE'"
  ).first<{ count: number | string }>();
  return Number(row?.count ?? 0);
}
