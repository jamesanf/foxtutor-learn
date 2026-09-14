import { describe, expect, it } from "vitest";
import { countBillingHistory, listBillingHistory, listOpenBillingAlerts, listUpcomingBillingRows, type BillingHistoryItem } from "../../src/db/billing";

function mockBillingDb(
  rowsForQuery: (sql: string) => BillingHistoryItem[]
): D1Database & { queries: string[] } {
  const queries: string[] = [];
  const db = {
    prepare(sql: string) {
      queries.push(sql);
      return {
        bind() {
          return {
            all: async <T>() => ({ results: rowsForQuery(sql) as T[] }),
            first: async <T>() => ({ count: rowsForQuery(sql).length } as T)
          };
        }
      };
    },
    queries
  } as unknown as D1Database & { queries: string[] };
  return db;
}

const item = (id: string, occurredAt: string, kind: BillingHistoryItem["kind"]): BillingHistoryItem => ({
  id,
  kind,
  occurred_at: occurredAt,
  student_id: "student-1",
  student_name: "Student",
  lesson_id: null,
  billing_event_id: null,
  invoice_id: null,
  credit_id: null,
  amount_minor: null,
  status: "RECORDED",
  description: kind,
  provider_reference: null
});

describe("student billing history query", () => {
  it("avoids the production D1 compound-select failure when billing is empty", async () => {
    const db = mockBillingDb((sql) => {
      if (sql.includes("UNION ALL")) {
        throw new Error("SQLITE_ERROR: too many terms in compound SELECT");
      }
      return [];
    });

    await expect(listBillingHistory(db, "student-1")).resolves.toEqual([]);
    expect(db.queries).toHaveLength(6);
    expect(db.queries.every((sql) => !sql.includes("UNION ALL"))).toBe(true);
  });

  it("merges independent billing sources in the same deterministic order and limit", async () => {
    const rows = [
      item("event-1", "2026-09-10T10:00:00.000Z", "LESSON_CHARGE"),
      item("cancel-1", "2026-09-12T10:00:00.000Z", "CANCELLATION"),
      item("credit-1", "2026-09-11T10:00:00.000Z", "CREDIT"),
      item("ledger-1", "2026-09-13T10:00:00.000Z", "CREDIT_CONSUMED"),
      item("invoice-1", "2026-09-12T11:00:00.000Z", "INVOICE"),
      item("payment-1", "2026-09-13T10:00:00.000Z", "PAYMENT")
    ];
    const db = mockBillingDb((sql) => {
      const source = sql.includes("e.gross_amount_minor")
        ? "event-1"
        : sql.includes("lesson_history")
          ? "cancel-1"
          : sql.includes("credit_ledger_transactions")
              ? "ledger-1"
              : sql.includes("billing_payments p")
                  ? "payment-1"
                  : sql.includes("billing_invoices i")
                    ? "invoice-1"
                    : "credit-1";
      return rows.filter((row) => row.id === source);
    });

    await expect(listBillingHistory(db, "student-1", 4)).resolves.toEqual([
      rows[5],
      rows[3],
      rows[4],
      rows[1]
    ]);
  });

  it("does not surface invoices from a different provider environment", async () => {
    const db = mockBillingDb(() => []);

    await expect(listBillingHistory(db, "student-1", 100, "production")).resolves.toEqual([]);
    expect(db.queries.filter((sql) => sql.includes("provider_environment")).length).toBe(3);
  });

  it("counts every billing-history source with provider isolation", async () => {
    const db = mockBillingDb((sql) => {
      if (sql.includes("billing_events")) return [item("event-1", "2026-09-10T10:00:00.000Z", "LESSON_CHARGE"), item("event-2", "2026-09-11T10:00:00.000Z", "LESSON_CHARGE")];
      if (sql.includes("lesson_history")) return [item("cancel-1", "2026-09-12T10:00:00.000Z", "CANCELLATION")];
      return [];
    });

    await expect(countBillingHistory(db, "student-1", "production")).resolves.toBe(3);
    expect(db.queries).toHaveLength(6);
    expect(db.queries.filter((sql) => sql.includes("provider_environment")).length).toBe(2);
  });

  it("applies provider-environment isolation to the admin upcoming billing query", async () => {
    const db = mockBillingDb(() => []);

    await expect(listUpcomingBillingRows(db, "2026-09-14", "2026-09-21", undefined, "production")).resolves.toEqual([]);
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]).toContain("(i.provider_environment = ? OR i.provider_environment IS NULL)");
  });

  it("applies provider-environment isolation to open admin billing alerts", async () => {
    const db = mockBillingDb(() => []);

    await expect(listOpenBillingAlerts(db, 100, "production")).resolves.toEqual([]);
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]).toContain("i.provider_environment = ?");
  });
});
