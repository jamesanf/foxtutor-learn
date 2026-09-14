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
    expect(workerSource).toContain("Category choices are read from the connected");
    expect(workerSource).toContain('name="categoryUrl" required');
    expect(workerSource).not.toContain('name="categoryUrl" type="url"');
    expect(workerSource).toContain("provider URL is stored internally");
    expect(workerSource).toContain("accounting-fixed-category");
    expect(workerSource).toContain("resolveFoxTutorCategoryMapping");
    expect(readFileSync("src/accounting/service.ts", "utf8")).toContain("Multiple Production FreeAgent categories match the approved FoxTutor sales mapping.");
    expect(workerSource).toContain("FreeAgent ${environmentLabel} integration active");
    expect(workerSource).toContain('status.connected ? "Reauthenticate" : "Connect"');
    expect(workerSource).toContain('`/learn/admin/accounting/connect/${environment}`');
    expect(workerSource).toContain("FreeAgent token encryption key is not configured.");
    expect(workerSource).toContain("temporaryProductionCompatibilityEnabled(env)");
    expect(workerSource).toContain('class="accounting-icon-link accounting-settings-link"');
    expect(workerSource).toContain('aria-label="Billing settings"');
    expect(workerSource).toContain("M12 15.5A3.5 3.5 0 1 1 15.5 12");
    expect(workerSource).toContain('class="accounting-icon-link billing-settings-back"');
    expect(workerSource).toContain('aria-label="Back to accounting"');
    expect(workerSource).toContain("M20 11H7.83l5.59-5.59");
    expect(workerSource).not.toContain('>Back to accounting</a>');
    expect(workerSource).toContain("Company name");
    expect(workerSource).toContain("Company subdomain");
    expect(cssSource).toContain(".info-box { display: block; width: 100%;");
    expect(cssSource).toContain(".accounting-connection-details");
    expect(workerSource).toContain('class="card form-card billing-settings-card"');
    expect(workerSource).not.toContain("Configure future FreeAgent lesson invoices.");
    expect(cssSource).toContain(".billing-settings-actions .button { width: 220px; min-width: 220px; max-width: 220px; flex: 0 0 220px;");
    expect(cssSource).toContain(".billing-settings-card .page-heading h1 { min-width: 0; white-space: nowrap;");
    expect(cssSource).toContain(".accounting-icon-link { display: inline-grid; width: 42px; height: 42px;");
    expect(cssSource).toContain(".accounting-icon-link:hover, .accounting-icon-link:focus-visible");
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

  it("generates the admin OAuth target from the server-selected environment", () => {
    expect(workerSource).toContain('const environment = parseFreeAgentEnvironment(connectionMatch?.[1]);');
    expect(workerSource).toContain('return redirect(freeAgentAuthorizationUrl(environment, {');
    expect(workerSource).toContain('clientId: credentials.clientId');
    expect(workerSource).not.toContain("login.sandbox.freeagent.com");
    expect(workerSource).toContain("FreeAgent ${label}");
    expect(workerSource).toContain('`/learn/admin/accounting/connect/${environment}`');
    expect(workerSource).toContain('freeAgentEnvironmentLabel(environment)');
  });

  it("handles the bypassed callback with one-time admin-bound OAuth state", () => {
    expect(workerSource).toContain('if (route === "admin-accounting-callback") return handleAccountingOAuthCallback(request, env);');
    expect(workerSource).toContain("findActiveUserById(db, consumed.admin_user_id)");
    expect(workerSource).toContain('admin.role !== "ADMIN"');
    expect(workerSource).toContain('createSession(db, admin, env.ENVIRONMENT === "production")');
    expect(workerSource).toContain("verifyFreeAgentContactMapping(db, env, { studentId, studentEmail: student.email, studentParentEmail: student.parent_email, externalReference, environment, now: new Date().toISOString() }, freeAgentFetch);");
  });

  it("keeps contact mappings readable on desktop and mobile", () => {
    expect(workerSource).toContain('class="table-wrap accounting-contact-table"');
    expect(workerSource).toContain('class="accounting-icon-button accounting-save-button"');
    expect(workerSource).toContain('class="accounting-icon-button accounting-remove-button"');
    expect(workerSource).toContain('title="Verify and save"');
    expect(workerSource).toContain('title="Remove"');
    expect(workerSource).toContain("<th>Student</th><th>Email</th><th>Status</th><th>Contact ID</th>");
    expect(workerSource).toContain('data-label="Student"');
    expect(workerSource).toContain('data-label="Email"');
    expect(workerSource).toContain('data-label="Contact ID"');
    expect(workerSource).not.toContain("<th>FreeAgent contact</th>");
    expect(workerSource).toContain("Sandbox contact configuration is restricted to the Production billing settings test area.");
    expect(workerSource).toContain('const connection = connectionCard("production");');
    expect(workerSource).toContain('listExternalAccountingLinks(db, "production")');
    expect(workerSource).toContain('const environment: FreeAgentEnvironment = "production";');
    expect(workerSource).toContain("Sandbox testing only.");
    expect(workerSource).toContain("Open Sandbox test settings");
    expect(workerSource).toContain('const environment = parseFreeAgentEnvironment(url.searchParams.get("environment")) ?? "production";');
    expect(cssSource).toContain(".accounting-contact-table table { min-width: 0; table-layout: fixed; }");
    expect(cssSource).toContain(".accounting-contact-table th, .accounting-contact-table td { width: 25%; }");
    expect(cssSource).toContain(".accounting-contact-table th:nth-child(3) { text-align: center; }");
    expect(cssSource).toContain(".accounting-contact-table th:last-child, .accounting-contact-table td:last-child { text-align: left; }");
    expect(cssSource).toContain(".accounting-contact-table .inline-form { align-items: center; justify-content: flex-start;");
    expect(cssSource).toContain(".accounting-contact-table .status { display: flex; width: 112px; min-width: 112px;");
    expect(cssSource).toContain("justify-content: flex-end;");
    expect(cssSource).toContain("width: 104px; min-width: 104px; flex: 0 0 104px;");
    expect(cssSource).toContain(".accounting-contact-table { overflow: visible; }");
    expect(cssSource).toContain(".accounting-icon-button { display: inline-grid; width: 34px;");
  });

  it("keeps recurring admin mutations on the targeted series response path", () => {
    expect(workerSource).toContain("await ensureRecurringSeriesMaterialised(db, createdSeries, currentCalendarDate(new Date(now)), now);");
    expect(workerSource).toContain("await ensureRecurringSeriesMaterialised(db, resumedSeries, currentCalendarDate(new Date(now)), now);");
    expect(workerSource).not.toContain("await ensureAllRecurringSeriesMaterialised(db, currentCalendarDate(new Date(now)), now);");
  });

  it("uses a four-card dashboard grid and side-by-side accounting actions", () => {
    expect(cssSource).toContain(".summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(cssSource).toContain("@media (max-width: 900px) {\n  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(workerSource).toContain('class="form-actions accounting-connection-actions"');
    expect(workerSource).toContain('class="card"><div class="section-heading"><div class="accounting-connection-title"><h2>FreeAgent ${label}</h2>${!status.errorMessage ? `<span class="status status-${status.connected ? "sent" : "failed"}">${status.connected ? "Connected" : "Needs attention"}</span>` : ""}</div><div class="form-actions accounting-connection-actions">');
    expect(workerSource).toContain('${connectionAction}${environmentSettingsAction}');
    expect(workerSource).not.toContain('>${escapeHtml(status.connected ? "Connected" : "Not connected")} · ${escapeHtml(label)}</p>');
    expect(cssSource).toContain(".accounting-connection-actions { display: flex; width: auto; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: nowrap; }");
    expect(cssSource).toContain(".accounting-connection-actions .accounting-settings-link { order: 3; }");
    expect(cssSource).toContain(".accounting-connection-actions .button { order: 2; }");
    expect(cssSource).toContain(".accounting-connection-title { display: flex; min-width: 0; align-items: center; gap: 10px; }");
    expect(cssSource).toContain(".accounting-connection-title .status { white-space: nowrap; }");
    expect(workerSource).toContain('class="summary-grid accounting-summary-grid"');
    expect(cssSource).toContain(".accounting-summary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }");
    expect(cssSource).toContain(".accounting-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }");
    expect(cssSource).toContain(".accounting-summary-grid .summary-card:last-child { grid-column: span 2; }");
  });
});
