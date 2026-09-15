import { describe, expect, it } from "vitest";
import { renderCreditCoveredInvoiceComment } from "../../src/billing/service";

describe("credit-covered invoice comments", () => {
  it("uses only normalized invoice references and never exposes internal credit identifiers", () => {
    const comment = renderCreditCoveredInvoiceComment([
      "credit:phase717-live-zero",
      "FT-INV-26091501"
    ]);

    expect(comment).toContain("invoice FT-INV-26091501");
    expect(comment).not.toContain("credit:phase717-live-zero");
    expect(comment).toContain("No payment is due");
    expect(comment).toContain("bank details shown by FreeAgent must be ignored");
  });

  it("uses a safe generic source when no normalized reference exists", () => {
    const comment = renderCreditCoveredInvoiceComment(["provider-internal-id"]);

    expect(comment).toContain("a previous FoxTutor invoice");
    expect(comment).not.toContain("provider-internal-id");
  });
});
