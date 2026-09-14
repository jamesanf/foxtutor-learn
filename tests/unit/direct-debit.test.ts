import { describe, expect, it } from "vitest";
import {
  directDebitStatusCopy,
  mapDirectDebitStatus
} from "../../src/domain/direct-debit";

describe("Direct Debit mandate state mapping", () => {
  it.each([
    ["setup", "SETUP_REQUESTED"],
    ["pending", "PENDING_AUTHORISATION"],
    ["active", "ACTIVE"],
    ["inactive", "FAILED"],
    ["failed", "FAILED"],
    ["unexpected", "UNKNOWN"],
    [null, "UNKNOWN"]
  ] as const)("maps provider state %s to %s", (providerState, expected) => {
    expect(mapDirectDebitStatus(providerState, true)).toBe(expected);
  });

  it("does not treat an unconfigured contact as an unknown provider state", () => {
    expect(mapDirectDebitStatus(null, false)).toBe("NOT_CONFIGURED");
    expect(mapDirectDebitStatus("active", false)).toBe("NOT_CONFIGURED");
  });

  it("keeps customer copy free of provider identifiers and bank-data instructions", () => {
    for (const status of ["NOT_CONFIGURED", "SETUP_REQUESTED", "PENDING_AUTHORISATION", "ACTIVE", "FAILED", "UNKNOWN"] as const) {
      const copy = directDebitStatusCopy(status);
      expect(copy.label).not.toMatch(/freeagent|gocardless|mandate id|customer id/i);
      expect(copy.description).not.toMatch(/sort code|account number/i);
    }
    expect(directDebitStatusCopy("PENDING_AUTHORISATION").description).toContain("three working days");
    expect(directDebitStatusCopy("UNKNOWN").action).toContain("Do not submit bank details");
  });
});
