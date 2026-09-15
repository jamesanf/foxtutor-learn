import { describe, expect, it } from "vitest";
import { cancelLesson, rescheduleLesson } from "../../src/db/cancellations";

interface MockStatement {
  sql: string;
  values: unknown[];
}

function mockBatchDb(invoice?: { id: string; status: string; freeagent_url: string | null; collection_started: number; credit_eligible?: number; collection_unknown?: number }) {
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
});
