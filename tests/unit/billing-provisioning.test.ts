import { describe, expect, it } from "vitest";
import { reconcileVerifiedContact, shouldSendDirectDebitSetupNotification } from "../../src/accounting/provisioning";
import type { FreeAgentContact } from "../../src/accounting/freeagent/client";

const now = "2026-09-14T12:00:00.000Z";

function account(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "billing-account:student-1",
    student_id: "student-1",
    payment_method: "DIRECT_DEBIT",
    mandate_state: "UNKNOWN",
    provisioning_state: "UNKNOWN",
    provider_environment: null,
    provider_contact_reference: null,
    provider_contact_url: null,
    verified_at: null,
    last_reconciled_at: "2026-09-14T11:00:00.000Z",
    last_notification_at: null,
    notification_count: 0,
    next_reconcile_at: "2026-09-15T12:00:00.000Z",
    claim_expires_at: null,
    last_error_code: "FREEAGENT_TIMEOUT",
    last_error_message: "FreeAgent request timed out.",
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function harness(initialAccount = account(), linkOverrides: Record<string, unknown> = {}) {
  let storedAccount: Record<string, unknown> = initialAccount;
  const link = {
    id: "link-production",
    provider: "FREEAGENT",
    local_entity_type: "STUDENT",
    local_entity_id: "student-1",
    external_resource_type: "CONTACT",
    external_reference: "21801761",
    external_url: "https://api.freeagent.com/v2/contacts/21801761",
    status: "VERIFIED",
    verified_at: now,
    verified_environment: "production",
    verified_company_subdomain: "foxlearningltdgmailcom",
    last_error_code: null,
    last_error_message: null,
    created_at: now,
    updated_at: now,
    ...linkOverrides
  };
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (sql.includes("FROM billing_accounts")) return storedAccount;
              if (sql.includes("FROM external_accounting_links_by_environment")) {
                return link;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO billing_accounts")) return { meta: { changes: 0 } };
              if (sql.includes("UPDATE billing_accounts")) {
                storedAccount = {
                  ...storedAccount,
                  mandate_state: values[0],
                  provisioning_state: values[1],
                  provider_environment: values[2] ?? storedAccount.provider_environment,
                  provider_contact_reference: values[3] ?? storedAccount.provider_contact_reference,
                  provider_contact_url: values[4] ?? storedAccount.provider_contact_url,
                  verified_at: values[5] ?? storedAccount.verified_at,
                  last_reconciled_at: values[6] ?? storedAccount.last_reconciled_at,
                  next_reconcile_at: values[7],
                  last_error_code: values[8],
                  last_error_message: values[9],
                  claim_expires_at: values[10],
                  updated_at: values[11]
                };
              }
              return { meta: { changes: 1 } };
            }
          };
        }
      };
    }
  } as unknown as D1Database;
  return {
    db,
    readAccount: () => storedAccount
  };
}

const activeContact: FreeAgentContact = {
  url: "https://api.freeagent.com/v2/contacts/21801761",
  email: "jamesanf@gmail.com",
  directDebitMandateState: "active"
};

describe("billing mandate reconciliation", () => {
  it("sends initial setup guidance when a new account has no provider mandate field", () => {
    expect(shouldSendDirectDebitSetupNotification({
      mandate_state: "NOT_CONFIGURED",
      last_error_code: "MANDATE_STATE_MISSING"
    }, "UNKNOWN")).toBe(true);
    expect(shouldSendDirectDebitSetupNotification({
      mandate_state: "UNKNOWN",
      last_error_code: "TIMEOUT"
    }, "UNKNOWN")).toBe(false);
  });

  it("updates a verified Production contact to an ACTIVE billing account immediately", async () => {
    const state = harness(account({ provider_environment: "sandbox" }));
    await expect(reconcileVerifiedContact(state.db, { FREEAGENT_ENVIRONMENT: "production" }, "student-1", activeContact, now))
      .resolves.toBe("ACTIVE");
    expect(state.readAccount()).toMatchObject({
      mandate_state: "ACTIVE",
      provisioning_state: "ACTIVE",
      provider_environment: "production",
      provider_contact_reference: "21801761",
      last_reconciled_at: now,
      last_error_code: null,
      last_error_message: null
    });
  });

  it("does not activate a verified mapping when FreeAgent returns a different contact", async () => {
    const state = harness();
    await expect(reconcileVerifiedContact(state.db, { FREEAGENT_ENVIRONMENT: "production" }, "student-1", {
      ...activeContact,
      url: "https://api.freeagent.com/v2/contacts/99999999"
    }, now)).rejects.toMatchObject({ shape: { code: "CONFLICT" } });
    expect(state.readAccount().mandate_state).toBe("UNKNOWN");
  });

  it("fails closed when the mapping belongs to the other FreeAgent environment", async () => {
    const state = harness(account(), {
      external_reference: "257175",
      external_url: "https://api.sandbox.freeagent.com/v2/contacts/257175",
      verified_environment: "sandbox"
    });
    await expect(reconcileVerifiedContact(state.db, { FREEAGENT_ENVIRONMENT: "production" }, "student-1", activeContact, now))
      .rejects.toMatchObject({ shape: { code: "CONFLICT" } });
    expect(state.readAccount().mandate_state).toBe("UNKNOWN");
  });
});
