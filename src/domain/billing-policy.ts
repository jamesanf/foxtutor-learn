export const NORMAL_PAYMENT_METHOD = "DIRECT_DEBIT" as const;

export type BillingPaymentMethod = typeof NORMAL_PAYMENT_METHOD;

export function isNormalCustomerPaymentMethod(value: string): value is BillingPaymentMethod {
  return value === NORMAL_PAYMENT_METHOD;
}

export function validateEmergencyPaygReason(reason: string): string | null {
  const normalized = reason.trim();
  if (normalized.length < 10) return "An emergency payment exception requires a reason of at least 10 characters.";
  if (normalized.length > 500) return "The emergency payment exception reason is too long.";
  return null;
}

export function canRecordEmergencyPayg(input: {
  actorRole: "ADMIN" | "STUDENT";
  reason: string;
  lessonAlreadySecured: boolean;
}): boolean {
  return input.actorRole === "ADMIN"
    && !input.lessonAlreadySecured
    && validateEmergencyPaygReason(input.reason) === null;
}
