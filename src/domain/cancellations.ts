export const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type BillingConsequence =
  | "NO_CHARGE"
  | "CANCELLATION_PENDING_DECISION"
  | "EXCEPTION_WAIVED"
  | "ADMIN_CANCELLED"
  | "RESCHEDULED";

export type CancellationEligibilityReason =
  | "ELIGIBLE"
  | "WITHIN_24_HOURS"
  | "ALREADY_STARTED"
  | "NOT_SCHEDULED"
  | "INVALID_START";

export interface CancellationLessonLike {
  status: string;
  start_at: string;
}

export interface CancellationEligibility {
  eligible: boolean;
  reason: CancellationEligibilityReason;
  availableUntil: string | null;
}

export function cancellationEligibility(lesson: CancellationLessonLike, now: string): CancellationEligibility {
  const start = Date.parse(lesson.start_at);
  const current = Date.parse(now);
  if (!Number.isFinite(start) || !Number.isFinite(current)) {
    return { eligible: false, reason: "INVALID_START", availableUntil: null };
  }
  if (lesson.status !== "scheduled") {
    return { eligible: false, reason: "NOT_SCHEDULED", availableUntil: null };
  }
  if (start <= current) {
    return { eligible: false, reason: "ALREADY_STARTED", availableUntil: null };
  }
  const availableUntil = new Date(start - CANCELLATION_WINDOW_MS).toISOString();
  return start - current > CANCELLATION_WINDOW_MS
    ? { eligible: true, reason: "ELIGIBLE", availableUntil }
    : { eligible: false, reason: "WITHIN_24_HOURS", availableUntil };
}

export function canStudentCancel(lesson: CancellationLessonLike, now: string): boolean {
  return cancellationEligibility(lesson, now).eligible;
}

export function canStudentReschedule(lesson: CancellationLessonLike, now: string): boolean {
  return canStudentCancel(lesson, now);
}

export function billingConsequenceForStudentCancellation(): BillingConsequence {
  return "NO_CHARGE";
}

export function billingConsequenceForExceptionApproval(): BillingConsequence {
  return "EXCEPTION_WAIVED";
}

export function billingConsequenceForAdminCancellation(): BillingConsequence {
  return "ADMIN_CANCELLED";
}

export function billingConsequenceForReschedule(): BillingConsequence {
  return "RESCHEDULED";
}

export function isSafeReason(value: string, maxLength = 1_000): boolean {
  if (!value.trim() || value.length > maxLength) return false;
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}
