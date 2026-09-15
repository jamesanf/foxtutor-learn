-- Record which external refund route was used by the administrator.
ALTER TABLE billing_refunds
  ADD COLUMN refund_method TEXT NOT NULL DEFAULT 'METTLE_BANK_TRANSFER';
