import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("accounting admin presentation contract", () => {
  it("uses a dedicated money icon and keeps FreeAgent setup messaging single-sourced", () => {
    expect(workerSource).toContain('Accounting: "accounting"');
    expect(workerSource).toContain("accounting: \"M5 6H23V18H5V6M14 9A3,3");
    expect(workerSource).not.toContain("accounting: \"M12 2C7.58 2 4 3.79 4 6");
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
    expect(workerSource).toContain("FreeAgent integration active");
    expect(workerSource).toContain("Reauthenticate FreeAgent");
    expect(workerSource).toContain("Company name");
    expect(workerSource).toContain("Company subdomain");
    expect(cssSource).toContain(".info-box { display: block; width: 100%;");
    expect(cssSource).toContain(".accounting-connection-details");
    expect(workerSource).toContain('class="card form-card billing-settings-card"');
    expect(workerSource).not.toContain("Configure future FreeAgent lesson invoices.");
    expect(cssSource).toContain(".billing-settings-actions .button { width: 220px; min-width: 220px; max-width: 220px; flex: 0 0 220px;");
    expect(cssSource).toContain(".billing-settings-card .page-heading h1 { min-width: 0; white-space: nowrap;");
    expect(cssSource).toContain(".card .info-box { max-width: none; }");
  });

  it("uses the shared hover context treatment for billing validation warnings", () => {
    expect(workerSource).toContain('class="form-error form-warning"');
    expect(workerSource).toContain("billingSettingsErrorHint");
    expect(cssSource).toContain(".form-warning::after");
    expect(cssSource).toContain(".card .form-error { max-width: none; }");
  });

  it("keeps contact persistence diagnostics limited to safe database fields", () => {
    const serviceSource = readFileSync("src/accounting/service.ts", "utf8");
    expect(serviceSource).toContain('stage: failureStage,\n        errorName,\n        constructorName,\n        message: safeMessage,\n        sqliteCode');
    expect(serviceSource).toContain('error.message.slice(0, 240)');
    expect(serviceSource).not.toContain('console.log("FreeAgent contact mapping stage failed", error)');
  });

  it("logs only staged, safe OAuth diagnostics on callback failure", () => {
    expect(workerSource).toContain('console.error("FreeAgent OAuth callback failed", diagnostic)');
    expect(workerSource).toContain("{ code: error.shape.code, status: error.shape.status, message: error.shape.message }");
    expect(workerSource).not.toContain("console.error(\"FreeAgent OAuth callback failed\", error)");
    expect(readFileSync("src/accounting/service.ts", "utf8")).toContain('console.log("FreeAgent OAuth stage failed", diagnostic)');
  });

  it("handles the bypassed callback with one-time admin-bound OAuth state", () => {
    expect(workerSource).toContain('if (route === "admin-accounting-callback") return handleAccountingOAuthCallback(request, env);');
    expect(workerSource).toContain("findActiveUserById(db, consumed.admin_user_id)");
    expect(workerSource).toContain('admin.role !== "ADMIN"');
    expect(workerSource).toContain('createSession(db, admin, env.ENVIRONMENT === "production")');
    expect(workerSource).toContain("verifyFreeAgentContactMapping(db, env, { studentId, externalReference, now: new Date().toISOString() }, freeAgentFetch);");
  });

  it("keeps contact mappings readable on desktop and mobile", () => {
    expect(workerSource).toContain('class="table-wrap accounting-contact-table"');
    expect(cssSource).toContain(".accounting-contact-table table { min-width: 980px");
    expect(cssSource).toContain(".accounting-contact-table .status { white-space: nowrap; }");
    expect(cssSource).toContain(".accounting-contact-table .inline-form");
    expect(cssSource).toContain(".accounting-contact-table { overflow: visible; }");
  });

  it("uses a four-card dashboard grid and stacked accounting actions", () => {
    expect(cssSource).toContain(".summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(cssSource).toContain("@media (max-width: 900px) {\n  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(workerSource).toContain('class="form-actions accounting-connection-actions"');
    expect(cssSource).toContain(".accounting-connection-actions .button { width: 100%; justify-content: center; }");
    expect(workerSource).toContain('class="summary-grid accounting-summary-grid"');
    expect(cssSource).toContain(".accounting-summary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }");
    expect(cssSource).toContain(".accounting-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }");
    expect(cssSource).toContain(".accounting-summary-grid .summary-card:last-child { grid-column: span 2; }");
  });
});
