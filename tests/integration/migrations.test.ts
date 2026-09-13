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

  it("adds structured report snapshots and the nullable student level forward-only", () => {
    const migration = readFileSync("migrations/0008_structured_lesson_reports.sql", "utf8");
    expect(migration).toContain("ALTER TABLE students ADD COLUMN level TEXT");
    expect(migration).toContain("ALTER TABLE lesson_reports ADD COLUMN pupil_name TEXT");
    expect(migration).toContain("ALTER TABLE lesson_reports ADD COLUMN lesson_timezone TEXT");
    expect(migration).toContain("summary");
    expect(migration).toContain("homework");
    expect(migration).toContain("additional_notes");
    expect(migration).toContain("idx_lesson_reports_student_status");
  });

  it("adds the opt-in international student preference", () => {
    const migration = readFileSync("migrations/0009_international_students.sql", "utf8");
    expect(migration).toContain("ALTER TABLE students ADD COLUMN international INTEGER NOT NULL DEFAULT 0");
    expect(migration).toContain("CHECK (international IN (0, 1))");
  });

  it("adds immutable cancellation requests and lesson history", () => {
    const cancellation = readFileSync("migrations/0010_phase5_cancellations.sql", "utf8");
    expect(cancellation).toContain("CREATE TABLE IF NOT EXISTS lesson_cancellation_requests");
    expect(cancellation).toContain("idx_one_pending_cancellation_request");
    expect(cancellation).toContain("CREATE TABLE IF NOT EXISTS lesson_history");
    expect(cancellation).toContain("CANCELLATION_APPROVED");
    expect(cancellation).toContain("RESCHEDULED");
  });

  it("extends the existing notification outbox rather than adding a second one", () => {
    const migration = readFileSync("migrations/0011_phase5_notification_types.sql", "utf8");
    expect(migration).toContain("ALTER TABLE notifications RENAME TO notifications_phase4");
    expect(migration).toContain("'CANCELLATION_APPROVED'");
    expect(migration).toContain("'CANCELLATION_REJECTED'");
    expect(migration).toContain("'LESSON_RESCHEDULED'");
    expect(migration).toContain("INSERT INTO notifications");
  });

  it("adds student cancellation undo and short-notice reschedule requests", () => {
    const migration = readFileSync("migrations/0012_student_undo_reschedule_requests.sql", "utf8");
    expect(migration).toContain("'CANCELLATION_UNDONE'");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS lesson_reschedule_requests");
    expect(migration).toContain("idx_one_pending_reschedule_request");
    expect(migration).toContain("CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))");
  });

  it("adds persistent notification controls without a second outbox", () => {
    const migration = readFileSync("migrations/0013_notification_controls.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS notification_settings");
    expect(migration).toContain("SUPPRESSED");
    expect(migration).toContain("subject_prefix");
    expect(migration).toContain("body_note");
    expect(migration).toContain("LESSON_REMINDER");
  });

  it("adds the student profile and academic-year fields forward-only", () => {
    const migration = readFileSync("migrations/0014_student_profiles.sql", "utf8");
    expect(migration).toContain("parent_email TEXT NOT NULL DEFAULT ''");
    expect(migration).toContain("billing_address TEXT NOT NULL DEFAULT ''");
    expect(migration).toContain("additional_support_needs TEXT NOT NULL DEFAULT ''");
    expect(migration).toContain("academic_year_system");
    expect(migration).toContain("academic_year_anchor_date");
    expect(migration).toContain("class_texts TEXT NOT NULL DEFAULT ''");
  });
});
