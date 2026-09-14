import type { AccountingErrorCode } from "../../domain/accounting";

export type FreeAgentEnvironment = "sandbox" | "production";

export interface FreeAgentErrorShape {
  code: AccountingErrorCode;
  status: number | null;
  message: string;
  retryable: boolean;
  unknown: boolean;
  retryAfterSeconds: number | null;
}

export class FreeAgentApiError extends Error {
  readonly shape: FreeAgentErrorShape;

  constructor(shape: FreeAgentErrorShape) {
    super(shape.message);
    this.name = "FreeAgentApiError";
    this.shape = shape;
  }
}

export interface FreeAgentInvoice {
  url: string;
  reference?: string;
}

export interface FreeAgentCompany {
  url?: string;
  subdomain?: string;
  currency?: string;
}

export interface FreeAgentClientOptions {
  environment: FreeAgentEnvironment;
  apiVersion?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

function logFetchFailure(error: unknown, target: URL, timedOut: boolean): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage = error instanceof Error ? error.message : "Non-Error fetch failure.";
  const constructorName = error && typeof error === "object" && "constructor" in error
    ? ((error as { constructor?: { name?: unknown } }).constructor?.name ?? "Unknown")
    : "Unknown";
  console.log("FreeAgent fetch failed", {
    errorName,
    errorMessage,
    constructorName,
    timeout: timedOut,
    targetHostname: target.hostname,
    targetPath: target.pathname
  });
}

export function freeAgentBaseUrl(environment: FreeAgentEnvironment): string {
  return environment === "sandbox" ? "https://api.sandbox.freeagent.com" : "https://api.freeagent.com";
}

export function freeAgentAuthorizationUrl(
  environment: FreeAgentEnvironment,
  input: { clientId: string; redirectUri: string; state: string; accessLevel: string }
): string {
  const url = new URL("/v2/approve_app", freeAgentBaseUrl(environment));
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: input.accessLevel,
    state: input.state
  }).toString();
  return url.toString();
}

function classifyStatus(status: number, retryAfter: string | null): FreeAgentErrorShape {
  const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
  if (status === 401) return { code: "AUTHENTICATION", status, message: "FreeAgent authentication failed.", retryable: false, unknown: false, retryAfterSeconds };
  if (status === 403) return { code: "AUTHORIZATION", status, message: "FreeAgent denied the configured access.", retryable: false, unknown: false, retryAfterSeconds };
  if (status === 404) return { code: "NOT_FOUND", status, message: "The FreeAgent resource was not found.", retryable: false, unknown: false, retryAfterSeconds };
  if (status === 409) return { code: "CONFLICT", status, message: "FreeAgent reported a conflicting resource.", retryable: false, unknown: false, retryAfterSeconds };
  if (status === 429) return { code: "RATE_LIMIT", status, message: "FreeAgent rate limit reached.", retryable: true, unknown: false, retryAfterSeconds };
  if (status >= 500) return { code: "TEMPORARY_PROVIDER", status, message: "FreeAgent is temporarily unavailable.", retryable: true, unknown: true, retryAfterSeconds };
  if (status >= 400) return { code: "VALIDATION", status, message: "FreeAgent rejected the accounting request.", retryable: false, unknown: false, retryAfterSeconds };
  return { code: "UNKNOWN", status, message: "FreeAgent returned an unexpected response.", retryable: false, unknown: true, retryAfterSeconds };
}

function canonicalProviderUrl(value: unknown, environment: FreeAgentEnvironment): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== freeAgentBaseUrl(environment) || !parsed.pathname.startsWith("/v2/")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export class FreeAgentClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: FreeAgentClientOptions) {
    this.baseUrl = freeAgentBaseUrl(options.environment);
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async requestJson<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<{ data: T; response: Response }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let target: URL | null = null;
    try {
      if (!path.startsWith("/") || path.startsWith("//")) {
        throw new FreeAgentApiError({
          code: "CONFIGURATION",
          status: null,
          message: "FreeAgent request path is invalid.",
          retryable: false,
          unknown: false,
          retryAfterSeconds: null
        });
      }
      target = new URL(path, this.baseUrl);
      if (target.origin !== this.baseUrl) {
        throw new FreeAgentApiError({
          code: "CONFIGURATION",
          status: null,
          message: "FreeAgent request origin is invalid.",
          retryable: false,
          unknown: false,
          retryAfterSeconds: null
        });
      }
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("Accept", "application/json");
      headers.set("User-Agent", "Foxtutor Learn accounting integration");
      if (this.options.apiVersion) headers.set("X-Api-Version", this.options.apiVersion);
      if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await this.fetcher(target, { ...init, headers, signal: controller.signal });
      if (!response.ok) {
        const shape = classifyStatus(response.status, response.headers.get("Retry-After"));
        throw new FreeAgentApiError(shape);
      }
      let data: T;
      try {
        data = await response.json() as T;
      } catch {
        throw new FreeAgentApiError({
          code: "MALFORMED_RESPONSE",
          status: response.status,
          message: "FreeAgent returned malformed JSON.",
          retryable: false,
          unknown: true,
          retryAfterSeconds: null
        });
      }
      return { data, response };
    } catch (error) {
      if (error instanceof FreeAgentApiError) throw error;
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      if (target) logFetchFailure(error, target, timedOut);
      throw new FreeAgentApiError({
        code: timedOut ? "TIMEOUT" : "NETWORK",
        status: null,
        message: timedOut ? "FreeAgent request timed out." : "FreeAgent network request failed.",
        retryable: true,
        unknown: true,
        retryAfterSeconds: null
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async company(accessToken: string): Promise<FreeAgentCompany> {
    const result = await this.requestJson<{ company?: FreeAgentCompany }>(accessToken, "/v2/company");
    if (!result.data.company) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent company response was incomplete.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return result.data.company;
  }

  async findContact(accessToken: string, externalReference: string): Promise<{ url: string } | null> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent contact reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{ contact?: { url?: string } }>(accessToken, `/v2/contacts/${encodeURIComponent(id)}`);
    const url = canonicalProviderUrl(result.data.contact?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent contact response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url };
  }

  async findInvoiceByReference(accessToken: string, contactUrl: string, reference: string): Promise<FreeAgentInvoice | null> {
    const canonicalContactUrl = canonicalProviderUrl(contactUrl, this.options.environment);
    if (!canonicalContactUrl) throw new FreeAgentApiError({
      code: "CONFIGURATION",
      status: null,
      message: "FreeAgent contact URL is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const query = `?contact=${encodeURIComponent(canonicalContactUrl)}&per_page=100`;
    const result = await this.requestJson<{ invoices?: Array<{ url?: string; reference?: string }> }>(accessToken, `/v2/invoices${query}`);
    const invoice = (result.data.invoices ?? []).find((candidate) => candidate.reference === reference);
    if (!invoice?.url) return null;
    const url = canonicalProviderUrl(invoice.url, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent invoice response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, reference: invoice.reference };
  }

  async getInvoice(accessToken: string, externalReference: string): Promise<FreeAgentInvoice | null> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent invoice reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{ invoice?: { url?: string; reference?: string } }>(accessToken, `/v2/invoices/${encodeURIComponent(id)}`);
    const url = canonicalProviderUrl(result.data.invoice?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent invoice response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, reference: result.data.invoice?.reference };
  }

  async createDraftInvoice(
    accessToken: string,
    input: {
      contactUrl: string;
      reference: string;
      datedOn: string;
      paymentTermsInDays: number;
      itemType: string;
      description: string;
      price: string;
      salesTaxRate: string;
      categoryUrl: string;
      currency: string;
    }
  ): Promise<FreeAgentInvoice> {
    const invoice = {
      contact: input.contactUrl,
      reference: input.reference,
      dated_on: input.datedOn,
      payment_terms_in_days: input.paymentTermsInDays,
      send_new_invoice_emails: false,
      send_reminder_emails: false,
      send_thank_you_emails: false,
      currency: input.currency,
      invoice_items: [{
        item_type: input.itemType,
        description: input.description,
        quantity: "1.0",
        price: input.price,
        sales_tax_rate: input.salesTaxRate,
        category: input.categoryUrl
      }]
    };
    const result = await this.requestJson<{ invoice?: { url?: string; reference?: string } }>(accessToken, "/v2/invoices", {
      method: "POST",
      body: JSON.stringify({ invoice })
    });
    const url = canonicalProviderUrl(result.data.invoice?.url ?? result.response.headers.get("Location"), this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent invoice response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, reference: result.data.invoice?.reference ?? input.reference };
  }
}

export async function exchangeAuthorizationCode(
  environment: FreeAgentEnvironment,
  input: { clientId: string; clientSecret: string; code: string; redirectUri: string },
  fetcher: typeof fetch = fetch
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; refreshTokenExpiresIn: number | null }> {
  return tokenRequest(environment, input.clientId, input.clientSecret, {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri
  }, fetcher);
}

export async function refreshAccessToken(
  environment: FreeAgentEnvironment,
  input: { clientId: string; clientSecret: string; refreshToken: string },
  fetcher: typeof fetch = fetch
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; refreshTokenExpiresIn: number | null }> {
  return tokenRequest(environment, input.clientId, input.clientSecret, {
    grant_type: "refresh_token",
    refresh_token: input.refreshToken
  }, fetcher);
}

async function tokenRequest(
  environment: FreeAgentEnvironment,
  clientId: string,
  clientSecret: string,
  values: Record<string, string>,
  fetcher: typeof fetch
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; refreshTokenExpiresIn: number | null }> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  let response: Response;
  try {
    response = await fetcher(`${freeAgentBaseUrl(environment)}/v2/token_endpoint`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Foxtutor Learn accounting integration"
      },
      body: new URLSearchParams(values)
    });
  } catch {
    throw new FreeAgentApiError({
      code: "NETWORK",
      status: null,
      message: "FreeAgent token request failed.",
      retryable: true,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  if (!response.ok) {
    const shape = classifyStatus(response.status, response.headers.get("Retry-After"));
    throw new FreeAgentApiError({ ...shape, message: "FreeAgent token request was rejected.", unknown: false });
  }
  let body: { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };
  try {
    body = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };
  } catch {
    throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: response.status,
      message: "FreeAgent token response was malformed.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  if (!body.access_token || !body.refresh_token || !Number.isFinite(body.expires_in)) {
    throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: response.status,
      message: "FreeAgent token response was incomplete.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
  }
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn,
    refreshTokenExpiresIn: Number.isFinite(body.refresh_token_expires_in) ? body.refresh_token_expires_in ?? null : null
  };
}
