import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("accounting admin presentation contract", () => {
  it("uses a dedicated money icon and keeps FreeAgent setup messaging single-sourced", () => {
    expect(workerSource).toContain('Accounting: "accounting"');
    expect(workerSource).toContain("accounting:");
    expect(workerSource).toContain("!status.errorMessage");
    expect(workerSource).toContain('status.errorMessage ? `<p class="form-error">');
  });

  it("shows safe editable billing defaults and explains the secret boundary", () => {
    expect(workerSource).toContain('env.FREEAGENT_INVOICE_AMOUNT ?? "55.00"');
    expect(workerSource).toContain('env.FREEAGENT_INVOICE_ITEM_TYPE ?? "Hours"');
    expect(workerSource).toContain('env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "0"');
    expect(workerSource).toContain('env.FREEAGENT_INVOICE_SALES_TAX_RATE ?? "0"');
    expect(workerSource).toContain("configure them as Cloudflare Worker secrets");
    expect(workerSource).toContain("Secret values are never shown or stored in this form.");
    expect(workerSource).toContain("category URL and contact mappings must come from the connected FreeAgent company");
  });

  it("keeps contact mappings readable on desktop and mobile", () => {
    expect(workerSource).toContain('class="table-wrap accounting-contact-table"');
    expect(cssSource).toContain(".accounting-contact-table table { min-width: 980px");
    expect(cssSource).toContain(".accounting-contact-table .status { white-space: nowrap; }");
    expect(cssSource).toContain(".accounting-contact-table .inline-form");
    expect(cssSource).toContain(".accounting-contact-table { overflow: visible; }");
  });
});
