import { describe, expect, it } from "vitest";
import {
  applyAvailableCredits,
  billingDatesForLesson,
  collectionDateSevenDaysBeforeLesson,
  creditApplicationIsRecoverable,
  creditConsumptionIdempotencyKey,
  creditGrantIdempotencyKey,
  creditStatus,
  refundIdempotencyKey
} from "../../src/domain/billing";

const credit = (creditId: string, remainingMinor: bigint, createdAt = "2026-09-01T00:00:00.000Z") => ({
  creditId,
  remainingMinor,
  createdAt
});

describe("customer credit ledger rules", () => {
  it("applies full credit and settles the invoice", () => {
    const result = applyAvailableCredits(5500n, [credit("credit-1", 5500n)]);
    expect(result).toMatchObject({ creditAppliedMinor: 5500n, netAmountMinor: 0n });
    expect(result.allocations).toEqual([{ creditId: "credit-1", amountMinor: 5500n }]);
  });

  it("applies partial credit and retains the remainder", () => {
    const result = applyAvailableCredits(4000n, [credit("credit-1", 5500n)]);
    expect(result).toMatchObject({ creditAppliedMinor: 4000n, netAmountMinor: 0n });
    expect(5500n - result.allocations[0]!.amountMinor).toBe(1500n);
  });

  it("consumes credit across multiple invoices without going negative", () => {
    const available = [credit("credit-1", 11000n)];
    const first = applyAvailableCredits(5500n, available);
    const second = applyAvailableCredits(5500n, [credit("credit-1", 11000n - first.creditAppliedMinor)]);
    expect(first.netAmountMinor).toBe(0n);
    expect(second.netAmountMinor).toBe(0n);
    expect(11000n - first.creditAppliedMinor - second.creditAppliedMinor).toBe(0n);
  });

  it("retains unused credit when credit exceeds the invoice", () => {
    const result = applyAvailableCredits(5500n, [credit("credit-1", 10000n)]);
    expect(result.creditAppliedMinor).toBe(5500n);
    expect(result.netAmountMinor).toBe(0n);
    expect(10000n - result.creditAppliedMinor).toBe(4500n);
  });

  it("uses stable source and invoice keys for replay-safe cancellation and billing", () => {
    expect(creditGrantIdempotencyKey("history-1")).toBe("credit-grant:history-1");
    expect(creditGrantIdempotencyKey("history-1")).toBe(creditGrantIdempotencyKey("history-1"));
    expect(creditConsumptionIdempotencyKey("invoice-1", "credit-1")).toBe("credit-consumption:invoice-1:credit-1");
    expect(creditConsumptionIdempotencyKey("invoice-1", "credit-1")).toBe(creditConsumptionIdempotencyKey("invoice-1", "credit-1"));
  });

  it("keeps invoice replay from creating a second logical application", () => {
    const first = applyAvailableCredits(5500n, [credit("credit-1", 5500n)]);
    const replayKey = creditConsumptionIdempotencyKey("invoice-1", first.allocations[0]!.creditId);
    expect(replayKey).toBe("credit-consumption:invoice-1:credit-1");
    expect(first.allocations).toHaveLength(1);
  });

  it("leaves credit untouched when provider invoice creation fails", () => {
    const result = applyAvailableCredits(5500n, [credit("credit-1", 5500n)]);
    expect(result.creditAppliedMinor).toBe(5500n);
    expect(creditApplicationIsRecoverable("RECORDED")).toBe(true);
    expect(creditApplicationIsRecoverable("PROVIDER_FAILED")).toBe(true);
  });

  it("marks provider application failures as recoverable rather than consumed", () => {
    expect(creditApplicationIsRecoverable("PROVIDER_FAILED")).toBe(true);
    expect(creditApplicationIsRecoverable("RECONCILIATION_REQUIRED")).toBe(true);
    expect(creditApplicationIsRecoverable("PROVIDER_APPLIED")).toBe(false);
  });

  it("authorises a refund through a separate auditable idempotency key", () => {
    expect(refundIdempotencyKey("refund-1")).toBe("credit-refund:refund-1");
    expect(creditStatus(10000n, 0n)).toBe("AVAILABLE");
    expect(creditStatus(10000n, 4000n)).toBe("PARTIALLY_CONSUMED");
    expect(creditStatus(10000n, 10000n)).toBe("CONSUMED");
  });

  it("keeps collection date separate from billing and accounting dates", () => {
    expect(collectionDateSevenDaysBeforeLesson("2026-09-21")).toBe("2026-09-14");
    expect(billingDatesForLesson({
      lessonDate: "2026-09-21",
      billingDate: "2026-09-01",
      dueDate: "2026-09-14"
    })).toEqual({
      lessonDate: "2026-09-21",
      billingDate: "2026-09-01",
      dueDate: "2026-09-14",
      collectionDate: "2026-09-14",
      cancellationDate: null,
      creditNoteDate: null
    });
  });
});
