import type { BillingConsequence } from "./cancellations";

export type AccountingEventType = "CANCELLATION_ACCOUNTING" | "RESCHEDULE_ACCOUNTING";
export type AccountingActionType = "NO_ACTION" | "CREATE_INVOICE" | "UNRESOLVED";
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

export const NORMAL_LESSON_PRICE_MINOR_UNITS = 5500n;
export const NORMAL_LESSON_CURRENCY = "GBP";
export const NON_VAT_SALES_TAX_RATE = "0";

export function parseMinorUnits(value: string, scale = 2): bigint | null {
  const normalized = value.trim();
  const pattern = new RegExp(`^(\\d+)(?:\\.(\\d{1,${scale}}))?$`);
  const match = pattern.exec(normalized);
  if (!match) return null;
  try {
    return BigInt(`${match[1]}${(match[2] ?? "").padEnd(scale, "0")}`);
  } catch {
    return null;
  }
}

export function formatMinorUnits(value: bigint, scale = 2): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const splitAt = digits.length - scale;
  return `${negative ? "-" : ""}${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`;
}

export function normalizeSalesTaxRate(value: string): string | null {
  const minorUnits = parseMinorUnits(value, 2);
  if (minorUnits === null || minorUnits < 0n || minorUnits > 10000n) return null;
  const formatted = formatMinorUnits(minorUnits);
  return formatted.replace(/(?:\.00|(\.\d)0)$/, "$1").replace(/\.$/, "");
}

const accountingTransitions: Record<AccountingStatus, readonly AccountingStatus[]> = {
  PENDING: ["PROCESSING"],
  PROCESSING: ["SUCCEEDED", "RETRYABLE", "FAILED", "UNKNOWN"],
  SUCCEEDED: [],
  RETRYABLE: ["PROCESSING"],
  FAILED: ["RETRYABLE"],
  UNKNOWN: ["SUCCEEDED"],
  NOT_REQUIRED: []
};

export function canTransitionAccountingStatus(from: AccountingStatus, to: AccountingStatus): boolean {
  return accountingTransitions[from].includes(to);
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
        actionType: "NO_ACTION",
        status: "NOT_REQUIRED",
        providerStatus: "NOT_REQUIRED",
        safeErrorCode: null,
        safeErrorMessage: null
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
  return `FT-ACC-${businessEventId.replace(/[^A-Za-z0-9]/g, "")}`;
}

export function isAccountingEffectiveDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
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
