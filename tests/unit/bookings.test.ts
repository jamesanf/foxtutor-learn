import { describe, expect, it } from "vitest";
import { countUpcomingLessons, listUpcomingLessons } from "../../src/db/lessons";

function mockDb(results: unknown[], count = 0): D1Database {
  let query = "";
  let bindings: unknown[] = [];
  const statement = {
    bind(...values: unknown[]) {
      bindings = values;
      return statement;
    },
    all: async <T>() => ({ results: results as T[] }),
    first: async <T>() => ({ count } as T)
  };
  return {
    prepare(value: string) {
      query = value;
      return statement;
    },
    get query() {
      return query;
    },
    get bindings() {
      return bindings;
    }
  } as unknown as D1Database;
}

describe("upcoming bookings queries", () => {
  it("uses server-side limit/offset ordering over scheduled future lessons", async () => {
    const db = mockDb([{ id: "lesson-a" }]);
    await expect(listUpcomingLessons(db, "2026-09-12T21:00:00.000Z", 12, 24)).resolves.toEqual([{ id: "lesson-a" }]);
    const inspected = db as D1Database & { query: string; bindings: unknown[] };
    expect(inspected.query).toContain("l.status = 'scheduled'");
    expect(inspected.query).toContain("l.start_at >= ?");
    expect(inspected.query).toContain("ORDER BY l.start_at ASC, l.id ASC");
    expect(inspected.query).toContain("LIMIT ? OFFSET ?");
    expect(inspected.bindings).toEqual(["2026-09-12T21:00:00.000Z", 12, 24]);
  });

  it("counts only upcoming scheduled lessons", async () => {
    const db = mockDb([], 49);
    await expect(countUpcomingLessons(db, "2026-09-12T21:00:00.000Z")).resolves.toBe(49);
    const inspected = db as D1Database & { query: string; bindings: unknown[] };
    expect(inspected.query).toContain("COUNT(*)");
    expect(inspected.query).toContain("status = 'scheduled'");
    expect(inspected.bindings).toEqual(["2026-09-12T21:00:00.000Z"]);
  });
});
