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
    expect(workerSource).toContain("FreeAgent credentials are managed as Cloudflare secrets.");
    expect(workerSource).toContain("Category and contact mappings come from FreeAgent.");
  });

  it("logs only staged, safe OAuth diagnostics on callback failure", () => {
    expect(workerSource).toContain('console.error("FreeAgent OAuth callback failed", diagnostic)');
    expect(workerSource).toContain("{ code: error.shape.code, status: error.shape.status, message: error.shape.message }");
    expect(workerSource).not.toContain("console.error(\"FreeAgent OAuth callback failed\", error)");
  });

  it("handles the bypassed callback with one-time admin-bound OAuth state", () => {
    expect(workerSource).toContain('if (route === "admin-accounting-callback") return handleAccountingOAuthCallback(request, env);');
    expect(workerSource).toContain("findActiveUserById(db, consumed.admin_user_id)");
    expect(workerSource).toContain('admin.role !== "ADMIN"');
    expect(workerSource).toContain('createSession(db, admin, env.ENVIRONMENT === "production")');
  });

  it("keeps contact mappings readable on desktop and mobile", () => {
    expect(workerSource).toContain('class="table-wrap accounting-contact-table"');
    expect(cssSource).toContain(".accounting-contact-table table { min-width: 980px");
    expect(cssSource).toContain(".accounting-contact-table .status { white-space: nowrap; }");
    expect(cssSource).toContain(".accounting-contact-table .inline-form");
    expect(cssSource).toContain(".accounting-contact-table { overflow: visible; }");
  });
});
