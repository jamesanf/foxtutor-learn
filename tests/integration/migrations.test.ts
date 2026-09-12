import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("D1 foundation", () => {
  it("contains the foundational users and sessions schema", () => {
    const migration = readFileSync("migrations/0001_foundation.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS sessions");
    expect(migration).toContain("CHECK (role IN ('ADMIN', 'STUDENT'))");
  });

  it("adds forward-only student and lesson tables with ownership constraints", () => {
    const migration = readFileSync("migrations/0002_students_lessons.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS students");
    expect(migration).toContain("learn_user_id TEXT UNIQUE REFERENCES users(id)");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS lessons");
    expect(migration).toContain("student_id TEXT NOT NULL REFERENCES students(id)");
    expect(migration).toContain("CHECK (status IN ('scheduled', 'completed', 'cancelled'))");
    expect(migration).toContain("idx_lessons_student_start");
  });
});
