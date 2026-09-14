import {
  claimBillingAccount,
  ensureBillingAccount,
  findBillingAccount,
  listDueBillingAccounts,
  markBillingNotificationSent,
  recordBillingProvisioningEvent,
  updateBillingAccount,
  type BillingAccount,
  type BillingMandateState,
  type BillingProvisioningState
} from "../db/billing-accounts";
import { findAccountingConnection, findExternalAccountingLink, upsertExternalAccountingLink } from "../db/accounting";
import { mapDirectDebitStatus, type DirectDebitStatus } from "../domain/direct-debit";
import { providerCall, type AccountingEnvironment } from "./service";
import { freeAgentFetch, FreeAgentApiError, type FreeAgentContact } from "./freeagent/client";
import { createDirectDebitNotification, type NotificationEnvironment } from "../notifications/service";

interface ProvisioningEnvironment extends AccountingEnvironment, NotificationEnvironment {}

interface StudentProvisioningRow {
  id: string;
  name: string;
  email: string;
  learn_user_id: string | null;
  status: "ACTIVE" | "INACTIVE";
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "FoxTutor",
    lastName: parts.slice(1).join(" ") || "Customer"
  };
}

function localState(status: DirectDebitStatus): { mandateState: BillingMandateState; provisioningState: BillingProvisioningState } {
  if (status === "NOT_CONFIGURED") return { mandateState: "NOT_CONFIGURED", provisioningState: "SETUP_REQUIRED" };
  return { mandateState: status, provisioningState: status };
}

function notificationDue(account: BillingAccount, status: DirectDebitStatus, now: string): boolean {
  if (status !== "SETUP_REQUIRED" && status !== "AUTHORISATION_PENDING") return false;
  if (!account.last_notification_at) return true;
  return Date.parse(now) - Date.parse(account.last_notification_at) >= 7 * 24 * 60 * 60_000;
}

function safeProviderError(error: unknown): { code: string; message: string } {
  if (error instanceof FreeAgentApiError) return { code: error.shape.code, message: error.message };
  return { code: "UNKNOWN", message: "FreeAgent provisioning failed unexpectedly." };
}

function providerRetryAt(now: string, code: string): string {
  return new Date(Date.parse(now) + (code === "RATE_LIMIT" ? 60 : 15) * 60_000).toISOString();
}

async function studentRow(db: D1Database, studentId: string): Promise<StudentProvisioningRow | null> {
  return db.prepare(
    "SELECT id, name, email, learn_user_id, status FROM students WHERE id = ?"
  ).bind(studentId).first<StudentProvisioningRow>();
}

async function findOrCreateContact(
  db: D1Database,
  env: ProvisioningEnvironment,
  student: StudentProvisioningRow,
  account: BillingAccount,
  now: string,
  fetcher: typeof fetch
): Promise<{ contact: FreeAgentContact; eventType: "CONTACT_FOUND" | "CONTACT_CREATED" }> {
  const link = await findExternalAccountingLink(db, student.id);
  if (link?.status === "VERIFIED") {
    const contact = await providerCall(db, env, now, fetcher, (client, token) => client.getContact(token, link.external_url));
    if (!contact) throw new FreeAgentApiError({
      code: "NOT_FOUND",
      status: 404,
      message: "The mapped FreeAgent contact no longer exists.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    return { contact, eventType: "CONTACT_FOUND" };
  }

  const { firstName, lastName } = splitName(student.name);
  const contacts: FreeAgentContact[] = [];
  for (let page = 1; page <= 5; page++) {
    const pageContacts = await providerCall(db, env, now, fetcher, (client, token) => client.listContacts(token, page));
    contacts.push(...pageContacts.filter((candidate) =>
      (candidate.email ?? candidate.billingEmail ?? "").toLowerCase() === student.email.toLowerCase()
    ));
    if (pageContacts.length < 100) break;
  }
  if (contacts.length > 1) throw new FreeAgentApiError({
    code: "CONFLICT",
    status: 409,
    message: "More than one matching FreeAgent contact was found; administrator review is required.",
    retryable: false,
    unknown: false,
    retryAfterSeconds: null
  });
  const contact = contacts[0] ?? await providerCall(
    db,
    env,
    now,
    fetcher,
    (client, token) => client.createContact(token, { firstName, lastName, email: student.email })
  );
  const connection = await findAccountingConnection(db);
  if (!connection) throw new FreeAgentApiError({
    code: "CONFIGURATION",
    status: null,
    message: "FreeAgent connection is not configured.",
    retryable: false,
    unknown: false,
    retryAfterSeconds: null
  });
  await upsertExternalAccountingLink(db, {
    id: crypto.randomUUID(),
    studentId: student.id,
    externalReference: contact.url.split("/").pop() ?? contact.url,
    externalUrl: contact.url,
    status: "VERIFIED",
    verifiedAt: now,
    verifiedEnvironment: connection.environment,
    verifiedCompanySubdomain: connection.company_subdomain,
    now
  });
  await recordBillingProvisioningEvent(db, {
    id: crypto.randomUUID(),
    billingAccountId: account.id,
    eventType: contacts[0] ? "CONTACT_FOUND" : "CONTACT_CREATED",
    safeDetail: contacts[0] ? "Existing matching contact reused." : "Contact created through the documented FreeAgent API.",
    idempotencyKey: `${account.id}:${contacts[0] ? "contact-found" : "contact-created"}:${contact.url}`,
    now
  });
  return { contact, eventType: contacts[0] ? "CONTACT_FOUND" : "CONTACT_CREATED" };
}

export async function provisionBillingAccount(
  db: D1Database,
  env: ProvisioningEnvironment,
  studentId: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<BillingAccount | null> {
  await ensureBillingAccount(db, studentId, now);
  const account = await findBillingAccount(db, studentId);
  const student = await studentRow(db, studentId);
  if (!account || !student) return null;
  const claim = await claimBillingAccount(db, account.id, now, new Date(Date.parse(now) + 5 * 60_000).toISOString());
  if (!claim) return findBillingAccount(db, studentId);

  try {
    const { contact } = await findOrCreateContact(db, env, student, account, now, fetcher);
    const status = mapDirectDebitStatus(contact.directDebitMandateState, true);
    const states = localState(status);
    const prior = account.mandate_state;
    await updateBillingAccount(db, account.id, {
      mandateState: states.mandateState,
      provisioningState: states.provisioningState,
      providerContactReference: contact.url.split("/").pop() ?? contact.url,
      providerContactUrl: contact.url,
      verifiedAt: status === "ACTIVE" ? now : null,
      lastReconciledAt: now,
      nextReconcileAt: new Date(Date.parse(now) + (status === "ACTIVE" ? 24 : 1) * 60 * 60_000).toISOString(),
      lastErrorCode: null,
      lastErrorMessage: null,
      claimExpiresAt: null
    }, now);
    if (prior !== states.mandateState) {
      await recordBillingProvisioningEvent(db, {
        id: crypto.randomUUID(),
        billingAccountId: account.id,
        eventType: "MANDATE_STATE_CHANGED",
        safeDetail: `${prior}->${states.mandateState}`,
        idempotencyKey: `${account.id}:mandate:${states.mandateState}:${now}`,
        now
      });
    }
    if (student.learn_user_id && notificationDue(account, status, now)) {
      const type = status === "SETUP_REQUIRED" ? "BILLING_DIRECT_DEBIT_SETUP" : "BILLING_DIRECT_DEBIT_REMINDER";
      await createDirectDebitNotification(db, env, {
        type,
        eventId: `${account.id}:${type}:${Math.floor(Date.parse(now) / (7 * 24 * 60 * 60_000))}`,
        recipientUserId: student.learn_user_id,
        studentId: student.id,
        studentName: student.name
      }, now, fetcher);
      await markBillingNotificationSent(db, account.id, now, null);
    }
  } catch (error) {
    const failure = safeProviderError(error);
    const retryAt = providerRetryAt(now, failure.code);
    await updateBillingAccount(db, account.id, {
      mandateState: "UNKNOWN",
      provisioningState: "UNKNOWN",
      lastReconciledAt: now,
      nextReconcileAt: retryAt,
      lastErrorCode: failure.code,
      lastErrorMessage: failure.message,
      claimExpiresAt: null
    }, now);
    await recordBillingProvisioningEvent(db, {
      id: crypto.randomUUID(),
      billingAccountId: account.id,
      eventType: "CONTACT_SYNC_FAILED",
      safeDetail: failure.code,
      idempotencyKey: `${account.id}:failure:${now}`,
      now
    });
  }
  return findBillingAccount(db, studentId);
}

export async function reconcileBillingAccountMandate(
  db: D1Database,
  env: ProvisioningEnvironment,
  studentId: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<DirectDebitStatus> {
  const account = await findBillingAccount(db, studentId);
  const link = await findExternalAccountingLink(db, studentId);
  if (!account || !link || link.status !== "VERIFIED") return "SETUP_REQUIRED";
  try {
    const contact = await providerCall(db, env, now, fetcher, (client, token) =>
      client.getContact(token, link.external_url)
    );
    if (!contact) {
      throw new FreeAgentApiError({
        code: "NOT_FOUND",
        status: 404,
        message: "The mapped FreeAgent contact no longer exists.",
        retryable: false,
        unknown: false,
        retryAfterSeconds: null
      });
    }
    const providerContactReference = contact.url.split("/").pop() ?? contact.url;
    if (providerContactReference !== link.external_reference) {
      throw new FreeAgentApiError({
        code: "CONFLICT",
        status: 409,
        message: "FreeAgent returned a different contact from the verified mapping.",
        retryable: false,
        unknown: false,
        retryAfterSeconds: null
      });
    }
    const status = mapDirectDebitStatus(contact?.directDebitMandateState ?? null, true);
    const states = localState(status);
    await updateBillingAccount(db, account.id, {
      mandateState: states.mandateState,
      provisioningState: states.provisioningState,
      providerContactReference,
      providerContactUrl: contact.url,
      verifiedAt: status === "ACTIVE" ? now : null,
      lastReconciledAt: now,
      nextReconcileAt: new Date(Date.parse(now) + (status === "ACTIVE" ? 24 : 1) * 60 * 60_000).toISOString(),
      lastErrorCode: null,
      lastErrorMessage: null,
      claimExpiresAt: null
    }, now);
    return status;
  } catch (error) {
    const failure = safeProviderError(error);
    await updateBillingAccount(db, account.id, {
      mandateState: "UNKNOWN",
      provisioningState: "UNKNOWN",
      lastReconciledAt: now,
      nextReconcileAt: providerRetryAt(now, failure.code),
      lastErrorCode: failure.code,
      lastErrorMessage: failure.message,
      claimExpiresAt: null
    }, now);
    return "UNKNOWN";
  }
}

export async function runBillingProvisioningScheduler(
  db: D1Database,
  env: ProvisioningEnvironment,
  now: string,
  fetcher: typeof fetch = freeAgentFetch,
  limit = 5
): Promise<number> {
  const accounts = await listDueBillingAccounts(db, now, limit);
  for (const account of accounts) await provisionBillingAccount(db, env, account.student_id, now, fetcher);
  return accounts.length;
}
