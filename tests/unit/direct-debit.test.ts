import { describe, expect, it } from "vitest";
import {
  directDebitStatusCopy,
  mapDirectDebitStatus
} from "../../src/domain/direct-debit";

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

  it("keeps customer copy free of provider identifiers and bank-data instructions", () => {
    for (const status of ["SETUP_REQUIRED", "AUTHORISATION_PENDING", "ACTIVE", "FAILED", "INACTIVE", "UNKNOWN"] as const) {
      const copy = directDebitStatusCopy(status);
      expect(copy.label).not.toMatch(/freeagent|gocardless|mandate id|customer id/i);
      expect(copy.description).not.toMatch(/sort code|account number/i);
    }
    expect(directDebitStatusCopy("AUTHORISATION_PENDING").description).toContain("being completed");
    expect(directDebitStatusCopy("UNKNOWN").action).not.toContain("bank details");
  });
});
