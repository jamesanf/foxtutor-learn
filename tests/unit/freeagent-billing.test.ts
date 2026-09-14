import { describe, expect, it } from "vitest";
import { FreeAgentClient, normalizeFreeAgentCategories } from "../../src/accounting/freeagent/client";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

describe("FreeAgent billing capabilities", () => {
  it.each(["sandbox", "production"] as const)("lists categories on the %s provider origin", async (environment) => {
    let requestUrl = "";
    const origin = environment === "sandbox" ? "https://api.sandbox.freeagent.com" : "https://api.freeagent.com";
    const client = new FreeAgentClient({
      environment,
      fetcher: async (input) => {
        requestUrl = String(input);
        return jsonResponse({
          income_categories: [{ url: `${origin}/v2/categories/1`, description: "Sales", nominal_code: "001" }],
          cost_of_sales_categories: [],
          admin_expenses_categories: [],
          general_categories: []
        });
      }
    });
    await expect(client.listCategories("token")).resolves.toEqual([{
      url: `${origin}/v2/categories/1`,
      description: "Sales",
      nominalCode: "001",
      group: "INCOME",
      autoSalesTaxRate: null
    }]);
    expect(requestUrl).toBe(`${origin}/v2/categories?per_page=100`);
  });

  it("normalizes the documented collections, removes duplicate URLs, and sorts by accounting group", () => {
    expect(normalizeFreeAgentCategories({
      admin_expenses_categories: [{ url: "https://api.sandbox.freeagent.com/v2/categories/3", description: "Admin", nominal_code: "700" }],
      cost_of_sales_categories: [{ url: "https://api.sandbox.freeagent.com/v2/categories/2", description: "Cost", nominal_code: "500" }],
      income_categories: [
        { url: "https://api.sandbox.freeagent.com/v2/categories/1", description: "Sales", nominal_code: "001", auto_sales_tax_rate: "20" }
      ],
      general_categories: [
        { url: "https://api.sandbox.freeagent.com/v2/categories/4", description: "General", nominal_code: "800" },
        { url: "https://api.sandbox.freeagent.com/v2/categories/1", description: "Duplicate", nominal_code: "999" }
      ]
    }, "sandbox")).toEqual([
      {
        url: "https://api.sandbox.freeagent.com/v2/categories/1",
        description: "Sales",
        nominalCode: "001",
        group: "INCOME",
        autoSalesTaxRate: "20"
      },
      {
        url: "https://api.sandbox.freeagent.com/v2/categories/2",
        description: "Cost",
        nominalCode: "500",
        group: "COST_OF_SALES",
        autoSalesTaxRate: null
      },
      {
        url: "https://api.sandbox.freeagent.com/v2/categories/3",
        description: "Admin",
        nominalCode: "700",
        group: "ADMIN_EXPENSES",
        autoSalesTaxRate: null
      },
      {
        url: "https://api.sandbox.freeagent.com/v2/categories/4",
        description: "General",
        nominalCode: "800",
        group: "GENERAL",
        autoSalesTaxRate: null
      }
    ]);
  });

  it("accepts a missing collection but rejects null, malformed, empty-field, and wrong-origin categories", async () => {
    const missingCollection = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({
        income_categories: [{ url: "https://api.sandbox.freeagent.com/v2/categories/1", description: "Sales" }]
      })
    });
    await expect(missingCollection.listCategories("token")).resolves.toMatchObject([{ group: "INCOME" }]);

    const nullCollection = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ income_categories: null })
    });
    await expect(nullCollection.listCategories("token")).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE" } });

    const legacyShape = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ categories: [{ url: "https://api.sandbox.freeagent.com/v2/categories/1", name: "Sales" }] })
    });
    await expect(legacyShape.listCategories("token")).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE" } });

    const empty = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({
        admin_expenses_categories: [],
        cost_of_sales_categories: [],
        income_categories: [],
        general_categories: []
      })
    });
    await expect(empty.listCategories("token")).resolves.toEqual([]);

    const invalidItem = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ income_categories: [{ url: "https://api.sandbox.freeagent.com/v2/categories/1" }] })
    });
    await expect(invalidItem.listCategories("token")).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE" } });

    const wrongOrigin = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ income_categories: [{ url: "https://api.freeagent.com/v2/categories/1", description: "Sales" }] })
    });
    await expect(wrongOrigin.listCategories("token")).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE" } });
  });

  it("surfaces provider category errors without inventing options", async () => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ error: "unavailable" }, 503)
    });
    await expect(client.listCategories("token")).rejects.toMatchObject({ shape: { code: "TEMPORARY_PROVIDER" } });
  });

  it.each([
    [401, "AUTHENTICATION"],
    [403, "AUTHORIZATION"],
    [429, "RATE_LIMIT"],
    [500, "TEMPORARY_PROVIDER"]
  ] as const)("preserves the provider error for category status %s", async (status, code) => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ error: "provider failure" }, status)
    });
    await expect(client.listCategories("token")).rejects.toMatchObject({ shape: { code, status } });
  });

  it("reads mandate state from the contact resource", async () => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({
        contact: {
          url: "https://api.sandbox.freeagent.com/v2/contacts/7",
          direct_debit_mandate_state: "active"
        }
      })
    });
    await expect(client.getContact("token", "7")).resolves.toMatchObject({
      url: "https://api.sandbox.freeagent.com/v2/contacts/7",
      directDebitMandateState: "active"
    });
  });

  it("creates a draft credit note with an explicit negative credit line", async () => {
    let requestUrl = "";
    let requestBody = "";
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async (input, init) => {
        requestUrl = String(input);
        requestBody = String(init?.body ?? "");
        return jsonResponse({
          credit_note: {
            url: "https://api.sandbox.freeagent.com/v2/credit_notes/11",
            reference: "FT-CRN-credit-1",
            status: "Draft"
          }
        }, 201, { Location: "https://api.sandbox.freeagent.com/v2/credit_notes/11" });
      }
    });
    await expect(client.createDraftCreditNote("token", {
      contactUrl: "https://api.sandbox.freeagent.com/v2/contacts/7",
      reference: "FT-CRN-credit-1",
      datedOn: "2026-09-14",
      paymentTermsInDays: 0,
      itemType: "Hours",
      description: "Cancelled lesson credit",
      amount: "55.00",
      salesTaxRate: "0",
      categoryUrl: "https://api.sandbox.freeagent.com/v2/categories/1",
      currency: "GBP"
    })).resolves.toMatchObject({ url: "https://api.sandbox.freeagent.com/v2/credit_notes/11" });
    expect(requestUrl).toBe("https://api.sandbox.freeagent.com/v2/credit_notes");
    expect(requestBody).toContain('"price":"-55.00"');
    expect(requestBody).toContain('"sales_tax_rate":"0"');
  });

  it("exposes the documented Direct Debit initiation endpoint without auto-triggering it", async () => {
    let requestUrl = "";
    let requestMethod = "";
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async (input, init) => {
        requestUrl = String(input);
        requestMethod = init?.method ?? "GET";
        return jsonResponse({ invoice: { url: "https://api.sandbox.freeagent.com/v2/invoices/42", status: "Payment pending" } });
      }
    });
    await expect(client.initiateDirectDebit("token", "42")).resolves.toMatchObject({ status: "Payment pending" });
    expect(requestUrl).toBe("https://api.sandbox.freeagent.com/v2/invoices/42/direct_debit");
    expect(requestMethod).toBe("POST");
  });
});
