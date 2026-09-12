import { describe, expect, it } from "vitest";
import { findLessonForUser, hasOverlappingLesson } from "../../src/db/lessons";

function mockDb(firstResult: unknown): D1Database {
  let query = "";
  let bindings: unknown[] = [];
  const statement = {
    bind(...values: unknown[]) {
      bindings = values;
      return statement;
    },
    first: async <T>() => firstResult as T
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

describe("server-side lesson ownership", () => {
  it("joins the authenticated Learn user before returning a lesson", async () => {
    const db = mockDb({ id: "lesson-a" });
    const result = await findLessonForUser(db, "lesson-a", "user-a");
    expect(result?.id).toBe("lesson-a");
    expect((db as D1Database & { query: string }).query).toContain("s.learn_user_id = ?");
    expect((db as D1Database & { bindings: unknown[] }).bindings).toEqual(["lesson-a", "user-a"]);
  });

  it("uses deterministic interval overlap predicates and excludes cancelled lessons", async () => {
    const db = mockDb(null);
    await expect(hasOverlappingLesson(db, "student-a", "2026-10-09T14:00:00.000Z", "2026-10-09T15:00:00.000Z")).resolves.toBe(false);
    expect((db as D1Database & { query: string }).query).toContain("status != 'cancelled'");
    expect((db as D1Database & { query: string }).query).toContain("start_at < ?");
    expect((db as D1Database & { query: string }).query).toContain("end_at > ?");
  });
});
