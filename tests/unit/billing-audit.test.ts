import { describe, expect, it } from "vitest";
import { evaluateBillingChain, type BillingChainSnapshot } from "../../src/billing/audit";

const base: BillingChainSnapshot = {
  student: { id: "student-1", name: "Synthetic Customer", status: "ACTIVE" },
  billingAccount: {
    id: "billing-1",
    paymentMethod: "DIRECT_DEBIT",
    mandateState: "ACTIVE",
    provisioningState: "ACTIVE",
    providerContactReference: "900001",
    providerContactUrl: "https://api.sandbox.freeagent.com/v2/contacts/900001",
    verifiedAt: "2026-09-14T12:00:00.000Z",
    lastReconciledAt: "2026-09-14T12:00:00.000Z",
    nextReconcileAt: "2026-09-15T12:00:00.000Z",
    lastErrorCode: null,
    lastErrorMessage: null
  },
  accountingLink: {
    status: "VERIFIED",
    provider: "FREEAGENT",
    resourceType: "CONTACT",
    externalReference: "900001",
    externalUrl: "https://api.sandbox.freeagent.com/v2/contacts/900001"
  },
  invoice: {
    id: "invoice-1",
    status: "SENT",
    freeagentReference: "FT-SYNTHETIC-001",
    providerStatus: "Open"
  },
  payment: null,
  openAlertCount: 0
};

describe("billing chain audit", () => {
  it("reports a verified active mandate with no unresolved work as healthy", () => {
    expect(evaluateBillingChain("student-1", base, "2026-09-14T12:00:00.000Z").status).toBe("HEALTHY");
  });

  it("fails closed for a contact mapping mismatch", () => {
    const audit = evaluateBillingChain("student-1", {
      ...base,
      billingAccount: { ...base.billingAccount!, providerContactReference: "900002" }
    }, "2026-09-14T12:00:00.000Z");
    expect(audit.status).toBe("BROKEN");
    expect(audit.reasons.map((reason) => reason.code)).toContain("CONTACT_MAPPING_MISMATCH");
  });

  it("keeps submitted and pending collections out of healthy payment status", () => {
    for (const paymentStatus of ["SUBMITTED", "PENDING"] as const) {
      const audit = evaluateBillingChain("student-1", {
        ...base,
        payment: { status: paymentStatus, providerStatus: paymentStatus }
      }, "2026-09-14T12:00:00.000Z");
      expect(audit.status).toBe("WARNING");
    }
  });

  it("preserves provider unavailability as unknown", () => {
    const audit = evaluateBillingChain("student-1", {
      ...base,
      providerErrorCode: "TIMEOUT",
      providerMandateState: null
    }, "2026-09-14T12:00:00.000Z");
    expect(audit.status).toBe("UNKNOWN");
    expect(audit.reasons.map((reason) => reason.code)).toContain("PROVIDER_UNAVAILABLE");
  });

  it("reports a missing mandate field distinctly from transport failure", () => {
    const audit = evaluateBillingChain("student-1", {
      ...base,
      billingAccount: {
        ...base.billingAccount!,
        mandateState: "UNKNOWN",
        lastErrorCode: "MANDATE_STATE_MISSING",
        lastErrorMessage: "FreeAgent returned the mapped contact without a Direct Debit mandate state."
      }
    }, "2026-09-14T12:00:00.000Z");
    expect(audit.status).toBe("UNKNOWN");
    expect(audit.reasons).toContainEqual({
      code: "MANDATE_UNKNOWN",
      detail: "FreeAgent returned the mapped contact without a Direct Debit mandate state."
    });
  });
});
