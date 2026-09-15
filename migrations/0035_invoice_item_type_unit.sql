-- A FoxTutor lesson is one 55-minute unit, not one hour.
UPDATE accounting_billing_settings
SET item_type = 'Unit'
WHERE item_type = 'Hours';

UPDATE accounting_billing_settings_by_environment
SET item_type = 'Unit'
WHERE item_type = 'Hours';
