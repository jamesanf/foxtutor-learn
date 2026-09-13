import type { BillingConsequence } from "./cancellations";

export type AccountingEventType = "CANCELLATION_ACCOUNTING" | "RESCHEDULE_ACCOUNTING";
export type AccountingActionType = "NO_ACTION" | "CREATE_INVOICE";
export type AccountingStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "RETRYABLE" | "FAILED" | "UNKNOWN" | "NOT_REQUIRED";
export type AccountingErrorCode =
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "RATE_LIMIT"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TEMPORARY_PROVIDER"
  | "NETWORK"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE"
  | "CONFIGURATION"
  | "CONTACT_MAPPING_REQUIRED"
  | "BUSINESS_MAPPING_REQUIRED"
  | "STALE_PROCESSING"
  | "UNKNOWN";

export interface AccountingDecision {
  actionType: AccountingActionType;
  status: AccountingStatus;
  providerStatus: string;
  safeErrorCode: AccountingErrorCode | null;
  safeErrorMessage: string | null;
}

export function accountingEventTypeForHistory(eventType: string): AccountingEventType | null {
  if (eventType === "STUDENT_CANCELLED" || eventType === "CANCELLATION_APPROVED" || eventType === "ADMIN_CANCELLED") {
    return "CANCELLATION_ACCOUNTING";
  }
  if (eventType === "RESCHEDULED") return "RESCHEDULE_ACCOUNTING";
  return null;
}

export function accountingDecisionForBillingConsequence(consequence: BillingConsequence): AccountingDecision {
  switch (consequence) {
    case "NO_CHARGE":
    case "EXCEPTION_WAIVED":
    case "RESCHEDULED":
      return {
        actionType: "NO_ACTION",
        status: "NOT_REQUIRED",
        providerStatus: "NOT_REQUIRED",
        safeErrorCode: null,
        safeErrorMessage: null
      };
    case "ADMIN_CANCELLED":
      return {
        actionType: "CREATE_INVOICE",
        status: "FAILED",
        providerStatus: "NOT_ATTEMPTED",
        safeErrorCode: "BUSINESS_MAPPING_REQUIRED",
        safeErrorMessage: "Administrative cancellation accounting treatment is not configured."
      };
    case "CANCELLATION_PENDING_DECISION":
      return {
        actionType: "NO_ACTION",
        status: "NOT_REQUIRED",
        providerStatus: "NOT_REQUIRED",
        safeErrorCode: null,
        safeErrorMessage: null
      };
  }
}

export function accountingIdempotencyKey(eventType: AccountingEventType, businessEventId: string): string {
  return `accounting:${eventType}:${businessEventId}`;
}

export function accountingReference(businessEventId: string): string {
  return `FT-ACC-${businessEventId.replace(/[^A-Za-z0-9]/g, "").slice(0, 24)}`;
}

export function nextAccountingRetryAt(now: string, attemptCount: number): string | null {
  if (attemptCount >= 5) return null;
  const minutes = Math.min(60, 5 * 2 ** Math.max(0, attemptCount - 1));
  return new Date(Date.parse(now) + minutes * 60_000).toISOString();
}

export function isSafeAccountingRetry(status: AccountingStatus, errorCode: AccountingErrorCode | null): boolean {
  if (status === "RETRYABLE") return true;
  return status === "FAILED" && errorCode !== "BUSINESS_MAPPING_REQUIRED" && errorCode !== "CONTACT_MAPPING_REQUIRED";
}
