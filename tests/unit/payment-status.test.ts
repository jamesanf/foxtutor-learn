import { describe, expect, it } from "vitest";
import { goCardlessPaymentFixture } from "../../src/accounting/freeagent/fixtures";
import { mapFreeAgentPaymentStatus } from "../../src/domain/payment-status";

describe("payment lifecycle mapping", () => {
  it.each([
    ["scheduled", "SCHEDULED"],
    ["submitted", "SUBMITTED"],
    ["pending", "PENDING"],
    ["confirmed", "CONFIRMED"],
    ["failed", "FAILED"]
  ] as const)("maps %s to %s", (providerStatus, expected) => {
    const fixture = goCardlessPaymentFixture(providerStatus);
    expect(mapFreeAgentPaymentStatus(fixture.status)).toBe(expected);
  });

  it("keeps unknown and missing provider states unresolved", () => {
    expect(mapFreeAgentPaymentStatus("future-provider-state")).toBe("UNKNOWN");
    expect(mapFreeAgentPaymentStatus(null)).toBe("UNKNOWN");
  });
});
