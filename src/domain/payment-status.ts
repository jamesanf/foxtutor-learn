export type PaymentLifecycleState =
  | "NOT_STARTED"
  | "SCHEDULED"
  | "SUBMITTED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "UNKNOWN";

export function mapFreeAgentPaymentStatus(value: unknown): PaymentLifecycleState {
  if (typeof value !== "string") return "UNKNOWN";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "UNKNOWN";
  if (normalized === "paid" || normalized === "payment confirmed" || normalized === "confirmed") return "CONFIRMED";
  if (normalized === "scheduled" || normalized === "payment scheduled" || normalized === "scheduled to collect") return "SCHEDULED";
  if (normalized === "submitted" || normalized === "payment submitted" || normalized === "submitted to gocardless") return "SUBMITTED";
  if (normalized === "pending" || normalized === "payment pending" || normalized === "payment processing") return "PENDING";
  if (normalized === "failed" || normalized === "payment failed") return "FAILED";
  if (normalized === "not started" || normalized === "not_started") return "NOT_STARTED";
  return "UNKNOWN";
}

export function mapFreeAgentInvoicePaymentStatus(
  invoiceStatus: unknown,
  paymentStatus: unknown
): PaymentLifecycleState {
  const invoiceState = typeof invoiceStatus === "string" ? invoiceStatus.trim().toLowerCase() : "";
  if (invoiceState === "draft") return "NOT_STARTED";
  if (invoiceState === "paid") return "CONFIRMED";
  if (typeof paymentStatus === "string" && paymentStatus.trim()) {
    return mapFreeAgentPaymentStatus(paymentStatus);
  }
  if (["payment pending", "payment submitted", "payment failed"].includes(invoiceState)) {
    return mapFreeAgentPaymentStatus(invoiceState);
  }
  return "NOT_STARTED";
}
