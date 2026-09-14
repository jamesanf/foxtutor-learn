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

  it("adds the optional parent or carer name", () => {
    const migration = readFileSync("migrations/0015_parent_name.sql", "utf8");
    expect(migration).toContain("ALTER TABLE students ADD COLUMN parent_name TEXT NOT NULL DEFAULT ''");
  });

  it("adds a separate idempotent accounting outbox with deletion-safe retention", () => {
    const migration = readFileSync("migrations/0016_accounting_outbox.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_outbox");
    expect(migration).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(migration).toContain("UNIQUE(event_type, business_event_id)");
    expect(migration).toContain("external_reference TEXT UNIQUE");
    expect(migration).toContain("CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRYABLE', 'FAILED', 'UNKNOWN', 'NOT_REQUIRED'))");
    expect(migration).toContain("lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL");
    expect(migration).toContain("student_id TEXT REFERENCES students(id) ON DELETE SET NULL");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS external_accounting_links");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_connections");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_oauth_states");
  });

  it("adds auditable retry records and verified contact mapping metadata", () => {
    const migration = readFileSync("migrations/0017_accounting_operations.sql", "utf8");
    expect(migration).toContain("ALTER TABLE external_accounting_links ADD COLUMN status");
    expect(migration).toContain("'VERIFIED'");
    expect(migration).toContain("verified_company_subdomain");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_retry_audit");
    expect(migration).toContain("actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
    expect(migration).toContain("outbox_id TEXT REFERENCES accounting_outbox(id) ON DELETE SET NULL");
    expect(migration).toContain("request_result IN ('ACCEPTED', 'REJECTED')");
  });

  it("preserves an explicitly unresolved accounting action type", () => {
    const migration = readFileSync("migrations/0018_accounting_unresolved_action.sql", "utf8");
    expect(migration).toContain("'UNRESOLVED'");
    expect(migration).toContain("INSERT INTO accounting_outbox_phase6_unresolved");
    expect(migration).toContain("ALTER TABLE accounting_outbox_phase6_unresolved RENAME TO accounting_outbox");
  });

  it("adds admin-managed billing settings with an immutable GBP currency", () => {
    const migration = readFileSync("migrations/0019_accounting_billing_settings.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_billing_settings");
    expect(migration).toContain("payment_terms_days INTEGER NOT NULL CHECK (payment_terms_days BETWEEN 0 AND 365)");
    expect(migration).toContain("currency TEXT NOT NULL CHECK (currency = 'GBP')");
    expect(migration).toContain("updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
  });

  it("stores the verified FreeAgent company name", () => {
    const migration = readFileSync("migrations/0020_accounting_company_name.sql", "utf8");
    expect(migration).toContain("ALTER TABLE accounting_connections ADD COLUMN company_name TEXT");
  });

  it("adds an auditable first-class credit ledger and lesson billing links", () => {
    const migration = readFileSync("migrations/0021_billing_ledger.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_events");
    expect(migration).toContain("lesson_date TEXT");
    expect(migration).toContain("collection_date TEXT");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS customer_credits");
    expect(migration).toContain("source_cancellation_id TEXT");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS credit_ledger_transactions");
    expect(migration).toContain("credit_ledger_reject_overconsumption");
    expect(migration).toContain("amount_refunded_minor");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_invoice_credit_applications");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_refunds");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_provider_operations");
    expect(migration).toContain("customer_credit_balances");
  });

  it("adds the Phase 7 recurring-series and payment-readiness boundary", () => {
    const migration = readFileSync("migrations/0022_phase7_recurrence_readiness.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS recurring_lesson_series");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS recurring_lesson_pauses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS recurring_series_history");
    expect(migration).toContain("ALTER TABLE lessons ADD COLUMN recurring_series_id");
    expect(migration).toContain("idx_lessons_series_occurrence");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_payments");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_invoice_operations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_alerts");
    expect(migration).toContain("RECONCILIATION_REQUIRED");
  });

  it("keeps credit balance views and statuses correct after allocation reversal", () => {
    const migration = readFileSync("migrations/0023_credit_ledger_reversal_view.sql", "utf8");
    expect(migration).toContain("DROP TRIGGER IF EXISTS credit_ledger_refresh_status");
    expect(migration).toContain("transaction_type = 'REVERSAL'");
    expect(migration).toContain("DROP VIEW IF EXISTS customer_credit_balances");
  });

  it("adds customer-level Direct Debit provisioning, audit, emergency and sentinel state", () => {
    const migration = readFileSync("migrations/0025_phase76_direct_debit_provisioning.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_accounts");
    expect(migration).toContain("CHECK (payment_method = 'DIRECT_DEBIT')");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_provisioning_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_emergency_payg_overrides");
    expect(migration).toContain("reason TEXT NOT NULL");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_sentinel_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS billing_sentinel_alerts");
  });

  it("extends the notification outbox without exposing a second delivery path", () => {
    const migration = readFileSync("migrations/0026_phase76_billing_notifications.sql", "utf8");
    expect(migration).toContain("'BILLING_DIRECT_DEBIT_SETUP'");
    expect(migration).toContain("'BILLING_DIRECT_DEBIT_REMINDER'");
    expect(migration).toContain("ALTER TABLE notifications RENAME TO notifications_phase76");
    expect(migration).toContain("ALTER TABLE notification_settings RENAME TO notification_settings_phase76");
  });

  it("isolates FreeAgent connections, mappings and provider records by environment", () => {
    const migration = readFileSync("migrations/0028_phase79_environment_isolation.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS accounting_connections_by_environment");
    expect(migration).toContain("CHECK (environment IN ('sandbox', 'production'))");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS external_accounting_links_by_environment");
    expect(migration).toContain("UNIQUE(provider, local_entity_type, local_entity_id, environment)");
    expect(migration).toContain("ALTER TABLE billing_accounts ADD COLUMN provider_environment");
    expect(migration).toContain("ALTER TABLE billing_invoices ADD COLUMN provider_environment");
    expect(migration).toContain("ALTER TABLE billing_payments ADD COLUMN provider_environment");
  });
});
