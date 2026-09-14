-- Phase 7.12: keep OAuth transactions and invoice mappings independent per
-- FreeAgent environment. The legacy single-row tables remain for compatibility
-- with older billing records and are no longer used by the dual-environment UI.
PRAGMA foreign_keys = ON;

ALTER TABLE accounting_oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'FREEAGENT'
  CHECK (provider = 'FREEAGENT');
ALTER TABLE accounting_oauth_states ADD COLUMN redirect_intent TEXT NOT NULL DEFAULT 'accounting'
  CHECK (redirect_intent = 'accounting');

CREATE TABLE IF NOT EXISTS accounting_billing_settings_by_environment (
  provider TEXT NOT NULL CHECK (provider = 'FREEAGENT'),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  amount TEXT NOT NULL,
  item_type TEXT NOT NULL,
  category_url TEXT NOT NULL,
  provider_company_subdomain TEXT,
  payment_terms_days INTEGER NOT NULL CHECK (payment_terms_days BETWEEN 0 AND 365),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  sales_tax_rate TEXT NOT NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, environment)
);

INSERT OR IGNORE INTO accounting_billing_settings_by_environment
  (provider, environment, amount, item_type, category_url, provider_company_subdomain,
   payment_terms_days, currency, sales_tax_rate, updated_by_user_id, created_at, updated_at)
SELECT 'FREEAGENT',
       provider_environment,
       amount,
       item_type,
       category_url,
       provider_company_subdomain,
       payment_terms_days,
       currency,
       sales_tax_rate,
       updated_by_user_id,
       created_at,
       updated_at
FROM accounting_billing_settings
WHERE provider_environment IN ('sandbox', 'production');
