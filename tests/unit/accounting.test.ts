import { describe, expect, it, vi } from "vitest";
import {
  accountingDecisionForBillingConsequence,
  accountingEventTypeForHistory,
  accountingIdempotencyKey,
  accountingReference,
  canTransitionAccountingStatus,
  formatMinorUnits,
  isAccountingEffectiveDate,
  isSafeAccountingRetry,
  NORMAL_LESSON_CURRENCY,
  NORMAL_LESSON_PRICE_MINOR_UNITS,
  NON_VAT_SALES_TAX_RATE,
  nextAccountingRetryAt,
  parseMinorUnits
} from "../../src/domain/accounting";
import {
  exchangeAuthorizationCode,
  freeAgentAuthorizationUrl,
  freeAgentFetch,
  FreeAgentApiError,
  FreeAgentClient,
  refreshAccessToken
} from "../../src/accounting/freeagent/client";
import { encryptCredential } from "../../src/accounting/credentials";
import {
  connectFreeAgent,
  configuredInvoice,
  invoiceConfigurationIssue,
  processAccountingOutbox,
  reconcileAccountingOutbox,
  validateBillingSettings,
  verifyFreeAgentContactMapping
} from "../../src/accounting/service";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders
  });
}

async function accountingProcessHarness() {
  const encryptionKey = "test-encryption-key";
  const connection = {
    id: "FREEAGENT",
    environment: "sandbox",
    company_subdomain: "foxlearningltdgmailcom",
    company_name: "Fox Learning Ltd",
    access_token_ciphertext: "",
    refresh_token_ciphertext: "unused-refresh-token",
    access_token_expires_at: "2040-09-14T14:00:00.000Z",
    refresh_token_expires_at: null,
    status: "CONNECTED",
    last_success_at: null,
    last_error_code: null,
    last_error_message: null,
    updated_at: "2026-09-14T12:00:00.000Z"
  };
  const billingSettings = {
    id: "FREEAGENT",
    amount: "55.00",
    item_type: "Hours",
    category_url: "https://api.sandbox.freeagent.com/v2/categories/1",
    payment_terms_days: 0,
    currency: "GBP",
    sales_tax_rate: "0",
    updated_by_user_id: null,
    created_at: "2026-09-14T12:00:00.000Z",
    updated_at: "2026-09-14T12:00:00.000Z"
  };
  const link = {
    id: "link-1",
    provider: "FREEAGENT",
    local_entity_type: "STUDENT",
    local_entity_id: "student-1",
    external_resource_type: "CONTACT",
    external_reference: "257175",
    external_url: "https://api.sandbox.freeagent.com/v2/contacts/257175",
    status: "VERIFIED",
    verified_at: "2026-09-14T12:00:00.000Z",
    verified_environment: "sandbox",
    verified_company_subdomain: "foxlearningltdgmailcom",
    last_error_code: null,
    last_error_message: null,
    created_at: "2026-09-14T12:00:00.000Z",
    updated_at: "2026-09-14T12:00:00.000Z"
  };
  const outbox = {
    id: "outbox-1",
    event_type: "CANCELLATION_ACCOUNTING",
    business_event_id: "history-1",
    lesson_id: "lesson-1",
    student_id: "student-1",
    billing_consequence: "STUDENT_CANCELLED",
    action_type: "CREATE_INVOICE",
    status: "PENDING",
    idempotency_key: "accounting:CANCELLATION_ACCOUNTING:history1",
    accounting_reference: "FT-ACC-history1",
    accounting_effective_date: "2026-09-14",
    attempt_count: 0,
    next_attempt_at: null,
    last_attempted_at: null,
    external_reference: null,
    external_url: null,
    external_resource_type: null,
    provider_status: null,
    safe_error_code: null,
    safe_error_message: null,
    created_at: "2026-09-14T12:00:00.000Z",
    updated_at: "2026-09-14T12:00:00.000Z",
    completed_at: null
  };
  const state = { connection, outbox: outbox as Record<string, unknown>, invoicePresent: false };
  state.connection.access_token_ciphertext = await encryptCredential("access-token", encryptionKey);
  const db = {
    prepare(sql: string) {
      const execute = async (values: unknown[] = []) => {
        if (sql.includes("FROM accounting_connections")) return state.connection;
        if (sql.includes("FROM accounting_billing_settings")) return billingSettings;
        if (sql.includes("FROM external_accounting_links")) return link;
        if (sql.includes("FROM accounting_outbox")) return state.outbox;
        return null;
      };
      const run = async (values: unknown[] = []) => {
        if (sql.includes("SET status = 'UNKNOWN'")) return { meta: { changes: 0 } };
        if (sql.includes("SET status = 'PROCESSING'")) {
          state.outbox.status = "PROCESSING";
          state.outbox.attempt_count = Number(state.outbox.attempt_count) + 1;
          state.outbox.last_attempted_at = values[0];
          state.outbox.updated_at = values[1];
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET status = 'SUCCEEDED'")) {
          state.outbox.status = "SUCCEEDED";
          state.outbox.external_reference = values[0];
          state.outbox.external_url = values[1];
          state.outbox.external_resource_type = values[2];
          state.outbox.provider_status = values[3];
          state.outbox.safe_error_code = null;
          state.outbox.safe_error_message = null;
          state.outbox.completed_at = values[4];
          state.outbox.updated_at = values[5];
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET status = ?, safe_error_code = ?")) {
          state.outbox.status = values[0];
          state.outbox.safe_error_code = values[1];
          state.outbox.safe_error_message = values[2];
          state.outbox.provider_status = values[3];
          state.outbox.next_attempt_at = values[4];
          state.outbox.updated_at = values[5];
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET status = ?, last_error_code = ?")) return { meta: { changes: 1 } };
        return { meta: { changes: 1 } };
      };
      return {
        first: async () => execute(),
        all: async () => ({ results: [state.outbox] }),
        run: async () => run(),
        bind(...values: unknown[]) {
          return {
            first: async () => execute(values),
            all: async () => ({ results: [state.outbox] }),
            run: async () => run(values)
          };
        }
      };
    }
  } as unknown as D1Database;
  return {
    db,
    state,
    env: {
      FREEAGENT_ENVIRONMENT: "sandbox",
      FREEAGENT_CLIENT_ID: "client-1",
      FREEAGENT_CLIENT_SECRET: "secret-1",
      FREEAGENT_TOKEN_ENCRYPTION_KEY: encryptionKey,
      FREEAGENT_COMPANY_SUBDOMAIN: "foxlearningltdgmailcom"
    }
  };
}

describe("accounting domain", () => {
  it("maps Phase 5 classifications without inventing no-charge provider actions", () => {
    expect(accountingEventTypeForHistory("STUDENT_CANCELLED")).toBe("CANCELLATION_ACCOUNTING");
    expect(accountingEventTypeForHistory("RESCHEDULED")).toBe("RESCHEDULE_ACCOUNTING");
    expect(accountingEventTypeForHistory("CANCELLATION_REQUESTED")).toBeNull();
    expect(accountingDecisionForBillingConsequence("NO_CHARGE")).toMatchObject({ actionType: "NO_ACTION", status: "NOT_REQUIRED" });
    expect(accountingDecisionForBillingConsequence("EXCEPTION_WAIVED")).toMatchObject({ actionType: "NO_ACTION", status: "NOT_REQUIRED" });
    expect(accountingDecisionForBillingConsequence("ADMIN_CANCELLED")).toMatchObject({
      actionType: "UNRESOLVED",
      status: "FAILED",
      safeErrorCode: "BUSINESS_MAPPING_REQUIRED",
      safeErrorMessage: "Administrative cancellation accounting consequence is unresolved."
    });
  });

  it("generates stable accounting identities and bounded backoff", () => {
    const key = accountingIdempotencyKey("CANCELLATION_ACCOUNTING", "history-1");
    expect(key).toBe("accounting:CANCELLATION_ACCOUNTING:history-1");
    expect(accountingIdempotencyKey("CANCELLATION_ACCOUNTING", "history-1")).toBe(key);
    expect(accountingReference("history-1")).toBe("FT-ACC-history1");
    expect(nextAccountingRetryAt("2026-09-13T20:00:00.000Z", 1)).toBe("2026-09-13T20:05:00.000Z");
    expect(nextAccountingRetryAt("2026-09-13T20:00:00.000Z", 5)).toBeNull();
    expect(isSafeAccountingRetry("RETRYABLE", "NETWORK")).toBe(true);
    expect(isSafeAccountingRetry("UNKNOWN", "TIMEOUT")).toBe(false);
    expect(isSafeAccountingRetry("FAILED", "BUSINESS_MAPPING_REQUIRED")).toBe(false);
    expect(canTransitionAccountingStatus("PROCESSING", "UNKNOWN")).toBe(true);
    expect(canTransitionAccountingStatus("SUCCEEDED", "PENDING")).toBe(false);
    expect(isAccountingEffectiveDate("2026-02-29")).toBe(false);
    expect(isAccountingEffectiveDate("2026-09-13")).toBe(true);
    expect(parseMinorUnits("55.00")).toBe(NORMAL_LESSON_PRICE_MINOR_UNITS);
    expect(formatMinorUnits(NORMAL_LESSON_PRICE_MINOR_UNITS)).toBe("55.00");
    expect(parseMinorUnits("55.001")).toBeNull();
  });
});

describe("invoice configuration", () => {
  const valid = {
    FREEAGENT_ENVIRONMENT: "sandbox",
    FREEAGENT_INVOICE_AMOUNT: "55.00",
    FREEAGENT_INVOICE_ITEM_TYPE: "Hours",
    FREEAGENT_INVOICE_CATEGORY_URL: "https://api.sandbox.freeagent.com/v2/categories/1",
    FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS: "14",
    FREEAGENT_INVOICE_CURRENCY: "GBP",
    FREEAGENT_INVOICE_SALES_TAX_RATE: "0"
  };

  it("enforces the approved 55.00 GBP no-VAT commercial configuration", () => {
    expect(invoiceConfigurationIssue(valid)).toBeNull();
    expect(configuredInvoice(valid)).toMatchObject({
      amount: "55.00",
      amountMinorUnits: 5500n,
      paymentTermsInDays: 14,
      currency: NORMAL_LESSON_CURRENCY,
      salesTaxRate: NON_VAT_SALES_TAX_RATE
    });
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_AMOUNT: "55.01" })).toBeNull();
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CURRENCY: "USD" })).toContain("must be GBP");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: "20" })).toBeNull();
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: "EXEMPT" })).toContain("missing or invalid");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS: "14days" })).toContain("payment terms");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CURRENCY: undefined })).toContain("currency");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: undefined })).toContain("VAT/tax");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CATEGORY_URL: "https://api.freeagent.com/v2/categories/1" })).toContain("environment");
  });

  it("validates editable settings while keeping GBP and explicit tax mandatory", () => {
    expect(validateBillingSettings({
      amount: "72.50",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
      paymentTermsDays: "30",
      currency: "GBP",
      salesTaxRate: "0"
    }, "sandbox")).toEqual({
      value: {
        amount: "72.50",
        itemType: "Hours",
        categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
        paymentTermsDays: 30,
        salesTaxRate: "0"
      },
      error: null
    });
    expect(validateBillingSettings({
      amount: "72.50",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
      paymentTermsDays: "30",
      currency: "USD",
      salesTaxRate: "0"
    }, "sandbox").error).toContain("must be GBP");
    expect(validateBillingSettings({
      amount: "72.50",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
      paymentTermsDays: "30",
      currency: "GBP",
      salesTaxRate: ""
    }, "sandbox").error).toContain("VAT/tax");
  });

  it("requires a category returned by the active provider company when options are supplied", () => {
    const categories = [{
      url: "https://api.sandbox.freeagent.com/v2/categories/2",
      description: "Sales",
      nominalCode: "001",
      group: "INCOME" as const,
      autoSalesTaxRate: null
    }];
    expect(validateBillingSettings({
      amount: "55.00",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/9",
      paymentTermsDays: "0",
      currency: "GBP",
      salesTaxRate: "0"
    }, "sandbox", categories).error).toContain("returned by the connected FreeAgent company");
    expect(validateBillingSettings({
      amount: "55.00",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
      paymentTermsDays: "0",
      currency: "GBP",
      salesTaxRate: "0"
    }, "sandbox", categories).error).toBeNull();
    expect(validateBillingSettings({
      amount: "55.00",
      itemType: "Hours",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/2",
      paymentTermsDays: "0",
      currency: "GBP",
      salesTaxRate: "0"
    }, "sandbox", []).error).toContain("categories are unavailable");
  });
});

describe("FreeAgent adapter", () => {
  it("builds explicit sandbox and production OAuth URLs", () => {
    const sandbox = new URL(freeAgentAuthorizationUrl("sandbox", {
      clientId: "client-1",
      redirectUri: "https://learn.example.test/callback",
      state: "state-1",
      accessLevel: "4"
    }));
    expect(sandbox.origin).toBe("https://api.sandbox.freeagent.com");
    expect(sandbox.pathname).toBe("/v2/approve_app");
    expect(sandbox.searchParams.get("scope")).toBe("4");
    expect(sandbox.searchParams.get("state")).toBe("state-1");

    const production = new URL(freeAgentAuthorizationUrl("production", {
      clientId: "client-1",
      redirectUri: "https://learn.example.test/callback",
      state: "state-1",
      accessLevel: "4"
    }));
    expect(production.origin).toBe("https://api.freeagent.com");
  });

  it("sends authenticated JSON invoice requests and captures the external URL", async () => {
    let requestUrl = "";
    let requestMethod = "";
    let requestAuthorization: string | null = null;
    let requestBody = "";
    const client = new FreeAgentClient({
      environment: "sandbox",
      apiVersion: "2026-01-01",
      fetcher: async (input, init) => {
        requestUrl = String(input);
        requestMethod = init?.method ?? "GET";
        requestAuthorization = new Headers(init?.headers).get("Authorization");
        requestBody = String(init?.body ?? "");
        return jsonResponse({ invoice: { url: "https://api.sandbox.freeagent.com/v2/invoices/42", reference: "FT-ACC-history1" } }, 201, { Location: "https://api.sandbox.freeagent.com/v2/invoices/42" });
      }
    });

    await expect(client.createDraftInvoice("access-token", {
      contactUrl: "https://api.sandbox.freeagent.com/v2/contacts/7",
      reference: "FT-ACC-history1",
      datedOn: "2026-09-13",
      paymentTermsInDays: 14,
      itemType: "https://api.sandbox.freeagent.com/v2/item_types/1",
      description: "Late cancellation",
      price: "55.00",
      salesTaxRate: "0",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/1",
      currency: "GBP"
    })).resolves.toMatchObject({ url: "https://api.sandbox.freeagent.com/v2/invoices/42" });
    expect(requestUrl).toBe("https://api.sandbox.freeagent.com/v2/invoices");
    expect(requestMethod).toBe("POST");
    expect(requestAuthorization).toBe("Bearer access-token");
    expect(JSON.parse(requestBody)).toMatchObject({
      invoice: {
        reference: "FT-ACC-history1",
        contact: "https://api.sandbox.freeagent.com/v2/contacts/7",
        invoice_items: [{ price: "55.00", quantity: "1.0", sales_tax_rate: "0", category: "https://api.sandbox.freeagent.com/v2/categories/1" }],
        currency: "GBP"
      }
    });
    expect(requestBody).not.toContain("sales_tax_status");
  });

  it("normalizes rate limits and rejects provider URLs outside the configured origin", async () => {
    const rateLimited = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ error: "slow down" }, 429, { "Retry-After": "30" })
    });
    await expect(rateLimited.company("token")).rejects.toMatchObject({
      shape: { code: "RATE_LIMIT", retryable: true, retryAfterSeconds: 30 }
    });

    const unsafe = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ invoice: { url: "https://evil.example.test/v2/invoices/1" } }, 201)
    });
    await expect(unsafe.createDraftInvoice("token", {
      contactUrl: "https://api.sandbox.freeagent.com/v2/contacts/7",
      reference: "ref",
      datedOn: "2026-09-13",
      paymentTermsInDays: 0,
      itemType: "item",
      description: "description",
      price: "1.00",
      salesTaxRate: "0",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/1",
      currency: "GBP"
    })).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE", unknown: true } });
    await expect(unsafe.findInvoiceByReference("token", "https://evil.example.test/v2/contacts/7", "ref"))
      .rejects.toMatchObject({ shape: { code: "CONFIGURATION", retryable: false } });
  });

  it("rejects credential-bearing requests with an external request origin", async () => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({})
    });
    await expect(client.requestJson("token", "//evil.example.test/v2/company")).rejects.toMatchObject({
      shape: { code: "CONFIGURATION", retryable: false }
    });
  });

  it("exchanges and refreshes OAuth tokens without exposing raw provider errors", async () => {
    const calls: Array<{ url: string; body: string; authorization: string | null }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push({
        url: String(input),
        body: String(init?.body ?? ""),
        authorization: new Headers(init?.headers).get("Authorization")
      });
      return jsonResponse({
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 3600,
        refresh_token_expires_in: 86_400
      });
    };
    await expect(exchangeAuthorizationCode("sandbox", {
      clientId: "client-1",
      clientSecret: "secret-1",
      code: "code-1",
      redirectUri: "https://learn.example.test/callback"
    }, fetcher)).resolves.toMatchObject({ accessToken: "access-2", refreshToken: "refresh-2" });
    await expect(refreshAccessToken("sandbox", {
      clientId: "client-1",
      clientSecret: "secret-1",
      refreshToken: "refresh-1"
    }, fetcher)).resolves.toMatchObject({ expiresIn: 3600 });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe("https://api.sandbox.freeagent.com/v2/token_endpoint");
    expect(calls[0]?.authorization).toMatch(/^Basic /);
    expect(calls[0]?.body).toContain("grant_type=authorization_code");
    expect(calls[1]?.body).toContain("grant_type=refresh_token");
  });

  it("uses the Production token endpoint for Production authorization", async () => {
    let requestUrl = "";
    await expect(exchangeAuthorizationCode("production", {
      clientId: "production-client",
      clientSecret: "production-secret",
      code: "production-code",
      redirectUri: "https://foxtutor.org/learn/admin/accounting/oauth/callback"
    }, async (input) => {
      requestUrl = String(input);
      return jsonResponse({
        access_token: "production-access",
        refresh_token: "production-refresh",
        expires_in: 3600,
        refresh_token_expires_in: 86_400
      });
    })).resolves.toMatchObject({ accessToken: "production-access" });
    expect(requestUrl).toBe("https://api.freeagent.com/v2/token_endpoint");
  });

  it("uses a safely bound default fetcher through a client instance", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/v2/token_endpoint")) {
        return jsonResponse({
          access_token: "access-default",
          refresh_token: "refresh-default",
          expires_in: 3600,
          refresh_token_expires_in: 86_400
        });
      }
      return jsonResponse({ company: { subdomain: "foxlearningltdgmailcom", currency: "GBP" } });
    });
    try {
      const client = new FreeAgentClient({ environment: "sandbox" });
      await expect(client.company("token")).resolves.toMatchObject({ subdomain: "foxlearningltdgmailcom" });
      await expect(exchangeAuthorizationCode("sandbox", {
        clientId: "client-1",
        clientSecret: "secret-1",
        code: "code-1",
        redirectUri: "https://learn.example.test/callback"
      })).resolves.toMatchObject({ accessToken: "access-default" });
      await expect(refreshAccessToken("sandbox", {
        clientId: "client-1",
        clientSecret: "secret-1",
        refreshToken: "refresh-1"
      })).resolves.toMatchObject({ refreshToken: "refresh-default" });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("uses the bound fetcher through the OAuth callback service chain", async () => {
    const calls: string[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      calls.push(String(input));
      if (String(input).endsWith("/v2/token_endpoint")) {
        return jsonResponse({
          access_token: "access-callback",
          refresh_token: "refresh-callback",
          expires_in: 3600,
          refresh_token_expires_in: 86_400
        });
      }
      return jsonResponse({ company: { subdomain: "foxlearningltdgmailcom", currency: "GBP" } });
    });
    const saved: unknown[] = [];
    const db = {
      prepare(sql: string) {
        const first = async () => {
          if (sql.startsWith("SELECT * FROM accounting_connections")) return null;
          return null;
        };
        return {
          first,
          bind(...values: unknown[]) {
            return {
              first,
              async run() {
                saved.push({ sql, values });
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    } as unknown as D1Database;
    try {
      await expect(connectFreeAgent(db, {
        FREEAGENT_ENVIRONMENT: "sandbox",
        FREEAGENT_CLIENT_ID: "client-1",
        FREEAGENT_CLIENT_SECRET: "secret-1",
        FREEAGENT_TOKEN_ENCRYPTION_KEY: "encryption-key",
        FREEAGENT_OAUTH_REDIRECT_URI: "https://learn.example.test/callback",
        FREEAGENT_COMPANY_SUBDOMAIN: "foxlearningltdgmailcom"
      }, {
        code: "code-1",
        environment: "sandbox",
        redirectUri: "https://learn.example.test/callback",
        now: "2026-09-14T12:00:00.000Z"
      }, freeAgentFetch)).resolves.toBeUndefined();
      expect(calls).toEqual([
        "https://api.sandbox.freeagent.com/v2/token_endpoint",
        "https://api.sandbox.freeagent.com/v2/company"
      ]);
      expect(saved).toHaveLength(1);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("allows temporary Production OAuth reuse without a pre-pinned company", async () => {
    const calls: string[] = [];
    const saved: unknown[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/v2/token_endpoint")) {
        expect(new Headers(init?.headers).get("Authorization")).toMatch(/^Basic /);
        return jsonResponse({
          access_token: "production-access",
          refresh_token: "production-refresh",
          expires_in: 3600,
          refresh_token_expires_in: 86_400
        });
      }
      return jsonResponse({
        company: {
          name: "Production Company",
          subdomain: "production-company",
          currency: "GBP",
          url: "https://api.freeagent.com/v2/company"
        }
      });
    };
    const db = {
      prepare(sql: string) {
        const first = async () => null;
        return {
          first,
          bind(...values: unknown[]) {
            return {
              first,
              async run() {
                saved.push({ sql, values });
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    } as unknown as D1Database;
    await expect(connectFreeAgent(db, {
      FREEAGENT_ENVIRONMENT: "production",
      FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP: "true",
      FREEAGENT_CLIENT_ID: "legacy-client",
      FREEAGENT_CLIENT_SECRET: "legacy-secret",
      FREEAGENT_TOKEN_ENCRYPTION_KEY: "legacy-key",
      FREEAGENT_OAUTH_REDIRECT_URI: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      FREEAGENT_INVOICE_CURRENCY: "GBP"
    }, {
      code: "production-code",
      environment: "production",
      redirectUri: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      now: "2026-09-14T12:00:00.000Z"
    }, fetcher)).resolves.toBeUndefined();
    expect(calls).toEqual([
      "https://api.freeagent.com/v2/token_endpoint",
      "https://api.freeagent.com/v2/company"
    ]);
    expect(saved[0]).toMatchObject({ values: expect.arrayContaining(["production", "production-company"]) });
  });

  it("keeps Sandbox and Production OAuth connections in separate records", async () => {
    const connections: Record<string, Record<string, unknown>> = {};
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v2/token_endpoint")) {
        const body = String(init?.body ?? "");
        const production = body.includes("code=production-code");
        return jsonResponse({
          access_token: production ? "production-access" : "sandbox-access",
          refresh_token: production ? "production-refresh" : "sandbox-refresh",
          expires_in: 3600,
          refresh_token_expires_in: 86_400
        });
      }
      const production = url.startsWith("https://api.freeagent.com/");
      return jsonResponse({
        company: {
          name: production ? "Production Company" : "Sandbox Company",
          subdomain: production ? "production-company" : "sandbox-company",
          currency: "GBP",
          url: `${production ? "https://api.freeagent.com" : "https://api.sandbox.freeagent.com"}/v2/company`
        }
      });
    };
    const db = {
      prepare(sql: string) {
        const execute = async (values: unknown[] = []) => {
          if (sql.startsWith("SELECT * FROM accounting_connections_by_environment")) {
            return connections[String(values[0])] ?? null;
          }
          return null;
        };
        return {
          first: async () => execute(),
          bind(...values: unknown[]) {
            return {
              first: async () => execute(values),
              async run() {
                if (sql.startsWith("INSERT INTO accounting_connections_by_environment")) {
                  connections[String(values[0])] = {
                    id: "FREEAGENT",
                    environment: values[0],
                    company_name: values[1],
                    company_subdomain: values[2],
                    access_token_ciphertext: values[3],
                    refresh_token_ciphertext: values[4],
                    access_token_expires_at: values[5],
                    refresh_token_expires_at: values[6],
                    status: "CONNECTED",
                    updated_at: values[7]
                  };
                }
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    } as unknown as D1Database;
    const baseEnv = {
      FREEAGENT_ENVIRONMENT: "sandbox",
      FREEAGENT_INVOICE_CURRENCY: "GBP",
      FREEAGENT_SANDBOX_CLIENT_ID: "sandbox-client",
      FREEAGENT_SANDBOX_CLIENT_SECRET: "sandbox-secret",
      FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY: "sandbox-key",
      FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN: "sandbox-company",
      FREEAGENT_PRODUCTION_CLIENT_ID: "production-client",
      FREEAGENT_PRODUCTION_CLIENT_SECRET: "production-secret",
      FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY: "production-key",
      FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN: "production-company"
    };
    await connectFreeAgent(db, baseEnv, {
      code: "sandbox-code",
      environment: "sandbox",
      redirectUri: baseEnv.FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI,
      now: "2026-09-14T12:00:00.000Z"
    }, fetcher);
    const sandboxBefore = connections.sandbox;
    await connectFreeAgent(db, baseEnv, {
      code: "production-code",
      environment: "production",
      redirectUri: baseEnv.FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI,
      now: "2026-09-14T12:01:00.000Z"
    }, fetcher);
    expect(connections.sandbox).toEqual(sandboxBefore);
    expect(connections.production).toMatchObject({
      environment: "production",
      company_subdomain: "production-company",
      status: "CONNECTED"
    });
    expect(connections.production?.access_token_ciphertext).not.toBe(connections.sandbox?.access_token_ciphertext);
  });

  it("persists a verified contact through the D1 mapping path", async () => {
    const studentId = "student-1";
    const now = "2026-09-14T12:00:00.000Z";
    const encryptionKey = "test-encryption-key";
    const storedLinks: Array<Record<string, unknown>> = [];
    const connection = {
      id: "FREEAGENT",
      environment: "sandbox",
      company_subdomain: "foxlearningltdgmailcom",
      access_token_ciphertext: await encryptCredential("access-token", encryptionKey),
      refresh_token_ciphertext: "unused-refresh-token",
      access_token_expires_at: "2026-09-14T14:00:00.000Z",
      refresh_token_expires_at: null,
      company_name: "Fox Learning Ltd",
      status: "CONNECTED"
    };
    const db = {
      prepare(sql: string) {
        const execute = async (values: unknown[] = []) => {
          if (sql.includes("FROM accounting_connections")) return connection;
          if (sql.includes("FROM external_accounting_links")) {
            return storedLinks.find((link) => link.local_entity_id === values[0]) ?? null;
          }
          if (sql.includes("FROM accounting_outbox")) return null;
          return null;
        };
        return {
          async first() {
            return execute();
          },
          bind(...values: unknown[]) {
            return {
              first: async () => execute(values),
              async run() {
                if (sql.includes("INSERT INTO external_accounting_links")) {
                  expect((sql.match(/\?/g) ?? []).length).toBe(12);
                  expect(values).toHaveLength(12);
                  storedLinks.push({
                    id: values[0],
                    provider: "FREEAGENT",
                    local_entity_type: "STUDENT",
                    local_entity_id: values[1],
                    external_resource_type: "CONTACT",
                    external_reference: values[2],
                    external_url: values[3],
                    status: values[4],
                    verified_at: values[5],
                    verified_environment: values[6],
                    verified_company_subdomain: values[7],
                    last_error_code: values[8],
                    last_error_message: values[9],
                    created_at: values[10],
                    updated_at: values[11]
                  });
                }
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    } as unknown as D1Database;
    const fetcher: typeof fetch = async () => jsonResponse({
      contact: { url: "https://api.sandbox.freeagent.com/v2/contacts/257175" }
    });

    await expect(verifyFreeAgentContactMapping(db, {
      FREEAGENT_ENVIRONMENT: "sandbox",
      FREEAGENT_API_VERSION: "v2",
      FREEAGENT_CLIENT_ID: "client-1",
      FREEAGENT_CLIENT_SECRET: "secret-1",
      FREEAGENT_TOKEN_ENCRYPTION_KEY: encryptionKey
    }, {
      studentId,
      externalReference: "257175",
      now
    }, fetcher)).resolves.toBeUndefined();

    expect(storedLinks).toHaveLength(1);
    expect(storedLinks[0]).toMatchObject({
      local_entity_id: studentId,
      external_reference: "257175",
      status: "VERIFIED",
      verified_environment: "sandbox",
      verified_company_subdomain: "foxlearningltdgmailcom"
    });
  });

  it("refuses to replace a contact mapping while accounting work is active", async () => {
    const existingLink = {
      local_entity_id: "student-1",
      status: "VERIFIED",
      external_reference: "257175",
      external_url: "https://api.sandbox.freeagent.com/v2/contacts/257175"
    };
    const db = {
      prepare(sql: string) {
        const result = sql.includes("FROM accounting_connections")
          ? { id: "FREEAGENT", environment: "sandbox", company_subdomain: "foxlearningltdgmailcom" }
          : sql.includes("FROM external_accounting_links")
            ? existingLink
            : sql.includes("FROM accounting_outbox")
              ? { present: 1 }
              : null;
        return {
          first: async () => result,
          bind() {
            return { first: async () => result };
          }
        };
      }
    } as unknown as D1Database;

    await expect(verifyFreeAgentContactMapping(db, {
      FREEAGENT_ENVIRONMENT: "sandbox"
    }, {
      studentId: "student-1",
      externalReference: "999999",
      now: "2026-09-14T12:00:00.000Z"
    }, async () => {
      throw new Error("Provider lookup must not run while mapping work is active.");
    })).rejects.toMatchObject({ shape: { code: "CONFLICT" } });
  });

  it("creates one invoice and replays by provider reference without a second POST", async () => {
    const harness = await accountingProcessHarness();
    let createCount = 0;
    const fetcher: typeof fetch = async (input, init) => {
      if (init?.method === "POST") {
        createCount += 1;
        harness.state.invoicePresent = true;
        return jsonResponse({
          invoice: {
            url: "https://api.sandbox.freeagent.com/v2/invoices/42",
            reference: "FT-ACC-history1"
          }
        }, 201);
      }
      return jsonResponse({
        invoices: harness.state.invoicePresent
          ? [{ url: "https://api.sandbox.freeagent.com/v2/invoices/42", reference: "FT-ACC-history1" }]
          : []
      });
    };

    const first = await processAccountingOutbox(harness.db, harness.env, "outbox-1", "2026-09-14T12:00:00.000Z", fetcher);
    expect(first).toMatchObject({ status: "SUCCEEDED", external_reference: "42", provider_status: "CREATED" });
    expect(createCount).toBe(1);

    harness.state.outbox.status = "RETRYABLE";
    harness.state.outbox.external_reference = null;
    harness.state.outbox.external_url = null;
    harness.state.outbox.external_resource_type = null;
    harness.state.outbox.completed_at = null;
    const replay = await processAccountingOutbox(harness.db, harness.env, "outbox-1", "2026-09-14T12:05:00.000Z", fetcher);
    expect(replay).toMatchObject({ status: "SUCCEEDED", external_reference: "42", provider_status: "RECONCILED" });
    expect(createCount).toBe(1);
  });

  it("records bounded retry state for a retryable provider failure", async () => {
    const harness = await accountingProcessHarness();
    const fetcher: typeof fetch = async () => jsonResponse({ error: "slow down" }, 429, { "Retry-After": "30" });

    const result = await processAccountingOutbox(harness.db, harness.env, "outbox-1", "2026-09-14T12:00:00.000Z", fetcher);
    expect(result).toMatchObject({
      status: "RETRYABLE",
      safe_error_code: "RATE_LIMIT",
      provider_status: "429",
      next_attempt_at: "2026-09-14T12:00:30.000Z"
    });
  });

  it("marks an unknown provider outcome for reconciliation instead of retrying blindly", async () => {
    const harness = await accountingProcessHarness();
    let mode: "timeout" | "invoice" = "timeout";
    const fetcher: typeof fetch = async (input) => {
      if (mode === "timeout") throw new TypeError("network interrupted");
      return jsonResponse({
        invoice: {
          url: "https://api.sandbox.freeagent.com/v2/invoices/42",
          reference: "FT-ACC-history1"
        }
      });
    };

    const unknown = await processAccountingOutbox(harness.db, harness.env, "outbox-1", "2026-09-14T12:00:00.000Z", fetcher);
    expect(unknown).toMatchObject({ status: "UNKNOWN", safe_error_code: "NETWORK", next_attempt_at: null });

    mode = "invoice";
    const reconciled = await reconcileAccountingOutbox(harness.db, harness.env, unknown!, "42", "2026-09-14T12:05:00.000Z", fetcher);
    expect(reconciled).toBe(true);
    expect(harness.state.outbox).toMatchObject({ status: "SUCCEEDED", external_reference: "42", provider_status: "RECONCILED" });
  });

  it("preserves timeout failures as unknown external outcomes", async () => {
    const diagnostic = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = new FreeAgentClient({
      environment: "sandbox",
      timeoutMs: 5,
      fetcher: (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      })
    });
    await expect(client.company("token")).rejects.toBeInstanceOf(FreeAgentApiError);
    await expect(client.company("token")).rejects.toMatchObject({ shape: { code: "TIMEOUT", retryable: true, unknown: true } });
    expect(diagnostic).toHaveBeenCalledWith("FreeAgent fetch failed", {
      fetcherType: "injected",
      errorName: "AbortError",
      errorMessage: "aborted",
      constructorName: "DOMException",
      timeout: true,
      targetHostname: "api.sandbox.freeagent.com",
      targetPath: "/v2/company"
    });
    expect(diagnostic.mock.calls[0]?.[1]).not.toHaveProperty("authorization");
    diagnostic.mockRestore();
  });
});
