import { describe, expect, it } from "vitest";
import { canRecordEmergencyPayg, NORMAL_PAYMENT_METHOD, validateEmergencyPaygReason } from "../../src/domain/billing-policy";

describe("Direct Debit-first billing policy", () => {
  it("uses Direct Debit as the only normal customer payment method", () => {
    expect(NORMAL_PAYMENT_METHOD).toBe("DIRECT_DEBIT");
  });

  it("requires an administrator reason for the emergency exception", () => {
    expect(validateEmergencyPaygReason("last minute lesson")).toBeNull();
    expect(validateEmergencyPaygReason("short")).not.toBeNull();
    expect(canRecordEmergencyPayg({ actorRole: "ADMIN", reason: "last minute lesson", lessonAlreadySecured: false })).toBe(true);
    expect(canRecordEmergencyPayg({ actorRole: "STUDENT", reason: "last minute lesson", lessonAlreadySecured: false })).toBe(false);
    expect(canRecordEmergencyPayg({ actorRole: "ADMIN", reason: "last minute lesson", lessonAlreadySecured: true })).toBe(false);
  });
});
