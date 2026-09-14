import type { DirectDebitStatus } from "../domain/direct-debit";

export type BillingChainAuditStatus = "HEALTHY" | "WARNING" | "ACTION_REQUIRED" | "UNKNOWN" | "BROKEN";

export type BillingChainReasonCode =
  | "STUDENT_NOT_FOUND"
  | "BILLING_ACCOUNT_MISSING"
  | "PAYMENT_METHOD_MISMATCH"
  | "FREEAGENT_LINK_MISSING"
  | "FREEAGENT_LINK_UNVERIFIED"
  | "CONTACT_MAPPING_MISMATCH"
  | "MANDATE_SETUP_REQUIRED"
  | "MANDATE_PENDING"
  | "MANDATE_ACTIVE"
  | "MANDATE_FAILED"
  | "MANDATE_INACTIVE"
  | "MANDATE_UNKNOWN"
  | "INVOICE_MISSING"
  | "PAYMENT_SCHEDULED"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "PAYMENT_UNKNOWN"
  | "OPEN_ALERT"
  | "PROVIDER_UNAVAILABLE";

export interface BillingChainReason {
  code: BillingChainReasonCode;
  detail: string;
}

export interface BillingChainSnapshot {
  student: { id: string; name: string; status: string } | null;
  billingAccount: {
    id: string;
    paymentMethod: string;
    mandateState: DirectDebitStatus | string;
    provisioningState: string;
    providerContactReference: string | null;
    providerContactUrl: string | null;
    verifiedAt: string | null;
    lastReconciledAt: string | null;
    nextReconcileAt: string | null;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
  } | null;
  accountingLink: {
    status: string;
    provider: string;
    resourceType: string;
    externalReference: string;
    externalUrl: string;
  } | null;
  providerMandateState?: string | null;
  providerContactUrl?: string | null;
  providerErrorCode?: string | null;
  invoice: {
    id: string;
    status: string;
    freeagentReference: string | null;
    providerStatus: string | null;
  } | null;
  payment: {
    status: string;
    providerStatus: string | null;
  } | null;
  openAlertCount: number;
}

export interface BillingChainAudit {
  status: BillingChainAuditStatus;
  studentId: string;
  checkedAt: string;
  reasons: BillingChainReason[];
  snapshot: BillingChainSnapshot;
}

function push(reasons: BillingChainReason[], code: BillingChainReasonCode, detail: string): void {
  reasons.push({ code, detail });
}

export function evaluateBillingChain(
  studentId: string,
  snapshot: BillingChainSnapshot,
  checkedAt: string
): BillingChainAudit {
  const reasons: BillingChainReason[] = [];
  if (!snapshot.student) {
    push(reasons, "STUDENT_NOT_FOUND", "The student record does not exist.");
    return { status: "BROKEN", studentId, checkedAt, reasons, snapshot };
  }
  if (!snapshot.billingAccount) {
    push(reasons, "BILLING_ACCOUNT_MISSING", "The student has no customer-level billing account.");
    return { status: "ACTION_REQUIRED", studentId, checkedAt, reasons, snapshot };
  }
  if (snapshot.providerErrorCode) {
    push(reasons, "PROVIDER_UNAVAILABLE", `FreeAgent read failed with ${snapshot.providerErrorCode}.`);
  }
  if (snapshot.billingAccount.lastErrorCode === "CONFLICT" || snapshot.billingAccount.lastErrorCode === "NOT_FOUND") {
    push(reasons, "CONTACT_MAPPING_MISMATCH", "The verified FreeAgent contact could not be reconciled safely.");
  }
  if (snapshot.billingAccount.lastErrorCode && ["AUTHENTICATION", "AUTHORIZATION", "RATE_LIMIT", "TIMEOUT", "TEMPORARY_PROVIDER", "NETWORK", "UNKNOWN"].includes(snapshot.billingAccount.lastErrorCode)) {
    push(reasons, "PROVIDER_UNAVAILABLE", `FreeAgent read failed with ${snapshot.billingAccount.lastErrorCode}.`);
  }
  if (snapshot.billingAccount.paymentMethod !== "DIRECT_DEBIT") {
    push(reasons, "PAYMENT_METHOD_MISMATCH", "The billing account is not configured for Direct Debit.");
  }
  if (!snapshot.accountingLink) {
    push(reasons, "FREEAGENT_LINK_MISSING", "No FreeAgent contact mapping is available.");
  } else if (snapshot.accountingLink.status !== "VERIFIED") {
    push(reasons, "FREEAGENT_LINK_UNVERIFIED", "The FreeAgent contact mapping is not verified.");
  } else if (
    snapshot.accountingLink.provider !== "FREEAGENT" ||
    snapshot.accountingLink.resourceType !== "CONTACT" ||
    snapshot.billingAccount.providerContactReference !== snapshot.accountingLink.externalReference
  ) {
    push(reasons, "CONTACT_MAPPING_MISMATCH", "The billing account and verified FreeAgent contact mapping disagree.");
  }

  const mandate = snapshot.providerMandateState
    ? snapshot.providerMandateState.toLowerCase()
    : snapshot.billingAccount.mandateState;
  switch (mandate) {
    case "SETUP_REQUIRED":
    case "setup":
      push(reasons, "MANDATE_SETUP_REQUIRED", "The FreeAgent contact has no completed Direct Debit mandate.");
      break;
    case "AUTHORISATION_PENDING":
    case "pending":
      push(reasons, "MANDATE_PENDING", "The Direct Debit authorisation is still pending.");
      break;
    case "ACTIVE":
    case "active":
      push(reasons, "MANDATE_ACTIVE", "The Direct Debit mandate is active.");
      break;
    case "FAILED":
    case "failed":
      push(reasons, "MANDATE_FAILED", "The Direct Debit mandate failed.");
      break;
    case "INACTIVE":
    case "inactive":
      push(reasons, "MANDATE_INACTIVE", "The Direct Debit mandate is inactive.");
      break;
    default:
      push(
        reasons,
        "MANDATE_UNKNOWN",
        snapshot.billingAccount.lastErrorMessage ?? "The provider mandate state is unavailable or unexpected."
      );
  }

  if (snapshot.invoice) {
    if (snapshot.payment) {
      switch (snapshot.payment.status) {
        case "SCHEDULED":
          push(reasons, "PAYMENT_SCHEDULED", "The collection is scheduled and not yet settled.");
          break;
        case "SUBMITTED":
          push(reasons, "PAYMENT_SUBMITTED", "The collection was submitted and is not yet settled.");
          break;
        case "PENDING":
          push(reasons, "PAYMENT_PENDING", "The provider is processing the collection.");
          break;
        case "CONFIRMED":
          push(reasons, "PAYMENT_CONFIRMED", "The provider has confirmed payment.");
          break;
        case "FAILED":
          push(reasons, "PAYMENT_FAILED", "The provider reported a failed collection.");
          break;
        case "UNKNOWN":
          push(reasons, "PAYMENT_UNKNOWN", "The payment state requires reconciliation.");
          break;
      }
    } else if (snapshot.invoice.status !== "PAID" && snapshot.invoice.status !== "CANCELLED") {
      push(reasons, "INVOICE_MISSING", "An invoice exists without a recorded payment state.");
    }
  }
  if (snapshot.openAlertCount > 0) push(reasons, "OPEN_ALERT", "Open billing alerts require operational review.");

  const codes = new Set(reasons.map((reason) => reason.code));
  let status: BillingChainAuditStatus = "HEALTHY";
  if (codes.has("MANDATE_UNKNOWN") || codes.has("PAYMENT_UNKNOWN") || codes.has("PROVIDER_UNAVAILABLE")) status = "UNKNOWN";
  if (codes.has("MANDATE_SETUP_REQUIRED") || codes.has("MANDATE_PENDING") || codes.has("PAYMENT_SCHEDULED") || codes.has("PAYMENT_SUBMITTED") || codes.has("PAYMENT_PENDING") || codes.has("OPEN_ALERT")) {
    status = status === "UNKNOWN" ? "UNKNOWN" : "WARNING";
  }
  if (codes.has("MANDATE_FAILED") || codes.has("MANDATE_INACTIVE") || codes.has("MANDATE_SETUP_REQUIRED") || codes.has("FREEAGENT_LINK_MISSING") || codes.has("FREEAGENT_LINK_UNVERIFIED") || codes.has("BILLING_ACCOUNT_MISSING") || codes.has("PAYMENT_FAILED")) {
    status = "ACTION_REQUIRED";
  }
  if (codes.has("PAYMENT_METHOD_MISMATCH") || codes.has("CONTACT_MAPPING_MISMATCH")) status = "BROKEN";
  return { status, studentId, checkedAt, reasons, snapshot };
}

export async function auditBillingChain(
  db: D1Database,
  studentId: string,
  checkedAt: string,
  providerSnapshot: Pick<BillingChainSnapshot, "providerMandateState" | "providerContactUrl" | "providerErrorCode"> = {}
): Promise<BillingChainAudit> {
  const student = await db.prepare(
    "SELECT id, name, status FROM students WHERE id = ?"
  ).bind(studentId).first<{ id: string; name: string; status: string }>();
  const billingAccount = await db.prepare(
    `SELECT id, payment_method, mandate_state, provisioning_state,
            provider_contact_reference, provider_contact_url, verified_at,
            last_reconciled_at, next_reconcile_at, last_error_code, last_error_message
     FROM billing_accounts WHERE student_id = ?`
  ).bind(studentId).first<{
    id: string;
    payment_method: string;
    mandate_state: string;
    provisioning_state: string;
    provider_contact_reference: string | null;
    provider_contact_url: string | null;
    verified_at: string | null;
    last_reconciled_at: string | null;
    next_reconcile_at: string | null;
    last_error_code: string | null;
    last_error_message: string | null;
  }>();
  const accountingLink = await db.prepare(
    `SELECT status, provider, external_resource_type, external_reference, external_url
     FROM external_accounting_links
     WHERE local_entity_type = 'STUDENT' AND local_entity_id = ?`
  ).bind(studentId).first<{
    status: string;
    provider: string;
    external_resource_type: string;
    external_reference: string;
    external_url: string;
  }>();
  const invoice = await db.prepare(
    `SELECT id, status, freeagent_reference, provider_status
     FROM billing_invoices
     WHERE student_id = ?
     ORDER BY updated_at DESC, id DESC LIMIT 1`
  ).bind(studentId).first<{
    id: string;
    status: string;
    freeagent_reference: string | null;
    provider_status: string | null;
  }>();
  const payment = invoice
    ? await db.prepare(
      `SELECT status, provider_status FROM billing_payments
       WHERE invoice_id = ?`
    ).bind(invoice.id).first<{ status: string; provider_status: string | null }>()
    : null;
  const alert = await db.prepare(
    `SELECT COUNT(*) AS count FROM billing_alerts
     WHERE student_id = ? AND status IN ('OPEN', 'ACKNOWLEDGED')`
  ).bind(studentId).first<{ count: number | string }>();
  return evaluateBillingChain(studentId, {
    student: student ?? null,
    billingAccount: billingAccount ? {
      id: billingAccount.id,
      paymentMethod: billingAccount.payment_method,
      mandateState: billingAccount.mandate_state,
      provisioningState: billingAccount.provisioning_state,
      providerContactReference: billingAccount.provider_contact_reference,
      providerContactUrl: billingAccount.provider_contact_url,
      verifiedAt: billingAccount.verified_at,
      lastReconciledAt: billingAccount.last_reconciled_at,
      nextReconcileAt: billingAccount.next_reconcile_at,
      lastErrorCode: billingAccount.last_error_code,
      lastErrorMessage: billingAccount.last_error_message
    } : null,
    accountingLink: accountingLink ? {
      status: accountingLink.status,
      provider: accountingLink.provider,
      resourceType: accountingLink.external_resource_type,
      externalReference: accountingLink.external_reference,
      externalUrl: accountingLink.external_url
    } : null,
    providerMandateState: providerSnapshot.providerMandateState,
    providerContactUrl: providerSnapshot.providerContactUrl,
    invoice: invoice ? {
      id: invoice.id,
      status: invoice.status,
      freeagentReference: invoice.freeagent_reference,
      providerStatus: invoice.provider_status
    } : null,
    payment: payment ? { status: payment.status, providerStatus: payment.provider_status } : null,
    openAlertCount: Number(alert?.count ?? 0)
  }, checkedAt);
}
