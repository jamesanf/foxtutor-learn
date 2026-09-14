import {
  accountingDecisionForBillingConsequence,
  accountingEventTypeForHistory,
  accountingIdempotencyKey,
  accountingReference,
  isAccountingEffectiveDate,
  type AccountingErrorCode,
  type AccountingEventType,
  type AccountingStatus
} from "../domain/accounting";
import type { BillingConsequence } from "../domain/cancellations";

export interface AccountingOutbox {
  id: string;
  event_type: AccountingEventType;
  business_event_id: string;
  lesson_id: string | null;
  student_id: string | null;
  student_name?: string | null;
  lesson_start_at?: string | null;
  lesson_end_at?: string | null;
  lesson_timezone?: string | null;
  billing_consequence: BillingConsequence;
  action_type: "NO_ACTION" | "CREATE_INVOICE" | "UNRESOLVED";
  status: AccountingStatus;
  idempotency_key: string;
  accounting_reference: string;
  accounting_effective_date: string;
  attempt_count: number;
  next_attempt_at: string | null;
  last_attempted_at: string | null;
  external_reference: string | null;
  external_url: string | null;
  external_resource_type: string | null;
  provider_status: string | null;
  safe_error_code: AccountingErrorCode | null;
  safe_error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AccountingConnection {
  id: "FREEAGENT";
  environment: "sandbox" | "production";
  company_name: string | null;
  company_subdomain: string | null;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  status: "NOT_CONFIGURED" | "CONNECTED" | "ATTENTION" | "UNAVAILABLE";
  last_success_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  updated_at: string;
}

export type AccountingEnvironmentName = "sandbox" | "production";

export interface ExternalAccountingLink {
  id: string;
  provider: "FREEAGENT";
  local_entity_type: "STUDENT";
  local_entity_id: string | null;
  external_resource_type: "CONTACT";
  external_reference: string;
  external_url: string;
  status: "UNVERIFIED" | "VERIFIED" | "INVALID";
  verified_at: string | null;
  verified_environment: "sandbox" | "production" | null;
  verified_company_subdomain: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingRetryAudit {
  id: string;
  outbox_id: string | null;
  business_event_id: string | null;
  actor_user_id: string | null;
  actor_role: "ADMIN";
  prior_status: AccountingStatus;
  request_result: "ACCEPTED" | "REJECTED";
  resulting_status: AccountingStatus | null;
  provider_reference: string | null;
  safe_error_code: string | null;
  safe_error_message: string | null;
  created_at: string;
}

export interface AccountingBillingSettings {
  id: "FREEAGENT";
  amount: string;
  item_type: string;
  category_url: string;
  payment_terms_days: number;
  currency: "GBP";
  sales_tax_rate: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

const outboxSelect = `SELECT a.*, s.name AS student_name, l.start_at AS lesson_start_at,
  l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
  FROM accounting_outbox a
  LEFT JOIN students s ON s.id = a.student_id
  LEFT JOIN lessons l ON l.id = a.lesson_id`;

export function accountingOutboxStatement(
  db: D1Database,
  input: {
    id: string;
    historyId: string;
    historyEventType: string;
    lessonId: string;
    studentId: string;
    billingConsequence: BillingConsequence;
    accountingEffectiveDate: string;
    now: string;
  }
): D1PreparedStatement | null {
  const eventType = accountingEventTypeForHistory(input.historyEventType);
  if (!eventType) return null;
  if (!isAccountingEffectiveDate(input.accountingEffectiveDate)) {
    throw new Error("Accounting effective date must be a valid ISO date.");
  }
  const decision = accountingDecisionForBillingConsequence(input.billingConsequence);
  const nextAttemptAt = decision.status === "PENDING" ? input.now : null;
  const completedAt = decision.status === "NOT_REQUIRED" ? input.now : null;
  return db.prepare(
    `INSERT INTO accounting_outbox
     (id, event_type, business_event_id, lesson_id, student_id, billing_consequence,
      action_type, status, idempotency_key, accounting_reference, accounting_effective_date,
      attempt_count, next_attempt_at, provider_status, safe_error_code, safe_error_message,
      created_at, updated_at, completed_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM lesson_history WHERE id = ?)
     ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(
    input.id,
    eventType,
    input.historyId,
    input.lessonId,
    input.studentId,
    input.billingConsequence,
    decision.actionType,
    decision.status,
    accountingIdempotencyKey(eventType, input.historyId),
    accountingReference(input.historyId),
    input.accountingEffectiveDate,
    nextAttemptAt,
    decision.providerStatus,
    decision.safeErrorCode,
    decision.safeErrorMessage,
    input.now,
    input.now,
    completedAt,
    input.historyId
  );
}

export async function findAccountingOutbox(db: D1Database, id: string): Promise<AccountingOutbox | null> {
  return db.prepare(`${outboxSelect} WHERE a.id = ?`).bind(id).first<AccountingOutbox>();
}

export async function findAccountingOutboxByIdempotencyKey(db: D1Database, key: string): Promise<AccountingOutbox | null> {
  return db.prepare(`${outboxSelect} WHERE a.idempotency_key = ?`).bind(key).first<AccountingOutbox>();
}

export async function listAccountingOutbox(
  db: D1Database,
  status: AccountingStatus | undefined,
  limit: number,
  offset: number
): Promise<AccountingOutbox[]> {
  const clause = status ? "WHERE a.status = ?" : "";
  const bindings: (string | number)[] = status ? [status, limit, offset] : [limit, offset];
  const result = await db.prepare(
    `${outboxSelect} ${clause} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`
  ).bind(...bindings).all<AccountingOutbox>();
  return result.results;
}

export async function listDueAccountingOutbox(db: D1Database, now: string, limit: number): Promise<AccountingOutbox[]> {
  const result = await db.prepare(
    `${outboxSelect}
     WHERE a.status IN ('PENDING', 'RETRYABLE')
       AND (a.next_attempt_at IS NULL OR a.next_attempt_at <= ?)
     ORDER BY a.created_at ASC, a.id ASC
     LIMIT ?`
  ).bind(now, limit).all<AccountingOutbox>();
  return result.results;
}

export async function countAccountingOutbox(db: D1Database, status?: AccountingStatus): Promise<number> {
  const row = status
    ? await db.prepare("SELECT COUNT(*) AS count FROM accounting_outbox WHERE status = ?").bind(status).first<{ count: number | string }>()
    : await db.prepare("SELECT COUNT(*) AS count FROM accounting_outbox").first<{ count: number | string }>();
  return Number(row?.count ?? 0);
}

export async function accountingOutboxCounts(db: D1Database): Promise<Record<AccountingStatus, number>> {
  const result = await db.prepare("SELECT status, COUNT(*) AS count FROM accounting_outbox GROUP BY status")
    .all<{ status: AccountingStatus; count: number | string }>();
  const counts: Record<AccountingStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCEEDED: 0,
    RETRYABLE: 0,
    FAILED: 0,
    UNKNOWN: 0,
    NOT_REQUIRED: 0
  };
  for (const row of result.results) counts[row.status] = Number(row.count);
  return counts;
}

export async function claimAccountingOutbox(db: D1Database, id: string, now: string, staleBefore: string): Promise<AccountingOutbox | null> {
  await db.prepare(
    `UPDATE accounting_outbox
     SET status = 'UNKNOWN', provider_status = 'STALE_PROCESSING',
         safe_error_code = 'STALE_PROCESSING',
         safe_error_message = 'The previous processing claim expired; reconcile before retrying.',
         next_attempt_at = NULL, updated_at = ?
     WHERE status = 'PROCESSING' AND last_attempted_at < ?`
  ).bind(now, staleBefore).run();
  const result = await db.prepare(
    `UPDATE accounting_outbox
     SET status = 'PROCESSING', attempt_count = attempt_count + 1,
         last_attempted_at = ?, updated_at = ?
     WHERE id = ? AND (
       (status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       OR (status = 'RETRYABLE' AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?)
     )`
  ).bind(now, now, id, now, now).run();
  if (!result.meta.changes) return null;
  return findAccountingOutbox(db, id);
}

export async function markAccountingSucceeded(
  db: D1Database,
  id: string,
  input: { externalReference: string; externalUrl: string; externalResourceType: string; providerStatus: string },
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE accounting_outbox
     SET status = 'SUCCEEDED', external_reference = ?, external_url = ?,
         external_resource_type = ?, provider_status = ?, safe_error_code = NULL,
         safe_error_message = NULL, next_attempt_at = NULL, completed_at = ?,
         updated_at = ?
     WHERE id = ? AND status = 'PROCESSING'`
  ).bind(input.externalReference, input.externalUrl, input.externalResourceType, input.providerStatus, now, now, id).run();
}

export async function markAccountingOutcome(
  db: D1Database,
  id: string,
  status: "RETRYABLE" | "FAILED" | "UNKNOWN",
  code: AccountingErrorCode,
  message: string,
  nextAttemptAt: string | null,
  providerStatus: string,
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE accounting_outbox
     SET status = ?, safe_error_code = ?, safe_error_message = ?,
         provider_status = ?, next_attempt_at = ?, updated_at = ?
     WHERE id = ? AND status = 'PROCESSING'`
  ).bind(status, code, message.slice(0, 240), providerStatus, nextAttemptAt, now, id).run();
}

export async function makeAccountingRetryable(db: D1Database, id: string, now: string): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE accounting_outbox
     SET status = 'RETRYABLE', next_attempt_at = ?, updated_at = ?
     WHERE id = ? AND status IN ('FAILED', 'RETRYABLE') AND safe_error_code NOT IN ('BUSINESS_MAPPING_REQUIRED', 'CONTACT_MAPPING_REQUIRED')`
  ).bind(now, now, id).run();
  return Boolean(result.meta.changes);
}

export async function recordAccountingRetryAudit(
  db: D1Database,
  input: {
    id: string;
    outboxId: string;
    businessEventId: string | null;
    actorUserId: string;
    priorStatus: AccountingStatus;
    requestResult: "ACCEPTED" | "REJECTED";
    resultingStatus: AccountingStatus | null;
    providerReference: string | null;
    safeErrorCode: string | null;
    safeErrorMessage: string | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO accounting_retry_audit
     (id, outbox_id, business_event_id, actor_user_id, actor_role, prior_status,
      request_result, resulting_status, provider_reference, safe_error_code,
      safe_error_message, created_at)
     VALUES (?, ?, ?, ?, 'ADMIN', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.id,
    input.outboxId,
    input.businessEventId,
    input.actorUserId,
    input.priorStatus,
    input.requestResult,
    input.resultingStatus,
    input.providerReference,
    input.safeErrorCode,
    input.safeErrorMessage?.slice(0, 240) ?? null,
    input.now
  ).run();
}

export async function listAccountingRetryAudit(db: D1Database, outboxId: string, limit = 20): Promise<AccountingRetryAudit[]> {
  const result = await db.prepare(
    `SELECT * FROM accounting_retry_audit
     WHERE outbox_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`
  ).bind(outboxId, Math.max(1, Math.min(limit, 100))).all<AccountingRetryAudit>();
  return result.results;
}

export async function reconcileAccountingReference(
  db: D1Database,
  id: string,
  input: { externalReference: string; externalUrl: string; externalResourceType: string; providerStatus: string },
  now: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE accounting_outbox
     SET status = 'SUCCEEDED', external_reference = ?, external_url = ?,
         external_resource_type = ?, provider_status = ?, safe_error_code = NULL,
         safe_error_message = NULL, next_attempt_at = NULL, completed_at = ?,
         updated_at = ?
     WHERE id = ? AND status = 'UNKNOWN' AND external_reference IS NULL`
  ).bind(input.externalReference, input.externalUrl, input.externalResourceType, input.providerStatus, now, now, id).run();
  return Boolean(result.meta.changes);
}

export async function findExternalAccountingLink(
  db: D1Database,
  studentId: string,
  environment?: AccountingEnvironmentName
): Promise<ExternalAccountingLink | null> {
  if (environment) {
    const isolated = await db.prepare(
      `SELECT id, provider, local_entity_type, local_entity_id, external_resource_type,
              external_reference, external_url, status, verified_at,
              environment AS verified_environment, company_subdomain AS verified_company_subdomain,
              last_error_code, last_error_message, created_at, updated_at
       FROM external_accounting_links_by_environment
       WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT'
         AND local_entity_id = ? AND environment = ?`
    ).bind(studentId, environment).first<ExternalAccountingLink>();
    return isolated;
  }
  return db.prepare(
    `SELECT * FROM external_accounting_links
     WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT' AND local_entity_id = ?
       AND (? IS NULL OR verified_environment = ?)`
  ).bind(studentId, environment ?? null, environment ?? null).first<ExternalAccountingLink>();
}

export async function hasActiveAccountingDependency(db: D1Database, studentId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 AS present
     FROM accounting_outbox
     WHERE student_id = ?
       AND status IN ('PENDING', 'PROCESSING', 'RETRYABLE', 'UNKNOWN')
     LIMIT 1`
  ).bind(studentId).first<{ present: number }>();
  return Boolean(row);
}

export async function listExternalAccountingLinks(db: D1Database, environment?: AccountingEnvironmentName): Promise<ExternalAccountingLink[]> {
  if (environment) {
    const isolated = await db.prepare(
      `SELECT id, provider, local_entity_type, local_entity_id, external_resource_type,
              external_reference, external_url, status, verified_at,
              environment AS verified_environment, company_subdomain AS verified_company_subdomain,
              last_error_code, last_error_message, created_at, updated_at
       FROM external_accounting_links_by_environment
       WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT' AND environment = ?
       ORDER BY updated_at DESC, id DESC`
    ).bind(environment).all<ExternalAccountingLink>();
    return isolated.results;
  }
  const result = await db.prepare(
     `SELECT * FROM external_accounting_links
      WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT'
        AND (? IS NULL OR verified_environment = ?)
      ORDER BY updated_at DESC, id DESC`
  ).bind(environment ?? null, environment ?? null).all<ExternalAccountingLink>();
  return result.results;
}

export async function upsertExternalAccountingLink(
  db: D1Database,
  input: {
     id: string;
     studentId: string;
     externalReference: string;
     externalUrl: string;
     status?: "UNVERIFIED" | "VERIFIED" | "INVALID";
     verifiedAt?: string | null;
     verifiedEnvironment?: "sandbox" | "production" | null;
     verifiedCompanySubdomain?: string | null;
     lastErrorCode?: string | null;
     lastErrorMessage?: string | null;
     now: string;
  }
): Promise<void> {
  if (input.verifiedEnvironment) {
    await db.prepare(
      `INSERT INTO external_accounting_links_by_environment
       (id, provider, local_entity_type, local_entity_id, external_resource_type,
        external_reference, external_url, status, verified_at, environment,
        company_subdomain, last_error_code, last_error_message, created_at, updated_at)
       VALUES (?, 'FREEAGENT', 'STUDENT', ?, 'CONTACT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, local_entity_type, local_entity_id, environment) DO UPDATE SET
         external_reference = excluded.external_reference,
         external_url = excluded.external_url,
         status = excluded.status,
         verified_at = excluded.verified_at,
         company_subdomain = excluded.company_subdomain,
         last_error_code = excluded.last_error_code,
         last_error_message = excluded.last_error_message,
         updated_at = excluded.updated_at`
    ).bind(
      input.id,
      input.studentId,
      input.externalReference,
      input.externalUrl,
      input.status ?? "UNVERIFIED",
      input.verifiedAt ?? null,
      input.verifiedEnvironment,
      input.verifiedCompanySubdomain ?? null,
      input.lastErrorCode ?? null,
      input.lastErrorMessage?.slice(0, 240) ?? null,
      input.now,
      input.now
    ).run();
    return;
  }
  await db.prepare(
     `INSERT INTO external_accounting_links
      (id, provider, local_entity_type, local_entity_id, external_resource_type,
       external_reference, external_url, status, verified_at, verified_environment,
       verified_company_subdomain, last_error_code, last_error_message, created_at, updated_at)
      VALUES (?, 'FREEAGENT', 'STUDENT', ?, 'CONTACT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider, local_entity_type, local_entity_id) DO UPDATE SET
        external_reference = excluded.external_reference,
        external_url = excluded.external_url,
        status = excluded.status,
        verified_at = excluded.verified_at,
        verified_environment = excluded.verified_environment,
        verified_company_subdomain = excluded.verified_company_subdomain,
        last_error_code = excluded.last_error_code,
        last_error_message = excluded.last_error_message,
        updated_at = excluded.updated_at`
  ).bind(
     input.id,
     input.studentId,
     input.externalReference,
     input.externalUrl,
     input.status ?? "UNVERIFIED",
     input.verifiedAt ?? null,
     input.verifiedEnvironment ?? null,
     input.verifiedCompanySubdomain ?? null,
     input.lastErrorCode ?? null,
     input.lastErrorMessage?.slice(0, 240) ?? null,
     input.now,
     input.now
  ).run();
}

export async function updateExternalAccountingLinkStatus(
  db: D1Database,
  studentId: string,
  input: {
     environment?: AccountingEnvironmentName;
     status: "UNVERIFIED" | "VERIFIED" | "INVALID";
     verifiedAt?: string | null;
     verifiedEnvironment?: "sandbox" | "production" | null;
     verifiedCompanySubdomain?: string | null;
     lastErrorCode?: string | null;
     lastErrorMessage?: string | null;
     now: string;
  }
): Promise<boolean> {
  if (input.environment) {
    const result = await db.prepare(
      `UPDATE external_accounting_links_by_environment
       SET status = ?, verified_at = ?, company_subdomain = ?,
           last_error_code = ?, last_error_message = ?, updated_at = ?
       WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT'
         AND local_entity_id = ? AND environment = ?`
    ).bind(
      input.status,
      input.verifiedAt ?? null,
      input.verifiedCompanySubdomain ?? null,
      input.lastErrorCode ?? null,
      input.lastErrorMessage?.slice(0, 240) ?? null,
      input.now,
      studentId,
      input.environment
    ).run();
    return Boolean(result.meta.changes);
  }
  const result = await db.prepare(
     `UPDATE external_accounting_links
      SET status = ?, verified_at = ?, verified_environment = ?,
          verified_company_subdomain = ?, last_error_code = ?,
          last_error_message = ?, updated_at = ?
      WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT' AND local_entity_id = ?`
  ).bind(
     input.status,
     input.verifiedAt ?? null,
     input.verifiedEnvironment ?? null,
     input.verifiedCompanySubdomain ?? null,
     input.lastErrorCode ?? null,
     input.lastErrorMessage?.slice(0, 240) ?? null,
     input.now,
     studentId
  ).run();
  return Boolean(result.meta.changes);
}

export async function removeExternalAccountingLink(db: D1Database, studentId: string, environment?: AccountingEnvironmentName): Promise<boolean> {
  if (environment) {
    const result = await db.prepare(
      `DELETE FROM external_accounting_links_by_environment
       WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT'
         AND local_entity_id = ? AND environment = ?`
    ).bind(studentId, environment).run();
    return Boolean(result.meta.changes);
  }
  const result = await db.prepare(
    `DELETE FROM external_accounting_links
     WHERE provider = 'FREEAGENT' AND local_entity_type = 'STUDENT' AND local_entity_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM accounting_outbox
         WHERE student_id = ?
           AND status IN ('PENDING', 'PROCESSING', 'RETRYABLE', 'UNKNOWN')
       )`
  ).bind(studentId, studentId).run();
  return Boolean(result.meta.changes);
}

export async function findAccountingConnection(db: D1Database, environment?: AccountingEnvironmentName): Promise<AccountingConnection | null> {
  if (environment) {
    const isolated = await db.prepare(
      "SELECT * FROM accounting_connections_by_environment WHERE id = 'FREEAGENT' AND environment = ?"
    ).bind(environment).first<AccountingConnection>();
    return isolated;
  }
  return db.prepare(
    "SELECT * FROM accounting_connections WHERE id = 'FREEAGENT' AND (? IS NULL OR environment = ?)"
  ).bind(environment ?? null, environment ?? null).first<AccountingConnection>();
}

export async function findAccountingBillingSettings(db: D1Database): Promise<AccountingBillingSettings | null> {
  return db.prepare("SELECT * FROM accounting_billing_settings WHERE id = 'FREEAGENT'").first<AccountingBillingSettings>();
}

export async function saveAccountingBillingSettings(
  db: D1Database,
  input: {
    amount: string;
    itemType: string;
    categoryUrl: string;
    paymentTermsDays: number;
    salesTaxRate: string;
    updatedByUserId: string | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO accounting_billing_settings
     (id, amount, item_type, category_url, payment_terms_days, currency,
      sales_tax_rate, updated_by_user_id, created_at, updated_at)
     VALUES ('FREEAGENT', ?, ?, ?, ?, 'GBP', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       amount = excluded.amount,
       item_type = excluded.item_type,
       category_url = excluded.category_url,
       payment_terms_days = excluded.payment_terms_days,
       currency = 'GBP',
       sales_tax_rate = excluded.sales_tax_rate,
       updated_by_user_id = excluded.updated_by_user_id,
       updated_at = excluded.updated_at`
  ).bind(
    input.amount,
    input.itemType,
    input.categoryUrl,
    input.paymentTermsDays,
    input.salesTaxRate,
    input.updatedByUserId,
    input.now,
    input.now
  ).run();
}

export async function saveAccountingConnection(
  db: D1Database,
  input: {
    environment: "sandbox" | "production";
    companyName: string | null;
    companySubdomain: string | null;
    accessTokenCiphertext: string;
    refreshTokenCiphertext: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO accounting_connections_by_environment
     (id, environment, company_name, company_subdomain, access_token_ciphertext, refresh_token_ciphertext,
      access_token_expires_at, refresh_token_expires_at, status, updated_at)
     VALUES ('FREEAGENT', ?, ?, ?, ?, ?, ?, ?, 'CONNECTED', ?)
     ON CONFLICT(id, environment) DO UPDATE SET
       company_name = excluded.company_name,
       company_subdomain = excluded.company_subdomain,
       access_token_ciphertext = excluded.access_token_ciphertext,
       refresh_token_ciphertext = excluded.refresh_token_ciphertext,
       access_token_expires_at = excluded.access_token_expires_at,
       refresh_token_expires_at = excluded.refresh_token_expires_at,
       status = 'CONNECTED', last_error_code = NULL, last_error_message = NULL,
       updated_at = excluded.updated_at`
  ).bind(
    input.environment,
    input.companyName,
    input.companySubdomain,
    input.accessTokenCiphertext,
    input.refreshTokenCiphertext,
    input.accessTokenExpiresAt,
    input.refreshTokenExpiresAt,
    input.now
  ).run();
}

export async function updateAccountingConnectionStatus(
  db: D1Database,
  status: AccountingConnection["status"],
  input: { environment?: AccountingEnvironmentName; code?: string | null; message?: string | null; lastSuccessAt?: string | null; now: string }
): Promise<void> {
  await db.prepare(
    `UPDATE accounting_connections_by_environment
     SET status = ?, last_error_code = ?, last_error_message = ?, last_success_at = COALESCE(?, last_success_at), updated_at = ?
     WHERE id = 'FREEAGENT' AND environment = ?`
  ).bind(status, input.code ?? null, input.message?.slice(0, 240) ?? null, input.lastSuccessAt ?? null, input.now, input.environment ?? "sandbox").run();
}

export async function createAccountingOAuthState(
  db: D1Database,
  input: { stateHash: string; adminUserId: string; environment: "sandbox" | "production"; expiresAt: string; createdAt: string }
): Promise<void> {
  await db.prepare(
    `INSERT INTO accounting_oauth_states(state_hash, admin_user_id, environment, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(input.stateHash, input.adminUserId, input.environment, input.expiresAt, input.createdAt).run();
}

export async function consumeAccountingOAuthState(db: D1Database, stateHash: string, now: string): Promise<{ admin_user_id: string; environment: "sandbox" | "production" } | null> {
  const row = await db.prepare(
    "SELECT admin_user_id, environment FROM accounting_oauth_states WHERE state_hash = ? AND consumed_at IS NULL AND expires_at > ?"
  ).bind(stateHash, now).first<{ admin_user_id: string; environment: "sandbox" | "production" }>();
  if (!row) return null;
  const updated = await db.prepare(
    "UPDATE accounting_oauth_states SET consumed_at = ? WHERE state_hash = ? AND consumed_at IS NULL"
  ).bind(now, stateHash).run();
  return updated.meta.changes ? row : null;
}
