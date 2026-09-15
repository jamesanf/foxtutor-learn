import { describe, expect, it } from "vitest";
import { renderCreditCoveredInvoiceComment, renderCreditCoveredStatement } from "../../src/billing/service";

describe("credit-covered invoice comments", () => {
  it("uses only normalized invoice references and never exposes internal credit identifiers", () => {
    const comment = renderCreditCoveredInvoiceComment([
      "credit:phase717-live-zero",
      "FT-INV-26091501"
    ]);

    expect(comment).toContain("invoice FT-INV-26091501");
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
      "FT-INV-26091504",
      "2026-09-20",
      ["credit:phase717-live-zero", "FT-INV-26091501"]
    );

    expect(statement.subject).toBe("Credit-covered billing statement FT-INV-26091504");
    expect(statement.text).toContain("invoice FT-INV-26091501");
    expect(statement.text).not.toContain("credit:phase717-live-zero");
    expect(statement.text).not.toMatch(/sort code|account number|bank details|payment reference/i);
    expect(statement.html).not.toMatch(/sort code|account number|bank details|payment reference/i);
    expect(statement.text).toContain("£0.00");
  });
});
