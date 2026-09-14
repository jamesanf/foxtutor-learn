import { describe, expect, it } from "vitest";
import { FreeAgentClient } from "../../src/accounting/freeagent/client";

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
          categories: [{ url: `${origin}/v2/categories/1`, name: "Sales", nominal_code: "001" }]
        });
      }
    });
    await expect(client.listCategories("token")).resolves.toEqual([{
      url: `${origin}/v2/categories/1`,
      name: "Sales",
      nominalCode: "001"
    }]);
    expect(requestUrl).toBe(`${origin}/v2/categories?per_page=100`);
  });

  it("rejects malformed and empty category responses distinctly", async () => {
    const malformed = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ categories: [{ url: "https://api.freeagent.com/v2/categories/1", name: "Sales" }] })
    });
    await expect(malformed.listCategories("token")).rejects.toMatchObject({ shape: { code: "MALFORMED_RESPONSE" } });

    const empty = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ categories: [] })
    });
    await expect(empty.listCategories("token")).resolves.toEqual([]);
  });

  it("surfaces provider category errors without inventing options", async () => {
    const client = new FreeAgentClient({
      environment: "sandbox",
      fetcher: async () => jsonResponse({ error: "unavailable" }, 503)
    });
    await expect(client.listCategories("token")).rejects.toMatchObject({ shape: { code: "TEMPORARY_PROVIDER" } });
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
