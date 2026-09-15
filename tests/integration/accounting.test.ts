import { describe, expect, it } from "vitest";
import { cancelLesson, rescheduleLesson } from "../../src/db/cancellations";
import { createAuthorisedCreditRefund, recordCompletedCreditRefund } from "../../src/db/billing";

interface MockStatement {
  sql: string;
  values: unknown[];
}

function mockBatchDb(invoice?: {
  id: string;
  status: string;
  freeagent_url: string | null;
  provider_status?: string | null;
  net_amount_minor?: number;
  credit_applied_minor?: number;
  collection_started: number;
  credit_eligible?: number;
  collection_unknown?: number;
}) {
  const statements: MockStatement[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            sql,
            values,
            async first<T>() {
              if (invoice && sql.includes("SELECT i.id")) return invoice as T;
              return null;
            },
            async all<T>() {
              if (sql.includes("billing_invoice_credit_applications")) {
                return {
                  results: [{
                    credit_id: "credit-source-1",
                    ledger_transaction_id: "ledger-application-1",
                    account_id: "credit-account-1",
                    amount_minor: 5500
                  }]
                } as { results: T[] };
              }
              return { results: [] } as { results: T[] };
            }
          };
        }
      };
    },
    async batch(batchStatements: MockStatement[]) {
      statements.push(...batchStatements);
      return statements.map((_, index) => ({ meta: { changes: index === 0 ? 1 : 1 } }));
    }
  } as unknown as D1Database;
  return { db, statements };
}

describe("Phase 5 accounting boundary", () => {
  it("binds the refund ledger timestamp before completing a manual credit refund", async () => {
    const statements: MockStatement[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            statements.push({ sql, values });
            return {
              async first<T>() {
                return { id: "refund-1" } as T;
              }
            };
          }
        };
      },
      async batch(batchStatements: MockStatement[]) {
        return batchStatements.map(() => ({ meta: { changes: 1 } }));
      }
    } as unknown as D1Database;

    const completed = await recordCompletedCreditRefund(db, {
      refundId: "refund-1",
      creditId: "credit-1",
      studentId: "student-1",
      amountMinor: 5500n,
      providerReference: "bank-ref-1",
      now: "2026-09-15T20:00:00.000Z"
    });

    expect(completed).toBe(true);
    expect(statements[0]?.values).toHaveLength(10);
    expect(statements[0]?.values).toContain("2026-09-15T20:00:00.000Z");
    expect(statements[1]?.values).toEqual(["bank-ref-1", "2026-09-15T20:00:00.000Z", "refund-1"]);
  });

  it("reserves outstanding refund authorizations before allowing another refund", async () => {
    const statements: MockStatement[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            statements.push({ sql, values });
            return {
              async run() {
                return { meta: { changes: 0 } };
              },
              async first<T>() {
                return null as T | null;
              }
            };
          }
        };
      }
    } as unknown as D1Database;

    await createAuthorisedCreditRefund(db, {
      refundId: "refund-2",
      creditId: "credit-1",
      studentId: "student-1",
      amountMinor: 5500n,
      authorisedByUserId: "admin-1",
      now: "2026-09-15T20:00:00.000Z"
    });

    expect(statements[0]?.sql).toContain("pending.status IN ('AUTHORISED', 'PROCESSING')");
  });

  it("writes cancellation history and its accounting outbox in one D1 batch", async () => {
    const { db, statements } = mockBatchDb();
    const changed = await cancelLesson(db, {
      lessonId: "lesson-1",
      studentId: "student-1",
      actorUserId: "student-user-1",
      actorRole: "STUDENT",
      eventType: "STUDENT_CANCELLED",
      billingConsequence: "NO_CHARGE",
      reason: "Travel",
      now: "2026-09-13T12:00:00.000Z",
      previousStartAt: "2026-09-15T12:00:00.000Z",
      previousEndAt: "2026-09-15T12:55:00.000Z",
      previousTimezone: "Europe/London"
    });
    expect(changed).toBe(true);
    expect(statements).toHaveLength(3);
    expect(statements[1]?.sql).toContain("INSERT INTO lesson_history");
    expect(statements[2]?.sql).toContain("INSERT INTO accounting_outbox");
    expect(statements[2]?.sql).toContain("ON CONFLICT(idempotency_key) DO NOTHING");
    expect(statements[2]?.sql).toContain("WHERE EXISTS (SELECT 1 FROM lesson_history WHERE id = ?)");
  });

  it("records reschedule decisions in the separate accounting outbox without an external action", async () => {
    const { db, statements } = mockBatchDb();
    await rescheduleLesson(db, {
      lessonId: "lesson-1",
      studentId: "student-1",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      startAt: "2026-09-16T12:00:00.000Z",
      endAt: "2026-09-16T12:55:00.000Z",
      timezone: "Europe/London",
      reason: "Administrative reschedule",
      previousStartAt: "2026-09-15T12:00:00.000Z",
      previousEndAt: "2026-09-15T12:55:00.000Z",
      previousTimezone: "Europe/London",
      now: "2026-09-13T12:00:00.000Z"
    });
    expect(statements).toHaveLength(4);
    expect(statements[3]?.sql).toContain("INSERT INTO accounting_outbox");
    expect(statements[3]?.values).toContain("RESCHEDULED");
    expect(statements[3]?.values).toContain("NOT_REQUIRED");
  });

  it("queues provider invoice cancellation when an invoice is sent but collection has not started", async () => {
    const { db, statements } = mockBatchDb({
      id: "invoice-1",
      status: "SENT",
      freeagent_url: "https://api.freeagent.com/v2/invoices/42",
      collection_started: 0
    });
    await cancelLesson(db, {
      lessonId: "lesson-1",
      studentId: "student-1",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      eventType: "ADMIN_CANCELLED",
      billingConsequence: "ADMIN_CANCELLED",
      creditAmountMinor: 5500n,
      now: "2026-09-13T12:00:00.000Z",
      previousStartAt: "2026-09-15T12:00:00.000Z",
      previousEndAt: "2026-09-15T12:55:00.000Z",
      previousTimezone: "Europe/London"
    });
    expect(statements.some((statement) => statement.sql.includes("'CANCEL_INVOICE'"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("'cancel-invoice:' || i.id"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("'GRANT'"))).toBe(false);
  });

  it("creates cancellation credit only after collection has started", async () => {
    const { db, statements } = mockBatchDb({
      id: "invoice-1",
      status: "PAYMENT_PENDING",
      freeagent_url: "https://api.freeagent.com/v2/invoices/42",
      collection_started: 1,
      credit_eligible: 1,
      collection_unknown: 0
    });
    await cancelLesson(db, {
      lessonId: "lesson-1",
      studentId: "student-1",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      eventType: "ADMIN_CANCELLED",
      billingConsequence: "ADMIN_CANCELLED",
      creditAmountMinor: 5500n,
      now: "2026-09-13T12:00:00.000Z",
      previousStartAt: "2026-09-15T12:00:00.000Z",
      previousEndAt: "2026-09-15T12:55:00.000Z",
      previousTimezone: "Europe/London"
    });
    expect(statements.some((statement) => statement.sql.includes("'GRANT'"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("'CANCEL_INVOICE'"))).toBe(false);
  });

  it("restores a FoxMail credit settlement exactly once without a provider cancellation", async () => {
    const { db, statements } = mockBatchDb({
      id: "invoice-mail-1",
      status: "PAID",
      provider_status: "CREDIT_COVERED_EMAIL",
      net_amount_minor: 0,
      credit_applied_minor: 5500,
      freeagent_url: null,
      collection_started: 0,
      credit_eligible: 1,
      collection_unknown: 0
    });
    await cancelLesson(db, {
      lessonId: "lesson-mail-1",
      studentId: "student-1",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      eventType: "ADMIN_CANCELLED",
      billingConsequence: "ADMIN_CANCELLED",
      creditAmountMinor: 5500n,
      now: "2026-09-13T12:00:00.000Z",
      previousStartAt: "2026-09-15T12:00:00.000Z",
      previousEndAt: "2026-09-15T12:55:00.000Z",
      previousTimezone: "Europe/London"
    });
    const reversals = statements.filter((statement) => statement.sql.includes("'REVERSAL'"));
    expect(reversals).toHaveLength(1);
    expect(reversals[0]?.values).toContain("credit-reversal:invoice-mail-1");
    expect(statements.some((statement) => statement.sql.includes("'CANCEL_INVOICE'"))).toBe(false);
    expect(statements.some((statement) => statement.sql.includes("'GRANT'"))).toBe(false);
  });
});
