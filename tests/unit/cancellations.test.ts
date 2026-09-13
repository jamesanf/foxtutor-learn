import { describe, expect, it } from "vitest";
import {
  billingConsequenceForExceptionApproval,
  canStudentCancel,
  cancellationEligibility,
  isSafeReason
} from "../../src/domain/cancellations";

const lesson = (startAt: string, status = "scheduled") => ({ start_at: startAt, status });
const now = "2026-09-13T12:00:00.000Z";

describe("cancellation policy", () => {
  it("allows only more than 24 hours before the stored UTC start", () => {
    expect(canStudentCancel(lesson("2026-09-15T12:00:01.000Z"), now)).toBe(true);
    expect(canStudentCancel(lesson("2026-09-14T13:00:00.000Z"), now)).toBe(true);
    expect(canStudentCancel(lesson("2026-09-14T12:00:00.000Z"), now)).toBe(false);
    expect(canStudentCancel(lesson("2026-09-14T11:59:59.000Z"), now)).toBe(false);
  });

  it("blocks started, completed and cancelled lessons", () => {
    expect(cancellationEligibility(lesson("2026-09-13T11:59:59.000Z"), now).reason).toBe("ALREADY_STARTED");
    expect(cancellationEligibility(lesson("2026-09-15T12:00:01.000Z", "completed"), now).reason).toBe("NOT_SCHEDULED");
    expect(cancellationEligibility(lesson("2026-09-15T12:00:01.000Z", "cancelled"), now).reason).toBe("NOT_SCHEDULED");
  });

  it("keeps billing policy explicit and bounds exception reasons", () => {
    expect(billingConsequenceForExceptionApproval()).toBe("EXCEPTION_WAIVED");
    expect(isSafeReason("Family emergency")).toBe(true);
    expect(isSafeReason("")).toBe(false);
    expect(isSafeReason("bad\u0000reason")).toBe(false);
    expect(isSafeReason("x".repeat(1001))).toBe(false);
  });
});
