import {
  claimAccountingOutbox,
  findAccountingBillingSettings,
  findAccountingConnection,
  findAccountingOutbox,
  findExternalAccountingLink,
  markAccountingOutcome,
  markAccountingSucceeded,
  upsertExternalAccountingLink,
  reconcileAccountingReference,
  saveAccountingConnection,
  saveAccountingBillingSettings,
  hasActiveAccountingDependency,
  updateAccountingConnectionStatus,
  type AccountingOutbox
} from "../db/accounting";
import { decryptCredential, encryptCredential } from "./credentials";
import {
  exchangeAuthorizationCode,
  freeAgentFetch,
  FreeAgentApiError,
  FreeAgentClient,
  refreshAccessToken,
  type FreeAgentEnvironment
} from "./freeagent/client";
import {
  formatMinorUnits,
  normalizeSalesTaxRate,
  NORMAL_LESSON_CURRENCY,
  nextAccountingRetryAt,
  parseMinorUnits,
  type AccountingErrorCode
} from "../domain/accounting";

export interface AccountingEnvironment {
  DB?: D1Database;
  FREEAGENT_ENVIRONMENT?: string;
  FREEAGENT_CLIENT_ID?: string;
  FREEAGENT_CLIENT_SECRET?: string;
  FREEAGENT_OAUTH_REDIRECT_URI?: string;
  FREEAGENT_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_API_VERSION?: string;
  FREEAGENT_INVOICE_AMOUNT?: string;
  FREEAGENT_INVOICE_ITEM_TYPE?: string;
  FREEAGENT_INVOICE_CATEGORY_URL?: string;
  FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS?: string;
  FREEAGENT_INVOICE_CURRENCY?: string;
  FREEAGENT_INVOICE_SALES_TAX_RATE?: string;
  FREEAGENT_COMPANY_SUBDOMAIN?: string;
}

export interface AccountingIntegrationStatus {
  configured: boolean;
  connected: boolean;
  environment: FreeAgentEnvironment;
  companyName: string | null;
  companySubdomain: string | null;
  updatedAt: string | null;
  label: string;
  lastSuccessAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface InvoiceConfiguration {
  amount: string;
  amountMinorUnits: bigint;
  itemType: string;
  categoryUrl: string;
  paymentTermsInDays: number;
  currency: typeof NORMAL_LESSON_CURRENCY;
  salesTaxRate: string;
}

export interface BillingSettingsInput {
  amount: string;
  itemType: string;
  categoryUrl: string;
  paymentTermsDays: string;
  currency: string;
  salesTaxRate: string;
}

function configuredEnvironment(env: AccountingEnvironment): FreeAgentEnvironment | null {
  if (env.FREEAGENT_ENVIRONMENT === "sandbox" || env.FREEAGENT_ENVIRONMENT === "production") return env.FREEAGENT_ENVIRONMENT;
  return null;
}

function providerError(error: unknown): FreeAgentApiError | null {
  return error instanceof FreeAgentApiError ? error : null;
}

function providerReference(url: string): string {
  return url.split("/").pop() ?? url;
}

function invoiceConfigurationIssueForValues(
  values: BillingSettingsInput,
  environment: FreeAgentEnvironment | null
): string | null {
  if (!environment) return "FreeAgent environment is not configured.";
  const amount = values.amount.trim();
  const itemType = values.itemType.trim();
  const categoryUrl = values.categoryUrl.trim();
  const paymentTermsText = values.paymentTermsDays.trim();
  const currency = values.currency.trim();
  const salesTax = values.salesTaxRate.trim();
  const amountMinorUnits = amount ? parseMinorUnits(amount) : null;
  if (amountMinorUnits === null || amountMinorUnits <= 0n) return "FreeAgent invoice amount is missing or invalid.";
  if (amountMinorUnits > 999999999999n) return "FreeAgent invoice amount is outside the supported range.";
  if (!itemType || itemType.length > 240) return "FreeAgent invoice item type is missing or too long.";
  if (!categoryUrl) return "FreeAgent invoice category is missing.";
  if (!/^https:\/\/api(?:\.sandbox)?\.freeagent\.com\/v2\/categories\/[^/]+$/.test(categoryUrl)) return "FreeAgent invoice category URL is invalid.";
  if (!paymentTermsText || !/^\d+$/.test(paymentTermsText)) return "FreeAgent invoice payment terms are missing or invalid.";
  const paymentTerms = Number(paymentTermsText);
  if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) return "FreeAgent invoice payment terms are outside the supported range.";
  if (currency !== NORMAL_LESSON_CURRENCY) return "FreeAgent invoice currency must be GBP.";
  if (!salesTax || normalizeSalesTaxRate(salesTax) === null) return "FreeAgent invoice VAT/tax mapping is missing or invalid.";
  if (!categoryUrl.startsWith(`https://api${environment === "sandbox" ? ".sandbox" : ""}.freeagent.com/`)) return "FreeAgent invoice category does not match the configured environment.";
  return null;
}

function invoiceConfigurationFromValues(
  values: BillingSettingsInput,
  environment: FreeAgentEnvironment | null
): InvoiceConfiguration | null {
  if (invoiceConfigurationIssueForValues(values, environment)) return null;
  const amountMinorUnits = parseMinorUnits(values.amount.trim())!;
  return {
    amount: formatMinorUnits(amountMinorUnits),
    amountMinorUnits,
    itemType: values.itemType.trim(),
    categoryUrl: values.categoryUrl.trim(),
    paymentTermsInDays: Number(values.paymentTermsDays),
    currency: NORMAL_LESSON_CURRENCY,
    salesTaxRate: normalizeSalesTaxRate(values.salesTaxRate.trim())!
  };
}

export function invoiceConfigurationIssue(env: AccountingEnvironment, environment = configuredEnvironment(env)): string | null {
  return invoiceConfigurationIssueForValues({
    amount: env.FREEAGENT_INVOICE_AMOUNT ?? "",
    itemType: env.FREEAGENT_INVOICE_ITEM_TYPE ?? "",
    categoryUrl: env.FREEAGENT_INVOICE_CATEGORY_URL ?? "",
    paymentTermsDays: env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "",
    currency: env.FREEAGENT_INVOICE_CURRENCY ?? "",
    salesTaxRate: env.FREEAGENT_INVOICE_SALES_TAX_RATE ?? ""
  }, environment);
}

export function configuredInvoice(env: AccountingEnvironment): InvoiceConfiguration | null {
  return invoiceConfigurationFromValues({
    amount: env.FREEAGENT_INVOICE_AMOUNT ?? "",
    itemType: env.FREEAGENT_INVOICE_ITEM_TYPE ?? "",
    categoryUrl: env.FREEAGENT_INVOICE_CATEGORY_URL ?? "",
    paymentTermsDays: env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "",
    currency: env.FREEAGENT_INVOICE_CURRENCY ?? "",
    salesTaxRate: env.FREEAGENT_INVOICE_SALES_TAX_RATE ?? ""
  }, configuredEnvironment(env));
}

function logOAuthStageFailure(stage: string, error: unknown): void {
  const diagnostic = error instanceof FreeAgentApiError
    ? { stage, code: error.shape.code, status: error.shape.status, message: error.shape.message }
    : { stage, code: "UNKNOWN", status: null, message: "Unexpected OAuth connection failure." };
  console.log("FreeAgent OAuth stage failed", diagnostic);
}

export function validateBillingSettings(input: BillingSettingsInput, environment: FreeAgentEnvironment | null): {
  value: { amount: string; itemType: string; categoryUrl: string; paymentTermsDays: number; salesTaxRate: string } | null;
  error: string | null;
} {
  const error = invoiceConfigurationIssueForValues(input, environment);
  if (error) return { value: null, error };
  return {
    value: {
      amount: formatMinorUnits(parseMinorUnits(input.amount.trim())!),
      itemType: input.itemType.trim(),
      categoryUrl: input.categoryUrl.trim(),
      paymentTermsDays: Number(input.paymentTermsDays.trim()),
      salesTaxRate: normalizeSalesTaxRate(input.salesTaxRate.trim())!
    },
    error: null
  };
}

async function ensureAccountingBillingSettings(
  db: D1Database,
  env: AccountingEnvironment,
  now: string
): Promise<Awaited<ReturnType<typeof findAccountingBillingSettings>>> {
  const existing = await findAccountingBillingSettings(db);
  if (existing) return existing;
  const initial = configuredInvoice(env);
  if (!initial) return null;
  await saveAccountingBillingSettings(db, {
    amount: initial.amount,
    itemType: initial.itemType,
    categoryUrl: initial.categoryUrl,
    paymentTermsDays: initial.paymentTermsInDays,
    salesTaxRate: initial.salesTaxRate,
    updatedByUserId: null,
    now
  });
  return findAccountingBillingSettings(db);
}

export async function configuredInvoiceFromDatabase(
  db: D1Database,
  env: AccountingEnvironment,
  now: string
): Promise<InvoiceConfiguration | null> {
  const settings = await ensureAccountingBillingSettings(db, env, now);
  if (!settings) return null;
  return invoiceConfigurationFromValues({
    amount: settings.amount,
    itemType: settings.item_type,
    categoryUrl: settings.category_url,
    paymentTermsDays: String(settings.payment_terms_days),
    currency: settings.currency,
    salesTaxRate: settings.sales_tax_rate
  }, configuredEnvironment(env));
}

async function accessToken(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch,
  forceRefresh = false
): Promise<string> {
  const connection = await findAccountingConnection(db);
  const environment = configuredEnvironment(env);
  if (!environment || !connection?.refresh_token_ciphertext || !env.FREEAGENT_TOKEN_ENCRYPTION_KEY || !env.FREEAGENT_CLIENT_ID || !env.FREEAGENT_CLIENT_SECRET) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent OAuth connection is not configured.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  if (connection.environment !== environment) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent environment does not match the stored connection.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  if (!forceRefresh && connection.access_token_ciphertext && connection.access_token_expires_at && Date.parse(connection.access_token_expires_at) > Date.parse(now) + 60_000) {
    return decryptCredential(connection.access_token_ciphertext, env.FREEAGENT_TOKEN_ENCRYPTION_KEY);
  }
  const refreshToken = await decryptCredential(connection.refresh_token_ciphertext, env.FREEAGENT_TOKEN_ENCRYPTION_KEY);
  const refreshed = await refreshAccessToken(connection.environment, {
    clientId: env.FREEAGENT_CLIENT_ID,
    clientSecret: env.FREEAGENT_CLIENT_SECRET,
    refreshToken
  }, fetcher);
  await saveAccountingConnection(db, {
    environment: connection.environment,
    companyName: connection.company_name,
    companySubdomain: connection.company_subdomain,
    accessTokenCiphertext: await encryptCredential(refreshed.accessToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY),
    refreshTokenCiphertext: await encryptCredential(refreshed.refreshToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY),
    accessTokenExpiresAt: new Date(Date.parse(now) + refreshed.expiresIn * 1000).toISOString(),
    refreshTokenExpiresAt: refreshed.refreshTokenExpiresIn === null ? connection.refresh_token_expires_at : new Date(Date.parse(now) + refreshed.refreshTokenExpiresIn * 1000).toISOString(),
    now
  });
  return refreshed.accessToken;
}

async function providerCall<T>(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch,
  operation: (client: FreeAgentClient, token: string) => Promise<T>
): Promise<T> {
  const environment = configuredEnvironment(env);
  if (!environment) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent environment is not configured.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const client = new FreeAgentClient({ environment, apiVersion: env.FREEAGENT_API_VERSION, fetcher });
  let token = await accessToken(db, env, now, fetcher);
  try {
    return await operation(client, token);
  } catch (error) {
    const apiError = providerError(error);
    if (!apiError || apiError.shape.code !== "AUTHENTICATION") throw error;
    token = await accessToken(db, env, now, fetcher, true);
    return operation(client, token);
  }
}

export async function accountingIntegrationStatus(db: D1Database, env: AccountingEnvironment): Promise<AccountingIntegrationStatus> {
  const connection = await findAccountingConnection(db);
  const environment = configuredEnvironment(env);
  const persistedSettings = await findAccountingBillingSettings(db);
  const configurationMessage = persistedSettings
    ? invoiceConfigurationFromValues({
      amount: persistedSettings.amount,
      itemType: persistedSettings.item_type,
      categoryUrl: persistedSettings.category_url,
      paymentTermsDays: String(persistedSettings.payment_terms_days),
      currency: persistedSettings.currency,
      salesTaxRate: persistedSettings.sales_tax_rate
    }, environment)
      ? null
      : invoiceConfigurationIssueForValues({
        amount: persistedSettings.amount,
        itemType: persistedSettings.item_type,
        categoryUrl: persistedSettings.category_url,
        paymentTermsDays: String(persistedSettings.payment_terms_days),
        currency: persistedSettings.currency,
        salesTaxRate: persistedSettings.sales_tax_rate
      }, environment)
    : invoiceConfigurationIssue(env, environment);
  const configured = Boolean(
    environment &&
    env.FREEAGENT_CLIENT_ID &&
    env.FREEAGENT_CLIENT_SECRET &&
    env.FREEAGENT_TOKEN_ENCRYPTION_KEY &&
    env.FREEAGENT_OAUTH_REDIRECT_URI &&
    env.FREEAGENT_COMPANY_SUBDOMAIN
  );
  if (!configured || !connection) {
    return {
      configured,
      connected: false,
      environment: environment ?? "sandbox",
      companyName: connection?.company_name ?? null,
      companySubdomain: connection?.company_subdomain ?? env.FREEAGENT_COMPANY_SUBDOMAIN ?? null,
      updatedAt: connection?.updated_at ?? null,
      label: !configured ? "Not configured" : configurationMessage ? "Invoice mapping incomplete" : "Connection requires attention",
      lastSuccessAt: connection?.last_success_at ?? null,
      errorCode: connection?.last_error_code ?? (configurationMessage ? "CONFIGURATION" : null),
      errorMessage: connection?.last_error_message ?? configurationMessage
    };
  }
  const identityMatches = connection.environment === environment &&
    (!env.FREEAGENT_COMPANY_SUBDOMAIN || connection.company_subdomain === env.FREEAGENT_COMPANY_SUBDOMAIN);
  return {
    configured,
    connected: connection.status === "CONNECTED" && identityMatches,
    environment: connection.environment,
    companyName: connection.company_name,
    companySubdomain: connection.company_subdomain,
    updatedAt: connection.updated_at,
    label: connection.status === "CONNECTED" && identityMatches
      ? configurationMessage ? "Invoice mapping incomplete" : "Connected to FreeAgent"
      : "Connection requires attention",
    lastSuccessAt: connection.last_success_at,
    errorCode: connection.last_error_code ?? (configurationMessage ? "CONFIGURATION" : null),
    errorMessage: connection.last_error_message ?? configurationMessage
  };
}

export async function connectFreeAgent(
  db: D1Database,
  env: AccountingEnvironment,
  input: { code: string; environment: FreeAgentEnvironment; redirectUri: string; now: string },
  fetcher: typeof fetch = freeAgentFetch
): Promise<void> {
  let stage = "configuration validation";
  const stageError = (error: unknown): FreeAgentApiError => {
    if (error instanceof FreeAgentApiError) {
      return new FreeAgentApiError({ ...error.shape, message: `${stage}: ${error.shape.message}` });
    }
    return new FreeAgentApiError({
      code: "UNKNOWN",
      status: null,
      message: `${stage}: Unexpected OAuth connection failure.`,
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
  };
  try {
    if (
      !env.FREEAGENT_CLIENT_ID ||
      !env.FREEAGENT_CLIENT_SECRET ||
      !env.FREEAGENT_TOKEN_ENCRYPTION_KEY ||
      !env.FREEAGENT_COMPANY_SUBDOMAIN ||
      !configuredEnvironment(env) ||
      input.environment !== configuredEnvironment(env) ||
      input.redirectUri !== env.FREEAGENT_OAUTH_REDIRECT_URI
    ) {
      throw new FreeAgentApiError({
        code: "CONFIGURATION",
        status: null,
        message: "FreeAgent OAuth configuration is incomplete.",
        retryable: false,
        unknown: false,
        retryAfterSeconds: null
      });
    }
    stage = "exchangeAuthorizationCode";
    const tokens = await exchangeAuthorizationCode(input.environment, {
      clientId: env.FREEAGENT_CLIENT_ID,
      clientSecret: env.FREEAGENT_CLIENT_SECRET,
      code: input.code,
      redirectUri: input.redirectUri
    }, fetcher);
    stage = "Sandbox /v2/company";
    const client = new FreeAgentClient({ environment: input.environment, apiVersion: env.FREEAGENT_API_VERSION, fetcher });
    const company = await client.company(tokens.accessToken);
    stage = "company subdomain comparison";
    if (env.FREEAGENT_COMPANY_SUBDOMAIN && company.subdomain !== env.FREEAGENT_COMPANY_SUBDOMAIN) {
      throw new FreeAgentApiError({
        code: "CONFIGURATION",
        status: null,
        message: "FreeAgent authenticated company does not match the configured company.",
        retryable: false,
        unknown: false,
        retryAfterSeconds: null
      });
    }
    stage = "findAccountingConnection";
    const existing = await findAccountingConnection(db);
    if (existing && existing.environment !== input.environment) {
      throw new FreeAgentApiError({
        code: "CONFIGURATION",
        status: null,
        message: "FreeAgent environment cannot be changed without replacing the stored connection.",
        retryable: false,
        unknown: false,
        retryAfterSeconds: null
      });
    }
    stage = "token encryption";
    const accessTokenCiphertext = await encryptCredential(tokens.accessToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY);
    const refreshTokenCiphertext = await encryptCredential(tokens.refreshToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY);
    stage = "saveAccountingConnection";
    await saveAccountingConnection(db, {
      environment: input.environment,
      companyName: company.name ?? null,
      companySubdomain: company.subdomain ?? null,
      accessTokenCiphertext,
      refreshTokenCiphertext,
      accessTokenExpiresAt: new Date(Date.parse(input.now) + tokens.expiresIn * 1000).toISOString(),
      refreshTokenExpiresAt: tokens.refreshTokenExpiresIn === null ? null : new Date(Date.parse(input.now) + tokens.refreshTokenExpiresIn * 1000).toISOString(),
      now: input.now
    });
  } catch (error) {
    logOAuthStageFailure(stage, error);
    throw stageError(error);
  }
}

export async function processAccountingOutbox(
  db: D1Database,
  env: AccountingEnvironment,
  id: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<AccountingOutbox | null> {
  const claimed = await claimAccountingOutbox(db, id, now, new Date(Date.parse(now) - 15 * 60_000).toISOString());
  if (!claimed) return null;
  if (claimed.action_type !== "CREATE_INVOICE") {
    await markAccountingOutcome(db, id, "FAILED", "CONFIGURATION", "This accounting action is not supported.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const invoiceConfig = await configuredInvoiceFromDatabase(db, env, now);
  if (!invoiceConfig) {
    const settings = await findAccountingBillingSettings(db);
    const issue = settings
      ? invoiceConfigurationIssueForValues({
        amount: settings.amount,
        itemType: settings.item_type,
        categoryUrl: settings.category_url,
        paymentTermsDays: String(settings.payment_terms_days),
        currency: settings.currency,
        salesTaxRate: settings.sales_tax_rate
      }, configuredEnvironment(env))
      : invoiceConfigurationIssue(env);
    await markAccountingOutcome(db, id, "FAILED", "CONFIGURATION", issue ?? "FreeAgent invoice mapping is not configured.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  if (!claimed.student_id) {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "An accounting contact must be mapped before invoicing.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const link = await findExternalAccountingLink(db, claimed.student_id);
  if (!link || link.status !== "VERIFIED") {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "An accounting contact must be mapped before invoicing.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const connection = await findAccountingConnection(db);
  if (
    !connection ||
    link.verified_environment !== connection.environment ||
    (connection.company_subdomain && link.verified_company_subdomain !== connection.company_subdomain)
  ) {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "The accounting contact mapping is not valid for the connected FreeAgent company.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  try {
    const existing = await providerCall(db, env, now, fetcher, (client, token) => client.findInvoiceByReference(token, link.external_url, claimed.accounting_reference));
    if (existing) {
      await markAccountingSucceeded(db, id, {
        externalReference: providerReference(existing.url),
        externalUrl: existing.url,
        externalResourceType: "invoice",
        providerStatus: "RECONCILED"
      }, now);
      await updateAccountingConnectionStatus(db, "CONNECTED", { lastSuccessAt: now, now });
      return findAccountingOutbox(db, id);
    }

    const invoice = await providerCall(db, env, now, fetcher, (client, token) => client.createDraftInvoice(token, {
      contactUrl: link.external_url,
      reference: claimed.accounting_reference,
      datedOn: claimed.accounting_effective_date,
      paymentTermsInDays: invoiceConfig.paymentTermsInDays,
      itemType: invoiceConfig.itemType,
      description: `Foxtutor Learn ${claimed.billing_consequence}`,
      price: formatMinorUnits(invoiceConfig.amountMinorUnits),
      categoryUrl: invoiceConfig.categoryUrl,
      currency: invoiceConfig.currency,
      salesTaxRate: invoiceConfig.salesTaxRate
    }));
    await markAccountingSucceeded(db, id, {
      externalReference: providerReference(invoice.url),
      externalUrl: invoice.url,
      externalResourceType: "invoice",
      providerStatus: "CREATED"
    }, now);
    await updateAccountingConnectionStatus(db, "CONNECTED", { lastSuccessAt: now, now });
  } catch (error) {
    const apiError = providerError(error);
    const shape = apiError?.shape;
    const code = shape?.code ?? "UNKNOWN";
    const message = apiError?.message ?? "FreeAgent integration failed.";
    if (code === "AUTHENTICATION" || code === "AUTHORIZATION" || code === "CONFIGURATION") {
      await updateAccountingConnectionStatus(db, "ATTENTION", { code, message, now });
    }
    const postMayHaveSucceeded = code === "TIMEOUT" || code === "NETWORK" || Boolean(shape?.unknown);
    const status = postMayHaveSucceeded ? "UNKNOWN" : shape?.retryable ? "RETRYABLE" : "FAILED";
    const retryAt = status === "RETRYABLE"
      ? shape?.retryAfterSeconds
        ? new Date(Date.parse(now) + shape.retryAfterSeconds * 1000).toISOString()
        : nextAccountingRetryAt(now, claimed.attempt_count)
      : null;
    await markAccountingOutcome(db, id, status, code as AccountingErrorCode, message, retryAt, shape?.status ? String(shape.status) : "ERROR", now);
  }
  return findAccountingOutbox(db, id);
}

export async function verifyFreeAgentContactMapping(
  db: D1Database,
  env: AccountingEnvironment,
  input: { studentId: string; externalReference: string; now: string },
  fetcher: typeof fetch = freeAgentFetch
): Promise<void> {
  if (!/^\d+$/.test(input.externalReference)) {
    throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The FreeAgent contact ID must be numeric.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const connection = await findAccountingConnection(db);
  if (!connection) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "Connect the intended FreeAgent company before mapping contacts.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const existing = await findExternalAccountingLink(db, input.studentId);
  if (existing && await hasActiveAccountingDependency(db, input.studentId)) {
    throw new FreeAgentApiError({
      code: "CONFLICT",
      status: null,
      message: "The existing contact mapping cannot be replaced while accounting work is active.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const contact = await providerCall(db, env, input.now, fetcher, (client, token) =>
    client.findContact(token, input.externalReference)
  );
  if (!contact) {
    throw new FreeAgentApiError({
      code: "NOT_FOUND",
      status: 404,
      message: "The FreeAgent contact was not found.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  await upsertExternalAccountingLink(db, {
    id: crypto.randomUUID(),
    studentId: input.studentId,
    externalReference: input.externalReference,
    externalUrl: contact.url,
    status: "VERIFIED",
    verifiedAt: input.now,
    verifiedEnvironment: connection.environment,
    verifiedCompanySubdomain: connection.company_subdomain,
    now: input.now
  });
}

export async function reconcileAccountingOutbox(
  db: D1Database,
  env: AccountingEnvironment,
  outbox: AccountingOutbox,
  externalReference: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<boolean> {
  const result = await providerCall(db, env, now, fetcher, (client, token) => client.getInvoice(token, externalReference));
  if (!result) return false;
  return reconcileAccountingReference(db, outbox.id, {
    externalReference: providerReference(result.url),
    externalUrl: result.url,
    externalResourceType: "invoice",
    providerStatus: "RECONCILED"
  }, now);
}
