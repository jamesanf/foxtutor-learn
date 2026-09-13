import { describe, expect, it } from "vitest";
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
  FreeAgentApiError,
  FreeAgentClient,
  refreshAccessToken
} from "../../src/accounting/freeagent/client";
import { configuredInvoice, invoiceConfigurationIssue } from "../../src/accounting/service";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders
  });
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
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_AMOUNT: "55.01" })).toContain("55.00 GBP");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CURRENCY: "USD" })).toContain("must be GBP");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: "20" })).toContain("must be 0");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: "EXEMPT" })).toContain("must be 0");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS: "14days" })).toContain("payment terms");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CURRENCY: undefined })).toContain("currency");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_SALES_TAX_RATE: undefined })).toContain("VAT/tax");
    expect(invoiceConfigurationIssue({ ...valid, FREEAGENT_INVOICE_CATEGORY_URL: "https://api.freeagent.com/v2/categories/1" })).toContain("environment");
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

  it("preserves timeout failures as unknown external outcomes", async () => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      timeoutMs: 5,
      fetcher: (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      })
    });
    await expect(client.company("token")).rejects.toBeInstanceOf(FreeAgentApiError);
    await expect(client.company("token")).rejects.toMatchObject({ shape: { code: "TIMEOUT", retryable: true, unknown: true } });
  });
});
