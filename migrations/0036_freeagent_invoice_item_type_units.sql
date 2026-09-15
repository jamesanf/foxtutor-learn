-- FreeAgent's API accepts "Units" and renders "Unit" for a quantity of one.
UPDATE accounting_billing_settings
SET item_type = 'Units'
WHERE item_type IN ('Hours', 'Unit');

UPDATE accounting_billing_settings_by_environment
SET item_type = 'Units'
WHERE item_type IN ('Hours', 'Unit');
