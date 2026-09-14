-- Phase 7.9: retain FreeAgent credentials, mappings and provider records per
-- environment so switching the configured environment cannot cross identities.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounting_connections_by_environment (
  id TEXT NOT NULL CHECK (id = 'FREEAGENT'),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  company_name TEXT,
  company_subdomain TEXT,
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('NOT_CONFIGURED', 'CONNECTED', 'ATTENTION', 'UNAVAILABLE')),
  last_success_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (id, environment)
);

INSERT OR IGNORE INTO accounting_connections_by_environment
  (id, environment, company_name, company_subdomain, access_token_ciphertext,
   refresh_token_ciphertext, access_token_expires_at, refresh_token_expires_at,
   status, last_success_at, last_error_code, last_error_message, updated_at)
SELECT id, environment, company_name, company_subdomain, access_token_ciphertext,
       refresh_token_ciphertext, access_token_expires_at, refresh_token_expires_at,
       status, last_success_at, last_error_code, last_error_message, updated_at
FROM accounting_connections;

CREATE TABLE IF NOT EXISTS external_accounting_links_by_environment (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'FREEAGENT'),
  local_entity_type TEXT NOT NULL CHECK (local_entity_type = 'STUDENT'),
  local_entity_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  external_resource_type TEXT NOT NULL CHECK (external_resource_type = 'CONTACT'),
  external_reference TEXT NOT NULL,
  external_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('UNVERIFIED', 'VERIFIED', 'INVALID')),
  verified_at TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  company_subdomain TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, local_entity_type, local_entity_id, environment),
  UNIQUE(provider, environment, external_reference)
);

INSERT OR IGNORE INTO external_accounting_links_by_environment
  (id, provider, local_entity_type, local_entity_id, external_resource_type,
   external_reference, external_url, status, verified_at, environment,
   company_subdomain, last_error_code, last_error_message, created_at, updated_at)
SELECT id, provider, local_entity_type, local_entity_id, external_resource_type,
       external_reference, external_url, status, verified_at, verified_environment,
       verified_company_subdomain, last_error_code, last_error_message, created_at, updated_at
FROM external_accounting_links
WHERE verified_environment IS NOT NULL;

ALTER TABLE billing_accounts ADD COLUMN provider_environment TEXT
  CHECK (provider_environment IS NULL OR provider_environment IN ('sandbox', 'production'));
UPDATE billing_accounts
SET provider_environment = (
  SELECT verified_environment
  FROM external_accounting_links
  WHERE external_accounting_links.local_entity_id = billing_accounts.student_id
    AND external_accounting_links.status = 'VERIFIED'
  LIMIT 1
)
WHERE provider_environment IS NULL;

ALTER TABLE billing_invoices ADD COLUMN provider_environment TEXT
  CHECK (provider_environment IS NULL OR provider_environment IN ('sandbox', 'production'));

ALTER TABLE billing_payments ADD COLUMN provider_environment TEXT
  CHECK (provider_environment IS NULL OR provider_environment IN ('sandbox', 'production'));
