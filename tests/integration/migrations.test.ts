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

  it("adds hash-backed, revocable calendar feed records", () => {
    const migration = readFileSync("migrations/0003_calendar_feeds.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS calendar_feeds");
    expect(migration).toContain("token_hash TEXT NOT NULL UNIQUE");
    expect(migration).toContain("revoked_at TEXT");
    expect(migration).toContain("idx_calendar_feeds_active_owner");
  });

  it("adds private resource metadata with ownership, status and retention constraints", () => {
    const migration = readFileSync("migrations/0004_resources.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS resources");
    expect(migration).toContain("storage_key TEXT NOT NULL UNIQUE");
    expect(migration).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(migration).toContain("retention_until TEXT NOT NULL");
    expect(migration).toContain("CHECK (student_id IS NOT NULL OR lesson_id IS NOT NULL)");
    expect(migration).toContain("idx_resources_lesson_created");
  });

  it("adds lesson reports and one durable notification outbox", () => {
    const reports = readFileSync("migrations/0006_lesson_reports.sql", "utf8");
    const notifications = readFileSync("migrations/0007_notifications.sql", "utf8");
    expect(reports).toContain("CREATE TABLE IF NOT EXISTS lesson_reports");
    expect(reports).toContain("CHECK (status IN ('DRAFT', 'SENT'))");
    expect(notifications).toContain("CREATE TABLE IF NOT EXISTS notifications");
    expect(notifications).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(notifications).toContain("CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'UNKNOWN', 'FAILED'))");
    expect(notifications).toContain("provider_reference TEXT");
    expect(notifications).toContain("idx_notifications_status_attempt");
  });
});
