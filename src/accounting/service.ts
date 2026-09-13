import {
  claimAccountingOutbox,
  findAccountingConnection,
  findAccountingOutbox,
  findExternalAccountingLink,
  markAccountingOutcome,
  markAccountingSucceeded,
  reconcileAccountingReference,
  saveAccountingConnection,
  updateAccountingConnectionStatus,
  type AccountingOutbox
} from "../db/accounting";
import { decryptCredential, encryptCredential } from "./credentials";
import {
  exchangeAuthorizationCode,
  FreeAgentApiError,
  FreeAgentClient,
  refreshAccessToken,
  type FreeAgentEnvironment
} from "./freeagent/client";
import { nextAccountingRetryAt, type AccountingErrorCode } from "../domain/accounting";

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
}

export interface AccountingIntegrationStatus {
  configured: boolean;
  connected: boolean;
  environment: FreeAgentEnvironment;
  label: string;
  lastSuccessAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function configuredEnvironment(env: AccountingEnvironment): FreeAgentEnvironment {
  return env.FREEAGENT_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function providerError(error: unknown): FreeAgentApiError | null {
  return error instanceof FreeAgentApiError ? error : null;
}

function providerReference(url: string): string {
  return url.split("/").pop() ?? url;
}

function configuredInvoice(env: AccountingEnvironment): { amount: string; itemType: string; paymentTermsInDays: number; categoryUrl?: string; currency?: string } | null {
  const amount = env.FREEAGENT_INVOICE_AMOUNT?.trim();
  const itemType = env.FREEAGENT_INVOICE_ITEM_TYPE?.trim();
  const paymentTerms = Number.parseInt(env.FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS ?? "0", 10);
  if (!amount || !itemType || !Number.isFinite(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;
  return {
    amount,
    itemType,
    paymentTermsInDays: paymentTerms,
    ...(env.FREEAGENT_INVOICE_CATEGORY_URL ? { categoryUrl: env.FREEAGENT_INVOICE_CATEGORY_URL } : {}),
    ...(env.FREEAGENT_INVOICE_CURRENCY ? { currency: env.FREEAGENT_INVOICE_CURRENCY } : {})
  };
}

async function accessToken(
  db: D1Database,
  env: AccountingEnvironment,
  now: string,
  fetcher: typeof fetch,
  forceRefresh = false
): Promise<string> {
  const connection = await findAccountingConnection(db);
  if (!connection?.refresh_token_ciphertext || !env.FREEAGENT_TOKEN_ENCRYPTION_KEY || !env.FREEAGENT_CLIENT_ID || !env.FREEAGENT_CLIENT_SECRET) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent OAuth connection is not configured.",
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
  const configured = Boolean(env.FREEAGENT_CLIENT_ID && env.FREEAGENT_CLIENT_SECRET && env.FREEAGENT_TOKEN_ENCRYPTION_KEY && env.FREEAGENT_OAUTH_REDIRECT_URI);
  if (!configured || !connection) {
    return { configured, connected: false, environment, label: configured ? "Connection requires attention" : "Not configured", lastSuccessAt: connection?.last_success_at ?? null, errorCode: connection?.last_error_code ?? null, errorMessage: connection?.last_error_message ?? null };
  }
  return {
    configured,
    connected: connection.status === "CONNECTED",
    environment: connection.environment,
    label: connection.status === "CONNECTED" ? "Connected to FreeAgent" : "Connection requires attention",
    lastSuccessAt: connection.last_success_at,
    errorCode: connection.last_error_code,
    errorMessage: connection.last_error_message
  };
}

export async function connectFreeAgent(
  db: D1Database,
  env: AccountingEnvironment,
  input: { code: string; environment: FreeAgentEnvironment; redirectUri: string; now: string },
  fetcher: typeof fetch = fetch
): Promise<void> {
  if (!env.FREEAGENT_CLIENT_ID || !env.FREEAGENT_CLIENT_SECRET || !env.FREEAGENT_TOKEN_ENCRYPTION_KEY) {
    throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent OAuth configuration is incomplete.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const tokens = await exchangeAuthorizationCode(input.environment, {
    clientId: env.FREEAGENT_CLIENT_ID,
    clientSecret: env.FREEAGENT_CLIENT_SECRET,
    code: input.code,
    redirectUri: input.redirectUri
  }, fetcher);
  const client = new FreeAgentClient({ environment: input.environment, apiVersion: env.FREEAGENT_API_VERSION, fetcher });
  const company = await client.company(tokens.accessToken);
  await saveAccountingConnection(db, {
    environment: input.environment,
    companySubdomain: company.subdomain ?? null,
    accessTokenCiphertext: await encryptCredential(tokens.accessToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY),
    refreshTokenCiphertext: await encryptCredential(tokens.refreshToken, env.FREEAGENT_TOKEN_ENCRYPTION_KEY),
    accessTokenExpiresAt: new Date(Date.parse(input.now) + tokens.expiresIn * 1000).toISOString(),
    refreshTokenExpiresAt: tokens.refreshTokenExpiresIn === null ? null : new Date(Date.parse(input.now) + tokens.refreshTokenExpiresIn * 1000).toISOString(),
    now: input.now
  });
}

export async function processAccountingOutbox(
  db: D1Database,
  env: AccountingEnvironment,
  id: string,
  now: string,
  fetcher: typeof fetch = fetch
): Promise<AccountingOutbox | null> {
  const claimed = await claimAccountingOutbox(db, id, now, new Date(Date.parse(now) - 15 * 60_000).toISOString());
  if (!claimed) return null;
  if (claimed.action_type !== "CREATE_INVOICE") {
    await markAccountingOutcome(db, id, "FAILED", "CONFIGURATION", "This accounting action is not supported.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const invoiceConfig = configuredInvoice(env);
  if (!invoiceConfig) {
    await markAccountingOutcome(db, id, "FAILED", "CONFIGURATION", "FreeAgent invoice mapping is not configured.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  if (!claimed.student_id) {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "An accounting contact must be mapped before invoicing.", null, "NOT_ATTEMPTED", now);
    return findAccountingOutbox(db, id);
  }
  const link = await findExternalAccountingLink(db, claimed.student_id);
  if (!link) {
    await markAccountingOutcome(db, id, "FAILED", "CONTACT_MAPPING_REQUIRED", "An accounting contact must be mapped before invoicing.", null, "NOT_ATTEMPTED", now);
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
      price: invoiceConfig.amount,
      ...(invoiceConfig.categoryUrl ? { categoryUrl: invoiceConfig.categoryUrl } : {}),
      ...(invoiceConfig.currency ? { currency: invoiceConfig.currency } : {})
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

export async function reconcileAccountingOutbox(
  db: D1Database,
  env: AccountingEnvironment,
  outbox: AccountingOutbox,
  externalReference: string,
  now: string,
  fetcher: typeof fetch = fetch
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
