import { describe, expect, it } from "vitest";
import { billingCustomerStatusLabel } from "../../src/domain/billing-history";
import { mapFreeAgentInvoicePaymentStatus } from "../../src/domain/payment-status";

describe("billing history customer labels", () => {
  it("does not present an invoice-only pending state as payment processing", () => {
    expect(billingCustomerStatusLabel("INVOICE", "PAYMENT_PENDING")).toBe("Invoice outstanding");
    expect(billingCustomerStatusLabel("INVOICE", "SENT")).toBe("Invoice outstanding");
    expect(billingCustomerStatusLabel("PAYMENT", "PENDING")).toBe("Payment processing");
  });

  it.each([
    ["SENT", null, "NOT_STARTED", "INVOICE", "SENT", "Invoice outstanding"],
    ["OPEN", "Payment pending", "PENDING", "PAYMENT", "PENDING", "Payment processing"],
    ["OPEN", "Payment submitted", "SUBMITTED", "PAYMENT", "SUBMITTED", "Collection submitted"],
    ["PAID", null, "CONFIRMED", "PAYMENT", "CONFIRMED", "Payment confirmed"],
    ["OPEN", "Payment failed", "FAILED", "PAYMENT", "FAILED", "Payment failed"]
  ] as const)("maps %s/%s to %s", (invoiceStatus, paymentStatus, expectedLifecycle, kind, displayStatus, expected) => {
    expect(mapFreeAgentInvoicePaymentStatus(invoiceStatus, paymentStatus)).toBe(expectedLifecycle);
    expect(billingCustomerStatusLabel(kind, displayStatus)).toBe(expected);
  });
});
