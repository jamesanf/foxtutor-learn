import { describe, expect, it } from "vitest";
import { renderCreditCoveredInvoiceComment, renderCreditCoveredStatement, renderCreditRefundConfirmation } from "../../src/billing/service";

describe("credit-covered invoice comments", () => {
  it("uses only normalized invoice references and never exposes internal credit identifiers", () => {
    const comment = renderCreditCoveredInvoiceComment([
      "credit:phase717-live-zero",
      "FT26091501"
    ]);

    expect(comment).toContain("invoice FT26091501");
    expect(comment).not.toContain("credit:phase717-live-zero");
    expect(comment).toContain("amount due £0.00");
    expect(comment).toContain("Please ignore the payment details above");
  });

  it("uses a safe generic source when no normalized reference exists", () => {
    const comment = renderCreditCoveredInvoiceComment(["provider-internal-id"]);

    expect(comment).toContain("a previous FoxTutor invoice");
    expect(comment).not.toContain("provider-internal-id");
  });

  it("renders a bank-free customer statement without exposing internal identifiers", () => {
    const statement = renderCreditCoveredStatement(
      "KJHGBH Live Customer",
      "FT26091504",
      "2026-09-20",
      5500,
      [
        { invoiceReference: "FT26091501", lessonDate: "2026-09-16", amountMinor: 5500 },
        { invoiceReference: null, lessonDate: "2026-09-17", amountMinor: 0 }
      ]
    );

    expect(statement.subject).toBe("Your FoxTutor lesson is paid - 20 September 2026");
    expect(statement.text).toContain("Invoice FT26091501");
    expect(statement.text).toContain("lesson on 16 September 2026");
    expect(statement.text).toContain("lesson on 17 September 2026");
    expect(statement.text).not.toContain("credit:phase717-live-zero");
    expect(statement.text).not.toMatch(/sort code|account number|bank details|payment reference/i);
    expect(statement.html).not.toMatch(/sort code|account number|bank details|payment reference/i);
    expect(statement.text).toContain("Lesson paid for: 20 September 2026");
    expect(statement.text).toContain("Lesson fee: £55.00");
    expect(statement.text).toContain("Credit used: £55.00");
    expect(statement.text).toContain("Amount due: £0.00");
    expect(statement.text).toContain("You do not need to make a payment or set up Direct Debit");
    expect(statement.html).toContain("Payment received");
    expect(statement.html).toContain(">Billing</div>");
  });

  it("renders method-specific refund guidance without bank details", () => {
    const refund = renderCreditRefundConfirmation(
      "KJHGBH Live Customer",
      5500,
      "METTLE_BANK_TRANSFER",
      "METTLE-123",
      "FT26091501",
      "2026-09-16"
    );

    expect(refund.subject).toBe("Your FoxTutor refund has been processed");
    expect(refund.text).toContain("Refund amount: £55.00");
    expect(refund.text).toContain("Mettle bank transfer");
    expect(refund.text).toContain("FT26091501 for the lesson on 16 September 2026");
    expect(refund.text).toContain("3–5 working days");
    expect(refund.text).not.toMatch(/sort code|account number|bank details/i);
    expect(refund.html).toContain("Refund processed");
  });
});
