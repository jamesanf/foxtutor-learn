-- Bind the persisted invoice mapping to the FreeAgent trust domain/company
-- that supplied the selected category.
ALTER TABLE accounting_billing_settings ADD COLUMN provider_environment TEXT
  CHECK (provider_environment IS NULL OR provider_environment IN ('sandbox', 'production'));

ALTER TABLE accounting_billing_settings ADD COLUMN provider_company_subdomain TEXT;

UPDATE accounting_billing_settings
SET provider_environment = (
  SELECT environment
  FROM accounting_connections_by_environment
  WHERE id = 'FREEAGENT'
  ORDER BY CASE WHEN environment = 'sandbox' THEN 0 ELSE 1 END
  LIMIT 1
),
provider_company_subdomain = (
  SELECT company_subdomain
  FROM accounting_connections_by_environment
  WHERE id = 'FREEAGENT'
  ORDER BY CASE WHEN environment = 'sandbox' THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE provider_environment IS NULL;
