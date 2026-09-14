# REAL_OBSERVED_SANDBOX_FREEAGENT_CONTACT

This is a sanitized response-shape fixture captured from the deployed
FreeAgent Sandbox reconciliation of the existing mapped contact on
2026-09-14. It records field names and presence only; it intentionally omits
contact values, tokens, authorization data, and financial details.

## Request classification

| Field | Observed value |
| --- | --- |
| Environment | `sandbox` |
| HTTP status | `200` |
| FoxTutor contact reference | Existing mapped contact; value omitted here |
| Normalized mandate state | `UNKNOWN` |
| Provider mandate diagnostic | `MANDATE_STATE_MISSING` |

## Observed contact object fields

```text
account_balance
active_projects_count
address1
billing_email
charge_sales_tax
contact_name_on_invoices
country
created_at
email
emails_invoices_automatically
emails_payment_reminders
emails_thank_you_notes
first_name
last_name
locale
postcode
status
town
updated_at
url
uses_contact_invoice_sequence
uses_contact_level_email_settings
```

## Relevant absence

The observed object did **not** contain:

```text
direct_debit_mandate_state
payment_method
payment_url
GoCardless-related fields
```

The response was valid enough to verify the contact URL and identity, but it
did not expose a usable mandate state. FoxTutor therefore correctly retained
`UNKNOWN`, did not mark the mandate active, and did not initiate a payment.
