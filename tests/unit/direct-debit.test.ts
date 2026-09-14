import { describe, expect, it } from "vitest";
import {
  classifyDirectDebitState,
  directDebitStatusCopy,
  mapDirectDebitStatus
} from "../../src/domain/direct-debit";
import { freeAgentContactFixture } from "../../src/accounting/freeagent/fixtures";

describe("Direct Debit mandate state mapping", () => {
  it.each([
    ["setup", "SETUP_REQUIRED"],
    ["pending", "AUTHORISATION_PENDING"],
    ["active", "ACTIVE"],
    ["inactive", "INACTIVE"],
    ["failed", "FAILED"],
    ["unexpected", "UNKNOWN"],
    [null, "UNKNOWN"]
  ] as const)("maps provider state %s to %s", (providerState, expected) => {
    expect(mapDirectDebitStatus(providerState, true)).toBe(expected);
  });

  it("does not treat an unconfigured contact as an unknown provider state", () => {
    expect(mapDirectDebitStatus(null, false)).toBe("SETUP_REQUIRED");
    expect(mapDirectDebitStatus("active", false)).toBe("SETUP_REQUIRED");
  });

  it("classifies a mapped contact with no mandate field as an observable provider gap", () => {
    expect(classifyDirectDebitState(null, true)).toEqual({
      status: "UNKNOWN",
      diagnosticCode: "MANDATE_STATE_MISSING",
      diagnosticMessage: "FreeAgent returned the mapped contact without a Direct Debit mandate state."
    });
  });

  it("classifies malformed and unexpected provider values separately", () => {
    expect(classifyDirectDebitState(42 as never, true).diagnosticCode).toBe("MALFORMED_PROVIDER_RESPONSE");
    expect(classifyDirectDebitState("future-provider-state", true).diagnosticCode).toBe("UNEXPECTED_MANDATE_STATE");
  });

  it("keeps customer copy free of provider identifiers and bank-data instructions", () => {
    for (const status of ["SETUP_REQUIRED", "AUTHORISATION_PENDING", "ACTIVE", "FAILED", "INACTIVE", "UNKNOWN"] as const) {
      const copy = directDebitStatusCopy(status);
      expect(copy.label).not.toMatch(/freeagent|gocardless|mandate id|customer id/i);
      expect(copy.description).not.toMatch(/sort code|account number/i);
    }
    expect(directDebitStatusCopy("AUTHORISATION_PENDING").description).toContain("being completed");
    expect(directDebitStatusCopy("UNKNOWN").action).not.toContain("bank details");
  });

  it.each([
    ["setup", "SETUP_REQUIRED"],
    ["pending", "AUTHORISATION_PENDING"],
    ["inactive", "INACTIVE"],
    ["active", "ACTIVE"],
    ["failed", "FAILED"],
    ["null", "UNKNOWN"],
    ["unknown", "UNKNOWN"]
  ] as const)("maps the synthetic provider fixture %s without losing state", (fixtureState, expected) => {
    const fixture = freeAgentContactFixture(fixtureState);
    expect(mapDirectDebitStatus(fixture.contact.direct_debit_mandate_state ?? null, true)).toBe(expected);
  });
});
