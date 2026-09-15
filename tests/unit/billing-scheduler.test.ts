import { describe, expect, it } from "vitest";
import { listPendingBillingEvents } from "../../src/db/billing";

describe("billing issuance scheduler", () => {
  it("does not select a lesson invoice before the 22:00 London issuance cutoff", async () => {
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

    await expect(listPendingBillingEvents(db, "2026-09-15T20:59:00.000Z", 50)).resolves.toEqual([]);
    expect(query).toContain("collection_date < ?");
    expect(query).toContain("collection_date = ? AND ? >= '22:00'");
    expect(bindings).toEqual(["2026-09-15", "2026-09-15", "21:59", 50]);
  });
});
