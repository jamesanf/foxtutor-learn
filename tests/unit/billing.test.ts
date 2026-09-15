import { describe, expect, it } from "vitest";
import {
  applyAvailableCredits,
  billingDatesForLesson,
  billingReference,
  collectionDateSevenDaysBeforeLesson,
  creditApplicationIsRecoverable,
  creditConsumptionIdempotencyKey,
  creditGrantIdempotencyKey,
  creditStatus,
  datedInvoiceReference,
  isCollectionDateReached,
  isInvoiceIssuanceReached,
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

  it("holds invoice issuance until 22:00 Europe/London on the collection date", () => {
    expect(isInvoiceIssuanceReached("2026-09-15", "2026-09-15T20:59:59.000Z")).toBe(false);
    expect(isInvoiceIssuanceReached("2026-09-15", "2026-09-15T21:00:00.000Z")).toBe(true);
    expect(isInvoiceIssuanceReached("2026-09-15", "2026-09-16T00:00:00.000Z")).toBe(true);
  });

  it("normalises provider references without exposing internal billing prefixes", () => {
    expect(billingReference("INV", "billing:12408985-d91f-4c78-8cc4-96d906053f47"))
      .toBe("FT-INV-12408985-D91F-4C78-8CC4-96D906053F47");
    expect(billingReference("INV", "billing:lesson:ba96d1a1-2ab5-4f7e-ba46-2f881c3311d1:2026-09-24"))
      .toBe("FT-INV-BA96D1A1-2AB5-4F7E-BA46-2F881C3311D1-2026-09-24");
  });

  it("creates short date-sequenced provider invoice references", () => {
    expect(datedInvoiceReference("2026-09-15", 1)).toBe("FT26091501");
    expect(datedInvoiceReference("2026-09-15", 99)).toBe("FT26091599");
  });

  it("keeps a twelve-lesson future fixture invoice-only until each collection date", () => {
    const lessonDates = [
      "2026-09-17", "2026-09-18", "2026-09-24", "2026-09-25",
      "2026-10-01", "2026-10-02", "2026-10-08", "2026-10-09",
      "2026-10-15", "2026-10-16", "2026-10-22", "2026-10-23"
    ];
    const collectionDates = lessonDates.map(collectionDateSevenDaysBeforeLesson);
    expect(new Set(lessonDates)).toHaveLength(12);
    expect(collectionDates.filter((date) => isCollectionDateReached(date, "2026-09-14"))).toHaveLength(2);
    expect(collectionDates.filter((date) => !isCollectionDateReached(date, "2026-09-14"))).toHaveLength(10);
  });
});
