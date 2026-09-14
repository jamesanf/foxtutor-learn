import { describe, expect, it } from "vitest";
import { cancelLesson, rescheduleLesson } from "../../src/db/cancellations";

interface MockStatement {
  sql: string;
  values: unknown[];
}

function mockBatchDb() {
  const statements: MockStatement[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return { sql, values };
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
});
