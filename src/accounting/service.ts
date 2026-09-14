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
  parseFreeAgentEnvironment,
  refreshAccessToken,
  type FreeAgentCategory,
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
import {
  claimBillingProviderOperation,
  creditNoteReference,
  findBillingProviderOperation,
  findCreditById,
  markBillingProviderOperation,
  saveCreditProviderReference,
  type BillingProviderOperation
} from "../db/billing";

export interface AccountingEnvironment {
  DB?: D1Database;
  FREEAGENT_ENVIRONMENT?: string;
  FREEAGENT_SANDBOX_CLIENT_ID?: string;
  FREEAGENT_SANDBOX_CLIENT_SECRET?: string;
  FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN?: string;
  FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI?: string;
  FREEAGENT_PRODUCTION_CLIENT_ID?: string;
  FREEAGENT_PRODUCTION_CLIENT_SECRET?: string;
  FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN?: string;
  FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY?: string;
  FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI?: string;
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
  invoiceMapping: {
    amount: boolean;
    itemType: boolean;
    category: boolean;
    paymentTerms: boolean;
    currency: boolean;
    salesTax: boolean;
  };
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

export function configuredEnvironment(env: AccountingEnvironment): FreeAgentEnvironment | null {
  return parseFreeAgentEnvironment(env.FREEAGENT_ENVIRONMENT);
}

export interface FreeAgentEnvironmentConfig {
  clientId: string;
  clientSecret: string;
  companySubdomain: string | null;
  tokenEncryptionKey: string;
  oauthRedirectUri: string | null;
}

export function freeAgentEnvironmentConfig(
  env: AccountingEnvironment,
  environment = configuredEnvironment(env)
): FreeAgentEnvironmentConfig | null {
  if (!environment) return null;
  const selected = environment === "sandbox"
    ? {
      clientId: env.FREEAGENT_SANDBOX_CLIENT_ID,
      clientSecret: env.FREEAGENT_SANDBOX_CLIENT_SECRET,
      companySubdomain: env.FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN,
      tokenEncryptionKey: env.FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY,
      oauthRedirectUri: env.FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI
    }
    : {
      clientId: env.FREEAGENT_PRODUCTION_CLIENT_ID,
      clientSecret: env.FREEAGENT_PRODUCTION_CLIENT_SECRET,
      companySubdomain: env.FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN,
      tokenEncryptionKey: env.FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY,
      oauthRedirectUri: env.FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI
    };
  const legacySandbox = environment === "sandbox" ? {
    clientId: env.FREEAGENT_CLIENT_ID,
    clientSecret: env.FREEAGENT_CLIENT_SECRET,
    companySubdomain: env.FREEAGENT_COMPANY_SUBDOMAIN,
    tokenEncryptionKey: env.FREEAGENT_TOKEN_ENCRYPTION_KEY,
    oauthRedirectUri: env.FREEAGENT_OAUTH_REDIRECT_URI
  } : null;
  const value = {
    clientId: selected.clientId ?? legacySandbox?.clientId,
    clientSecret: selected.clientSecret ?? legacySandbox?.clientSecret,
    companySubdomain: selected.companySubdomain ?? legacySandbox?.companySubdomain,
    tokenEncryptionKey: selected.tokenEncryptionKey ?? legacySandbox?.tokenEncryptionKey,
    oauthRedirectUri: selected.oauthRedirectUri ?? legacySandbox?.oauthRedirectUri
  };
  return value.clientId && value.clientSecret && value.tokenEncryptionKey
    ? {
      clientId: value.clientId,
      clientSecret: value.clientSecret,
      companySubdomain: value.companySubdomain ?? null,
      tokenEncryptionKey: value.tokenEncryptionKey,
      oauthRedirectUri: value.oauthRedirectUri ?? null
    }
    : null;
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
  const categoryIssue = categoryUrlIssue(categoryUrl, environment);
  if (categoryIssue) return categoryIssue;
  if (!paymentTermsText || !/^\d+$/.test(paymentTermsText)) return "FreeAgent invoice payment terms are missing or invalid.";
  const paymentTerms = Number(paymentTermsText);
  if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) return "FreeAgent invoice payment terms are outside the supported range.";
  if (currency !== NORMAL_LESSON_CURRENCY) return "FreeAgent invoice currency must be GBP.";
  if (!salesTax || normalizeSalesTaxRate(salesTax) === null) return "FreeAgent invoice VAT/tax mapping is missing or invalid.";
  return null;
}

function categoryUrlIssue(categoryUrl: string, environment: FreeAgentEnvironment | null): string | null {
  if (!categoryUrl) return "FreeAgent invoice category is missing.";
  if (!/^https:\/\/api(?:\.sandbox)?\.freeagent\.com\/v2\/categories\/[^/]+$/.test(categoryUrl)) return "FreeAgent invoice category URL is invalid.";
  if (!environment) return "FreeAgent environment is not configured.";
  const origin = environment === "sandbox" ? "https://api.sandbox.freeagent.com" : "https://api.freeagent.com";
  if (!categoryUrl.startsWith(`${origin}/`)) return "FreeAgent invoice category does not match the configured environment.";
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

function billingSettingsValues(
  settings: Awaited<ReturnType<typeof findAccountingBillingSettings>> | null,
  env: AccountingEnvironment
): BillingSettingsInput {
  return {
    amount: settings?.amount ?? env.FREEAGENT_INVOICE_AMOUNT ?? "55.00",
    itemType: settings?.item_type ?? env.FREEAGENT_INVOICE_ITEM_TYPE ?? "Hours",
    categoryUrl: settings?.category_url ?? env.FREEAGENT_INVOICE_CATEGORY_URL ?? "",
    paymentTermsDays: String(settings?.payment_terms_days ?? env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "0"),
    currency: settings?.currency ?? env.FREEAGENT_INVOICE_CURRENCY ?? "GBP",
    salesTaxRate: settings?.sales_tax_rate ?? env.FREEAGENT_INVOICE_SALES_TAX_RATE ?? "0"
  };
}

function invoiceMappingStatus(values: BillingSettingsInput, environment: FreeAgentEnvironment | null): AccountingIntegrationStatus["invoiceMapping"] {
  const amount = values.amount.trim();
  const itemType = values.itemType.trim();
  const categoryUrl = values.categoryUrl.trim();
  const paymentTermsDays = values.paymentTermsDays.trim();
  const currency = values.currency.trim();
  const salesTaxRate = values.salesTaxRate.trim();
  return {
    amount: Boolean(amount && parseMinorUnits(amount) !== null && parseMinorUnits(amount)! > 0n),
    itemType: Boolean(itemType),
    category: categoryUrlIssue(categoryUrl, environment) === null,
    paymentTerms: /^\d+$/.test(paymentTermsDays) && Number(paymentTermsDays) >= 0 && Number(paymentTermsDays) <= 365,
    currency: currency === "GBP",
    salesTax: Boolean(salesTaxRate && normalizeSalesTaxRate(salesTaxRate) !== null)
  };
}

function logOAuthStageFailure(stage: string, error: unknown): void {
  const diagnostic = error instanceof FreeAgentApiError
    ? { stage, code: error.shape.code, status: error.shape.status, message: error.shape.message }
    : { stage, code: "UNKNOWN", status: null, message: "Unexpected OAuth connection failure." };
  console.log("FreeAgent OAuth stage failed", diagnostic);
}

export function validateBillingSettings(
  input: BillingSettingsInput,
  environment: FreeAgentEnvironment | null,
  categories?: FreeAgentCategory[]
): {
  value: { amount: string; itemType: string; categoryUrl: string; paymentTermsDays: number; salesTaxRate: string } | null;
  error: string | null;
} {
  const error = invoiceConfigurationIssueForValues(input, environment);
  if (error) return { value: null, error };
  if (categories && categories.length && !categories.some((category) => category.url === input.categoryUrl.trim())) {
    return { value: null, error: "Select an accounting category returned by the connected FreeAgent company." };
  }
  if (categories && !categories.length) {
    return { value: null, error: "FreeAgent accounting categories are unavailable; refresh after reconnecting the provider." };
  }
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
  if (existing) {
    const environment = configuredEnvironment(env);
    const credentials = freeAgentEnvironmentConfig(env, environment);
    if (
      environment &&
      credentials?.companySubdomain &&
      existing.provider_environment === environment &&
      existing.provider_company_subdomain === credentials.companySubdomain
    ) return existing;
    if (!existing.provider_environment && environment && credentials?.companySubdomain) return existing;
    return existing;
  }
  const initial = configuredInvoice(env);
  if (!initial) return null;
  await saveAccountingBillingSettings(db, {
    amount: initial.amount,
    itemType: initial.itemType,
    categoryUrl: initial.categoryUrl,
    providerEnvironment: configuredEnvironment(env),
    providerCompanySubdomain: freeAgentEnvironmentConfig(env, configuredEnvironment(env))?.companySubdomain ?? null,
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
  const environment = configuredEnvironment(env);
  const credentials = freeAgentEnvironmentConfig(env, environment);
  if (
    settings.provider_environment &&
    settings.provider_environment !== environment
  ) return null;
  if (
    settings.provider_company_subdomain &&
    settings.provider_company_subdomain !== credentials?.companySubdomain
  ) return null;
  return invoiceConfigurationFromValues({
    amount: settings.amount,
    itemType: settings.item_type,
    categoryUrl: settings.category_url,
    paymentTermsDays: String(settings.payment_terms_days),
    currency: settings.currency,
    salesTaxRate: settings.sales_tax_rate
  }, configuredEnvironment(env));
}

export async function listFreeAgentCategories(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<FreeAgentCategory[]> {
  return providerCall(db, env, now, fetcher, (client, token) => client.listCategories(token));
}

async function accessToken(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch,
  forceRefresh = false
): Promise<string> {
  const environment = configuredEnvironment(env);
  const credentials = freeAgentEnvironmentConfig(env, environment);
  const connection = await findAccountingConnection(db, environment ?? undefined);
  if (!environment || !connection?.refresh_token_ciphertext || !credentials) {
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
    return decryptCredential(connection.access_token_ciphertext, credentials.tokenEncryptionKey);
  }
  const refreshToken = await decryptCredential(connection.refresh_token_ciphertext, credentials.tokenEncryptionKey);
  const refreshed = await refreshAccessToken(connection.environment, {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken
  }, fetcher);
  await saveAccountingConnection(db, {
    environment: connection.environment,
    companyName: connection.company_name,
    companySubdomain: connection.company_subdomain,
    accessTokenCiphertext: await encryptCredential(refreshed.accessToken, credentials.tokenEncryptionKey),
    refreshTokenCiphertext: await encryptCredential(refreshed.refreshToken, credentials.tokenEncryptionKey),
    accessTokenExpiresAt: new Date(Date.parse(now) + refreshed.expiresIn * 1000).toISOString(),
    refreshTokenExpiresAt: refreshed.refreshTokenExpiresIn === null ? connection.refresh_token_expires_at : new Date(Date.parse(now) + refreshed.refreshTokenExpiresIn * 1000).toISOString(),
    now
  });
  return refreshed.accessToken;
}

export async function providerCall<T>(
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

export async function processCreditNoteProviderOperation(
  db: D1Database,
  env: AccountingEnvironment,
  id: string,
  now: string,
  fetcher: typeof fetch = freeAgentFetch
): Promise<BillingProviderOperation | null> {
  const claimed = await claimBillingProviderOperation(db, id, now, new Date(Date.parse(now) - 15 * 60_000).toISOString());
  if (!claimed) return null;
  if (claimed.operation_type !== "CREATE_CREDIT_NOTE" || !claimed.credit_id) {
    await markBillingProviderOperation(db, id, {
      status: "BLOCKED",
      providerStatus: "NOT_SUPPORTED",
      safeErrorCode: "CONFIGURATION",
      safeErrorMessage: "This billing provider operation is not supported by the current worker."
    }, now);
    return findBillingProviderOperation(db, id);
  }
  const credit = await findCreditById(db, claimed.credit_id);
  if (!credit) {
    await markBillingProviderOperation(db, id, {
      status: "BLOCKED",
      providerStatus: "CREDIT_NOT_FOUND",
      safeErrorCode: "VALIDATION",
      safeErrorMessage: "The customer credit no longer exists."
    }, now);
    return findBillingProviderOperation(db, id);
  }
  const link = await findExternalAccountingLink(db, credit.student_id, configuredEnvironment(env) ?? undefined);
  const connection = await findAccountingConnection(db, configuredEnvironment(env) ?? undefined);
  if (!link || link.status !== "VERIFIED" || !connection ||
      link.verified_environment !== connection.environment ||
      (connection.company_subdomain && link.verified_company_subdomain !== connection.company_subdomain)) {
    await markBillingProviderOperation(db, id, {
      status: "BLOCKED",
      providerStatus: "CONTACT_MAPPING_REQUIRED",
      safeErrorCode: "CONTACT_MAPPING_REQUIRED",
      safeErrorMessage: "A verified FreeAgent contact mapping is required before creating a credit note."
    }, now);
    return findBillingProviderOperation(db, id);
  }
  const invoiceConfig = await configuredInvoiceFromDatabase(db, env, now);
  if (!invoiceConfig) {
    await markBillingProviderOperation(db, id, {
      status: "BLOCKED",
      providerStatus: "BILLING_MAPPING_REQUIRED",
      safeErrorCode: "CONFIGURATION",
      safeErrorMessage: "FreeAgent credit-note mapping is not configured."
    }, now);
    return findBillingProviderOperation(db, id);
  }
  const reference = creditNoteReference(credit.credit_id);
  try {
    const existing = await providerCall(db, env, now, fetcher, (client, token) =>
      client.findCreditNoteByReference(token, link.external_url, reference)
    );
    if (existing) {
      await saveCreditProviderReference(db, credit.credit_id, {
        reference: providerReference(existing.url),
        url: existing.url
      }, now);
      const sent = existing.status === "Draft"
        ? await providerCall(db, env, now, fetcher, (client, token) => client.markCreditNoteSent(token, existing.url))
        : existing;
      await markBillingProviderOperation(db, id, {
        status: "SUCCEEDED",
        providerReference: providerReference(sent.url),
        providerUrl: sent.url,
        providerStatus: sent.status ?? "RECONCILED"
      }, now);
      return findBillingProviderOperation(db, id);
    }
    const creditNote = await providerCall(db, env, now, fetcher, (client, token) => client.createDraftCreditNote(token, {
      contactUrl: link.external_url,
      reference,
      datedOn: now.slice(0, 10),
      paymentTermsInDays: 0,
      itemType: invoiceConfig.itemType,
      description: "FoxTutor administrative cancellation credit",
      amount: formatMinorUnits(BigInt(credit.original_amount_minor)),
      salesTaxRate: invoiceConfig.salesTaxRate,
      categoryUrl: invoiceConfig.categoryUrl,
      currency: invoiceConfig.currency
    }));
    await saveCreditProviderReference(db, credit.credit_id, {
      reference: providerReference(creditNote.url),
      url: creditNote.url
    }, now);
    const sent = await providerCall(db, env, now, fetcher, (client, token) =>
      client.markCreditNoteSent(token, creditNote.url)
    );
    await markBillingProviderOperation(db, id, {
      status: "SUCCEEDED",
      providerReference: providerReference(sent.url),
      providerUrl: sent.url,
      providerStatus: sent.status ?? "CREATED"
    }, now);
    await updateAccountingConnectionStatus(db, "CONNECTED", { environment: configuredEnvironment(env) ?? undefined, lastSuccessAt: now, now });
  } catch (error) {
    const apiError = providerError(error);
    const shape = apiError?.shape;
    const code = shape?.code ?? "UNKNOWN";
    const message = apiError?.message ?? "FreeAgent credit-note operation failed.";
    const postMayHaveSucceeded = code === "TIMEOUT" || code === "NETWORK" || Boolean(shape?.unknown);
    const status = postMayHaveSucceeded ? "UNKNOWN" : shape?.retryable ? "RETRYABLE" : "FAILED";
    const retryAt = status === "RETRYABLE"
      ? shape?.retryAfterSeconds
        ? new Date(Date.parse(now) + shape.retryAfterSeconds * 1000).toISOString()
        : nextAccountingRetryAt(now, claimed.attempt_count)
      : null;
    await markBillingProviderOperation(db, id, {
      status,
      providerStatus: shape?.status ? String(shape.status) : "ERROR",
      safeErrorCode: code as AccountingErrorCode,
      safeErrorMessage: message,
      nextAttemptAt: retryAt
    }, now);
  }
  return findBillingProviderOperation(db, id);
}

export async function accountingIntegrationStatus(db: D1Database, env: AccountingEnvironment): Promise<AccountingIntegrationStatus> {
  const connection = await findAccountingConnection(db, configuredEnvironment(env) ?? undefined);
  const environment = configuredEnvironment(env);
  const credentials = freeAgentEnvironmentConfig(env, environment);
  const persistedSettings = await findAccountingBillingSettings(db);
  const settingsValues = billingSettingsValues(persistedSettings, env);
  const settingsEnvironmentMismatch = Boolean(
    persistedSettings?.provider_environment &&
    persistedSettings.provider_environment !== environment
  );
  const settingsCompanyMismatch = Boolean(
    persistedSettings?.provider_company_subdomain &&
    persistedSettings.provider_company_subdomain !== credentials?.companySubdomain
  );
  const configurationMessage = settingsEnvironmentMismatch
    ? "FreeAgent invoice category belongs to a different environment."
    : settingsCompanyMismatch
      ? "FreeAgent invoice category belongs to a different company."
      : invoiceConfigurationFromValues(settingsValues, environment)
        ? null
        : invoiceConfigurationIssueForValues(settingsValues, environment);
  const invoiceMappingBase = invoiceMappingStatus(settingsValues, environment);
  const invoiceMapping = {
    ...invoiceMappingBase,
    category: invoiceMappingBase.category && !settingsEnvironmentMismatch && !settingsCompanyMismatch
  };
  const configured = Boolean(
    environment &&
    credentials &&
    credentials.companySubdomain &&
    credentials.oauthRedirectUri
  );
  if (!configured || !connection) {
    return {
      configured,
      connected: false,
      environment: environment ?? "sandbox",
      companyName: connection?.company_name ?? null,
      companySubdomain: connection?.company_subdomain ?? credentials?.companySubdomain ?? null,
      updatedAt: connection?.updated_at ?? null,
      label: !configured ? "Not configured" : configurationMessage ? "Invoice mapping incomplete" : "Connection requires attention",
      lastSuccessAt: connection?.last_success_at ?? null,
      errorCode: connection?.last_error_code ?? (configurationMessage ? "CONFIGURATION" : null),
      errorMessage: connection?.last_error_message ?? configurationMessage,
      invoiceMapping
    };
  }
  const identityMatches = connection.environment === environment &&
    connection.company_subdomain === credentials?.companySubdomain;
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
    errorMessage: connection.last_error_message ?? configurationMessage,
    invoiceMapping
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
    const credentials = freeAgentEnvironmentConfig(env, input.environment);
    if (
      !credentials ||
      !configuredEnvironment(env) ||
      input.environment !== configuredEnvironment(env) ||
      !credentials.companySubdomain ||
      !credentials.oauthRedirectUri ||
      input.redirectUri !== credentials.oauthRedirectUri
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
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      code: input.code,
      redirectUri: input.redirectUri
    }, fetcher);
    stage = `${input.environment} /v2/company`;
    const client = new FreeAgentClient({ environment: input.environment, apiVersion: env.FREEAGENT_API_VERSION, fetcher });
    const company = await client.company(tokens.accessToken);
    stage = "company subdomain comparison";
    if (company.subdomain !== credentials.companySubdomain) {
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
    const existing = await findAccountingConnection(db, input.environment);
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
    const accessTokenCiphertext = await encryptCredential(tokens.accessToken, credentials.tokenEncryptionKey);
    const refreshTokenCiphertext = await encryptCredential(tokens.refreshToken, credentials.tokenEncryptionKey);
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
  const link = await findExternalAccountingLink(db, claimed.student_id, configuredEnvironment(env) ?? undefined);
  if (!link || link.status !== "VERIFIED") {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "An accounting contact must be mapped before invoicing.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const connection = await findAccountingConnection(db, configuredEnvironment(env) ?? undefined);
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
      await updateAccountingConnectionStatus(db, "CONNECTED", { environment: configuredEnvironment(env) ?? undefined, lastSuccessAt: now, now });
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
    await updateAccountingConnectionStatus(db, "CONNECTED", { environment: configuredEnvironment(env) ?? undefined, lastSuccessAt: now, now });
  } catch (error) {
    const apiError = providerError(error);
    const shape = apiError?.shape;
    const code = shape?.code ?? "UNKNOWN";
    const message = apiError?.message ?? "FreeAgent integration failed.";
    if (code === "AUTHENTICATION" || code === "AUTHORIZATION" || code === "CONFIGURATION") {
      await updateAccountingConnectionStatus(db, "ATTENTION", { environment: configuredEnvironment(env) ?? undefined, code, message, now });
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
  const connection = await findAccountingConnection(db, configuredEnvironment(env) ?? undefined);
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
  const existing = await findExternalAccountingLink(db, input.studentId, configuredEnvironment(env) ?? undefined);
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
  let stage = "access-token retrieval / refresh";
  const logFailure = (error: unknown, failureStage: string): void => {
    if (failureStage === "D1 mapping persistence") {
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const constructorName = error && typeof error === "object" && "constructor" in error
        ? ((error as { constructor?: { name?: unknown } }).constructor?.name ?? "Unknown")
        : "Unknown";
      const safeMessage = error instanceof Error
        ? error.message.slice(0, 240)
        : "Unexpected database error.";
      const sqliteCode = error && typeof error === "object" && "code" in error
        ? ((error as { code?: unknown }).code ?? null)
        : null;
      console.log("FreeAgent contact mapping stage failed", {
        stage: failureStage,
        errorName,
        constructorName,
        message: safeMessage,
        sqliteCode
      });
      return;
    }
    const shape = error instanceof FreeAgentApiError ? error.shape : null;
    console.log("FreeAgent contact mapping stage failed", {
      stage: failureStage,
      status: shape?.status ?? null,
      errorCode: shape?.code ?? "UNKNOWN",
      retryable: shape?.retryable ?? false,
      unknown: shape?.unknown ?? true,
      targetPath: failureStage === "FreeAgent contact GET" || failureStage === "contact response validation" ? "/v2/contacts/:id" : null,
      fetcherType: fetcher === freeAgentFetch ? "bound-wrapper" : "injected"
    });
  };
  try {
    const environment = configuredEnvironment(env);
    if (!environment) throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent environment is not configured.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const client = new FreeAgentClient({ environment, apiVersion: env.FREEAGENT_API_VERSION, fetcher });
    const token = await accessToken(db, env, input.now, fetcher);
    stage = "FreeAgent contact GET";
    let contact: { url: string };
    try {
      const found = await client.findContact(token, input.externalReference);
      if (!found) throw new FreeAgentApiError({
        code: "MALFORMED_RESPONSE",
        status: null,
        message: "FreeAgent contact response was incomplete.",
        retryable: false,
        unknown: true,
        retryAfterSeconds: null
      });
      contact = found;
    } catch (error) {
      stage = error instanceof FreeAgentApiError && error.shape.code === "MALFORMED_RESPONSE"
        ? "contact response validation"
        : "FreeAgent contact GET";
      throw error;
    }
    stage = "D1 mapping persistence";
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
  } catch (error) {
    logFailure(error, stage);
    throw error;
  }
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
