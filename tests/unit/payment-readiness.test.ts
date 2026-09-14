import { describe, expect, it } from "vitest";
import { calculatePaymentReadiness, collectionDateForLesson } from "../../src/domain/payment-readiness";

const base = {
  lessonDate: "2026-09-21",
  collectionDate: "2026-09-14",
  now: "2026-09-10T12:00:00.000Z",
  grossAmountMinor: 5500n,
  creditAvailableMinor: 0n,
  invoiceAmountMinor: 5500n,
  invoiceStatus: "SENT",
  paymentStatus: null,
  mandateState: null
} as const;

describe("payment readiness", () => {
  it("keeps the seven-day collection rule separate from the lesson date", () => {
    expect(collectionDateForLesson("2026-09-21")).toBe("2026-09-14");
  });

  it("recognises credit-covered lessons as secured without creating a collection", () => {
    const result = calculatePaymentReadiness({ ...base, creditAvailableMinor: 5500n, invoiceAmountMinor: 0n });
    expect(result.state).toBe("CREDIT_COVERED");
    expect(result.paymentSecuredForLesson).toBe(true);
  });

  it("preserves a meaningful zero invoice amount instead of using truthiness", () => {
    const result = calculatePaymentReadiness({ ...base, invoiceAmountMinor: 0n, creditAvailableMinor: 5500n });
    expect(result.invoiceAmountMinor).toBe(0n);
    expect(result.state).toBe("CREDIT_COVERED");
  });

  it("rejects negative money values", () => {
    expect(() => calculatePaymentReadiness({ ...base, invoiceAmountMinor: -1n })).toThrow();
    expect(() => calculatePaymentReadiness({ ...base, creditAvailableMinor: -1n })).toThrow();
  });

  it("does not treat a pending Direct Debit as secured cash", () => {
    const result = calculatePaymentReadiness({
      ...base,
      now: "2026-09-15T12:00:00.000Z",
      mandateState: "active",
      paymentStatus: "PENDING"
    });
    expect(result.state).toBe("COLLECTION_PENDING");
    expect(result.paymentSecuredForLesson).toBe(false);
  });

  it("distinguishes first mandate setup and confirmed payment", () => {
    expect(calculatePaymentReadiness({
      ...base,
      now: "2026-09-15T12:00:00.000Z",
      mandateState: "pending"
    }).state).toBe("MANDATE_PENDING");
    expect(calculatePaymentReadiness({
      ...base,
      invoiceStatus: "PAID",
      paymentStatus: "CONFIRMED",
      mandateState: "active"
    }).state).toBe("PAYMENT_SECURED");
  });

  it("surfaces failed and unknown provider collection states", () => {
    expect(calculatePaymentReadiness({ ...base, paymentStatus: "FAILED" }).state).toBe("PAYMENT_FAILED");
    expect(calculatePaymentReadiness({ ...base, paymentStatus: "UNKNOWN" }).state).toBe("PAYMENT_UNKNOWN");
  });

  it("does not secure a lesson when collection has only been submitted", () => {
    const result = calculatePaymentReadiness({
      ...base,
      now: "2026-09-15T12:00:00.000Z",
      mandateState: "active",
      paymentStatus: "SUBMITTED"
    });
    expect(result.state).toBe("COLLECTION_SUBMITTED");
    expect(result.paymentSecuredForLesson).toBe(false);
  });
});
