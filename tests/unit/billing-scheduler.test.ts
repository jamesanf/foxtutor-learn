import { describe, expect, it } from "vitest";
import { listPendingBillingEvents } from "../../src/db/billing";

describe("billing issuance scheduler", () => {
  it("does not select a lesson invoice before its seven-day collection date", async () => {
    let query = "";
    let bindings: unknown[] = [];
    const db = {
      prepare(sql: string) {
        query = sql;
        return {
          bind(...values: unknown[]) {
            bindings = values;
            return {
              async all() {
                return { results: [] };
              }
            };
          }
        };
      }
    } as unknown as D1Database;

    await expect(listPendingBillingEvents(db, "2026-09-15T17:00:00.000Z", 50)).resolves.toEqual([]);
    expect(query).toContain("collection_date IS NULL OR collection_date <= ?");
    expect(bindings).toEqual(["2026-09-15", 50]);
  });
});
