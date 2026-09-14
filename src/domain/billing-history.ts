export type CustomerBillingHistoryKind =
  | "LESSON_CHARGE"
  | "CANCELLATION"
  | "CREDIT"
  | "CREDIT_CONSUMED"
  | "INVOICE"
  | "PAYMENT";

function readinessLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function billingCustomerStatusLabel(kind: CustomerBillingHistoryKind, status: string): string {
  const normalized = status.toUpperCase();
  if (kind === "INVOICE" && ["DRAFT", "PENDING_PROVIDER", "PENDING", "PAYMENT_PENDING"].includes(normalized)) {
    return "Invoice outstanding";
  }
  if (normalized === "SUBMITTED") return "Collection submitted";
  if (normalized === "PAYMENT_PENDING" || normalized === "PENDING") return "Payment processing";
  if (normalized === "SCHEDULED") return "Collection scheduled";
  if (normalized === "CONFIRMED" || normalized === "PAID") return "Payment confirmed";
  if (normalized === "FAILED") return "Payment failed";
  if (normalized === "UNKNOWN" || normalized === "RECONCILIATION_REQUIRED") return "Needs checking";
  if (normalized === "SENT" || normalized === "INVOICE_CREATED") return "Invoice outstanding";
  if (normalized === "CREDIT_COVERED" || normalized === "SETTLED") return "Covered by credit";
  if (kind === "CREDIT" || kind === "CREDIT_CONSUMED") return readinessLabel(normalized);
  return readinessLabel(normalized);
}
