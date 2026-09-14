export type PaymentReadiness =
  | "CREDIT_COVERED"
  | "NOT_YET_DUE"
  | "INVOICE_OPEN"
  | "MANDATE_PENDING"
  | "COLLECTION_SCHEDULED"
  | "COLLECTION_PENDING"
  | "PAYMENT_SECURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_UNKNOWN"
  | "RECONCILIATION_REQUIRED";

export type MandateState = "setup" | "pending" | "inactive" | "active" | "failed" | null;

export interface PaymentReadinessInput {
  lessonDate: string;
  collectionDate: string;
  now: string;
  grossAmountMinor: bigint;
  creditAvailableMinor: bigint;
  invoiceAmountMinor: bigint;
  invoiceStatus: string | null;
  paymentStatus: string | null;
  mandateState: MandateState;
  invoiceProviderStatus?: string | null;
}

export interface PaymentReadinessResult {
  lessonPriceMinor: bigint;
  currentCreditMinor: bigint;
  invoiceAmountMinor: bigint;
  creditToApplyMinor: bigint;
  remainingAmountMinor: bigint;
  collectionDate: string;
  state: PaymentReadiness;
  paymentSecuredForLesson: boolean;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function collectionDateForLesson(lessonDate: string): string {
  if (!isIsoDate(lessonDate)) throw new Error("Lesson date must be an ISO calendar date.");
  const date = new Date(`${lessonDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

export function calculatePaymentReadiness(input: PaymentReadinessInput): PaymentReadinessResult {
  if (input.grossAmountMinor <= 0n) throw new Error("Lesson price must be positive.");
  if (input.creditAvailableMinor < 0n || input.invoiceAmountMinor < 0n) throw new Error("Payment amounts cannot be negative.");
  if (!isIsoDate(input.lessonDate) || !isIsoDate(input.collectionDate)) throw new Error("Payment dates must be ISO calendar dates.");
  const creditToApplyMinor = input.grossAmountMinor < input.creditAvailableMinor ? input.grossAmountMinor : input.creditAvailableMinor;
  const expectedInvoiceAmount = input.grossAmountMinor - creditToApplyMinor;
  // Zero is a meaningful net invoice amount when credit covers the lesson;
  // do not let BigInt truthiness decide whether an invoice amount exists.
  const remainingAmountMinor = input.invoiceAmountMinor === 0n && expectedInvoiceAmount > 0n
    ? expectedInvoiceAmount
    : input.invoiceAmountMinor;
  const result = (state: PaymentReadiness, paymentSecuredForLesson: boolean): PaymentReadinessResult => ({
    lessonPriceMinor: input.grossAmountMinor,
    currentCreditMinor: input.creditAvailableMinor,
    invoiceAmountMinor: input.invoiceAmountMinor,
    creditToApplyMinor,
    remainingAmountMinor,
    collectionDate: input.collectionDate,
    state,
    paymentSecuredForLesson
  });
  if (remainingAmountMinor === 0n) {
    return result("CREDIT_COVERED", true);
  }
  if (input.invoiceStatus === "PAID" || input.paymentStatus === "CONFIRMED" || input.invoiceProviderStatus === "Paid") {
    return result("PAYMENT_SECURED", true);
  }
  if (input.invoiceStatus === "UNKNOWN" || input.invoiceStatus === "RECONCILIATION_REQUIRED") {
    return result("RECONCILIATION_REQUIRED", false);
  }
  if (input.paymentStatus === "FAILED" || input.invoiceProviderStatus === "Payment failed") {
    return result("PAYMENT_FAILED", false);
  }
  if (input.paymentStatus === "UNKNOWN" || input.invoiceProviderStatus === "Unknown") {
    return result("PAYMENT_UNKNOWN", false);
  }
  if (input.now.slice(0, 10) < input.collectionDate) {
    return result("NOT_YET_DUE", false);
  }
  if (input.mandateState !== "active") {
    return result("MANDATE_PENDING", false);
  }
  if (input.paymentStatus === "PENDING") {
    return result("COLLECTION_PENDING", false);
  }
  if (input.paymentStatus === "SCHEDULED") {
    return result("COLLECTION_SCHEDULED", false);
  }
  return result("INVOICE_OPEN", false);
}
