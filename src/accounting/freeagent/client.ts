import type { AccountingErrorCode } from "../../domain/accounting";

export type FreeAgentEnvironment = "sandbox" | "production";

export function parseFreeAgentEnvironment(value: unknown): FreeAgentEnvironment | null {
  return value === "sandbox" || value === "production" ? value : null;
}

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
  status?: string;
  paymentMethods?: Record<string, boolean>;
  paymentStatus?: string | null;
  paymentUrl?: string | null;
}

export interface FreeAgentCreditNote {
  url: string;
  reference?: string;
  status?: string;
  dueValue?: string;
}

export type FreeAgentDirectDebitMandateState = "setup" | "pending" | "inactive" | "active" | "failed" | string;

export interface FreeAgentContact {
  url: string;
  directDebitMandateState: FreeAgentDirectDebitMandateState | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  billingEmail?: string;
}

export interface FreeAgentCompany {
  name?: string;
  url?: string;
  subdomain?: string;
  currency?: string;
}

export interface FreeAgentCategory {
  url: string;
  description: string;
  nominalCode: string | null;
  group: "ADMIN_EXPENSES" | "COST_OF_SALES" | "INCOME" | "GENERAL";
  autoSalesTaxRate: string | null;
}

export interface FreeAgentClientOptions {
  environment: FreeAgentEnvironment;
  apiVersion?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export const freeAgentFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

function safeFetchTargetPath(target: URL): string {
  return /^\/v2\/contacts\/[^/]+$/.test(target.pathname) ? "/v2/contacts/:id" : target.pathname;
}

function logFetchFailure(error: unknown, target: URL, timedOut: boolean, fetcher: typeof fetch): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage = error instanceof Error ? error.message : "Non-Error fetch failure.";
  const constructorName = error && typeof error === "object" && "constructor" in error
    ? ((error as { constructor?: { name?: unknown } }).constructor?.name ?? "Unknown")
    : "Unknown";
  console.log("FreeAgent fetch failed", {
    fetcherType: fetcher === freeAgentFetch ? "bound-wrapper" : "injected",
    errorName,
    errorMessage,
    constructorName,
    timeout: timedOut,
    targetHostname: target.hostname,
    targetPath: safeFetchTargetPath(target)
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

type FreeAgentCategoryGroup = FreeAgentCategory["group"];

const categoryGroups: ReadonlyArray<{
  key: "admin_expenses_categories" | "cost_of_sales_categories" | "income_categories" | "general_categories";
  group: FreeAgentCategoryGroup;
  order: number;
}> = [
  { key: "income_categories", group: "INCOME", order: 0 },
  { key: "cost_of_sales_categories", group: "COST_OF_SALES", order: 1 },
  { key: "admin_expenses_categories", group: "ADMIN_EXPENSES", order: 2 },
  { key: "general_categories", group: "GENERAL", order: 3 }
];

function categoryResponseError(message: string): FreeAgentApiError {
  return new FreeAgentApiError({
    code: "MALFORMED_RESPONSE",
    status: null,
    message,
    retryable: false,
    unknown: true,
    retryAfterSeconds: null
  });
}

export function normalizeFreeAgentCategories(
  data: unknown,
  environment: FreeAgentEnvironment,
  status = 200
): FreeAgentCategory[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new FreeAgentApiError({
      ...categoryResponseError("FreeAgent category response was not an object.").shape,
      status
    });
  }
  const response = data as Record<string, unknown>;
  const knownKeys = categoryGroups.map(({ key }) => key);
  if (!knownKeys.some((key) => Object.prototype.hasOwnProperty.call(response, key))) {
    throw new FreeAgentApiError({
      ...categoryResponseError("FreeAgent category response did not contain a documented category collection.").shape,
      status
    });
  }
  const categories: Array<FreeAgentCategory & { order: number }> = [];
  for (const { key, group, order } of categoryGroups) {
    const collection = response[key];
    if (collection === undefined) continue;
    if (!Array.isArray(collection)) {
      throw new FreeAgentApiError({
        ...categoryResponseError(`FreeAgent category collection ${key} was not an array.`).shape,
        status
      });
    }
    for (const item of collection) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new FreeAgentApiError({
          ...categoryResponseError(`FreeAgent ${key} contained an invalid category.`).shape,
          status
        });
      }
      const category = item as Record<string, unknown>;
      const url = canonicalProviderUrl(category.url, environment);
      const description = typeof category.description === "string" ? category.description.trim() : "";
      if (!url || !description) {
        throw new FreeAgentApiError({
          ...categoryResponseError(`FreeAgent ${key} contained a category without a safe URL or description.`).shape,
          status
        });
      }
      categories.push({
        url,
        description,
        nominalCode: category.nominal_code === undefined || category.nominal_code === null
          ? null
          : String(category.nominal_code),
        group,
        autoSalesTaxRate: category.auto_sales_tax_rate === undefined || category.auto_sales_tax_rate === null
          ? null
          : String(category.auto_sales_tax_rate),
        order
      });
    }
  }
  const deduplicated = new Map<string, FreeAgentCategory & { order: number }>();
  for (const category of categories) {
    if (!deduplicated.has(category.url)) deduplicated.set(category.url, category);
  }
  return [...deduplicated.values()]
    .sort((left, right) =>
      left.order - right.order
      || left.description.localeCompare(right.description)
      || (left.nominalCode ?? "").localeCompare(right.nominalCode ?? "")
      || left.url.localeCompare(right.url)
    )
    .map(({ order: _order, ...category }) => category);
}

export class FreeAgentClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: FreeAgentClientOptions) {
    this.baseUrl = freeAgentBaseUrl(options.environment);
    this.fetcher = options.fetcher ?? freeAgentFetch;
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
      if (target) logFetchFailure(error, target, timedOut, this.fetcher);
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

  async listCategories(accessToken: string): Promise<FreeAgentCategory[]> {
    const result = await this.requestJson<unknown>(accessToken, "/v2/categories?per_page=100");
    return normalizeFreeAgentCategories(result.data, this.options.environment, result.response.status);
  }

  async getContact(accessToken: string, externalReference: string): Promise<FreeAgentContact | null> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent contact reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{
      contact?: {
        url?: string;
        first_name?: string;
        last_name?: string;
        direct_debit_mandate_state?: FreeAgentDirectDebitMandateState;
        email?: string;
        billing_email?: string;
      }
    }>(accessToken, `/v2/contacts/${encodeURIComponent(id)}`);
    const url = canonicalProviderUrl(result.data.contact?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent contact response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    console.info("freeagent_contact_response_shape", {
      environment: this.options.environment,
      status: result.response.status,
      fields: Object.keys(result.data.contact ?? {}).sort(),
      hasDirectDebitMandateState: Object.prototype.hasOwnProperty.call(result.data.contact ?? {}, "direct_debit_mandate_state"),
      hasPaymentMethod: Object.prototype.hasOwnProperty.call(result.data.contact ?? {}, "payment_method"),
      hasPaymentUrl: Object.prototype.hasOwnProperty.call(result.data.contact ?? {}, "payment_url"),
      hasGoCardlessState: Object.keys(result.data.contact ?? {}).some((key) => /gocardless|mandate|direct_debit/i.test(key))
    });
    return {
      url,
      firstName: result.data.contact?.first_name,
      lastName: result.data.contact?.last_name,
      directDebitMandateState: result.data.contact?.direct_debit_mandate_state ?? null,
      email: result.data.contact?.email,
      billingEmail: result.data.contact?.billing_email
    };
  }

  async findContact(accessToken: string, externalReference: string): Promise<FreeAgentContact | null> {
    return this.getContact(accessToken, externalReference);
  }

  async listContacts(accessToken: string, page = 1): Promise<FreeAgentContact[]> {
    const query = new URLSearchParams({ view: "active", page: String(page), per_page: "100" });
    const result = await this.requestJson<{
      contacts?: Array<{
        url?: string;
        first_name?: string;
        last_name?: string;
        direct_debit_mandate_state?: FreeAgentDirectDebitMandateState;
        email?: string;
        billing_email?: string;
      }>
    }>(accessToken, `/v2/contacts?${query.toString()}`);
    const contacts: FreeAgentContact[] = [];
    for (const contact of result.data.contacts ?? []) {
      const url = canonicalProviderUrl(contact.url, this.options.environment);
      if (!url) throw new FreeAgentApiError({
        code: "MALFORMED_RESPONSE",
        status: result.response.status,
        message: "FreeAgent contact list contained an unsafe URL.",
        retryable: false,
        unknown: true,
        retryAfterSeconds: null
      });
      contacts.push({
        url,
        firstName: contact.first_name,
        lastName: contact.last_name,
        directDebitMandateState: contact.direct_debit_mandate_state ?? null,
        email: contact.email,
        billingEmail: contact.billing_email
      });
    }
    return contacts;
  }

  async createContact(
    accessToken: string,
    input: { firstName: string; lastName: string; email: string; billingEmail?: string; address1?: string }
  ): Promise<FreeAgentContact> {
    const contact = {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      billing_email: input.billingEmail ?? input.email,
      ...(input.address1 ? { address1: input.address1 } : {})
    };
    const result = await this.requestJson<{
      contact?: {
        url?: string;
        first_name?: string;
        last_name?: string;
        direct_debit_mandate_state?: FreeAgentDirectDebitMandateState;
        email?: string;
        billing_email?: string;
      }
    }>(accessToken, "/v2/contacts", {
      method: "POST",
      body: JSON.stringify({ contact })
    });
    const url = canonicalProviderUrl(result.data.contact?.url ?? result.response.headers.get("Location"), this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent contact creation response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      firstName: result.data.contact?.first_name ?? input.firstName,
      lastName: result.data.contact?.last_name ?? input.lastName,
      directDebitMandateState: result.data.contact?.direct_debit_mandate_state ?? null,
      email: result.data.contact?.email ?? input.email,
      billingEmail: result.data.contact?.billing_email ?? input.billingEmail ?? input.email
    };
  }

  async updateContact(
    accessToken: string,
    externalReference: string,
    input: { firstName: string; lastName: string; email: string; billingEmail?: string; address1?: string }
  ): Promise<FreeAgentContact> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent contact reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{
      contact?: {
        url?: string;
        first_name?: string;
        last_name?: string;
        direct_debit_mandate_state?: FreeAgentDirectDebitMandateState;
        email?: string;
        billing_email?: string;
      }
    }>(accessToken, `/v2/contacts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        contact: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          billing_email: input.billingEmail ?? input.email,
          ...(input.address1 ? { address1: input.address1 } : {})
        }
      })
    });
    const url = canonicalProviderUrl(result.data.contact?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent contact update response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      firstName: result.data.contact?.first_name ?? input.firstName,
      lastName: result.data.contact?.last_name ?? input.lastName,
      directDebitMandateState: result.data.contact?.direct_debit_mandate_state ?? null,
      email: result.data.contact?.email ?? input.email,
      billingEmail: result.data.contact?.billing_email ?? input.billingEmail ?? input.email
    };
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
    const result = await this.requestJson<{
      invoices?: Array<{
        url?: string;
        reference?: string;
        status?: string;
        payment_methods?: Record<string, boolean>;
        payment_status?: string;
        gocardless_payment_status?: string;
        payment_url?: string;
      }>
    }>(accessToken, `/v2/invoices${query}`);
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
    return {
      url,
      reference: invoice.reference,
      status: invoice.status,
      paymentMethods: invoice.payment_methods,
      paymentStatus: invoice.payment_status ?? invoice.gocardless_payment_status ?? null,
      paymentUrl: invoice.payment_url ?? null
    };
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
    const result = await this.requestJson<{
      invoice?: {
        url?: string;
        reference?: string;
        status?: string;
        payment_methods?: Record<string, boolean>;
        payment_status?: string;
        gocardless_payment_status?: string;
        payment_url?: string;
      }
    }>(accessToken, `/v2/invoices/${encodeURIComponent(id)}`);
    const url = canonicalProviderUrl(result.data.invoice?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent invoice response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      reference: result.data.invoice?.reference,
      status: result.data.invoice?.status,
      paymentMethods: result.data.invoice?.payment_methods,
      paymentStatus: result.data.invoice?.payment_status ?? result.data.invoice?.gocardless_payment_status ?? null,
      paymentUrl: result.data.invoice?.payment_url ?? null
    };
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
      enableGoCardless?: boolean;
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
      ...(input.enableGoCardless ? { payment_methods: { gocardless_preauth: true } } : {}),
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

  async markInvoiceSent(accessToken: string, externalReference: string): Promise<FreeAgentInvoice> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent invoice reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{
      invoice?: {
        url?: string;
        reference?: string;
        status?: string;
        payment_methods?: Record<string, boolean>;
        payment_status?: string;
        gocardless_payment_status?: string;
        payment_url?: string;
      }
    }>(
      accessToken,
      `/v2/invoices/${encodeURIComponent(id)}/transitions/mark_as_sent`,
      { method: "PUT", body: JSON.stringify({}) }
    );
    const url = canonicalProviderUrl(result.data.invoice?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent invoice transition response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      reference: result.data.invoice?.reference,
      status: result.data.invoice?.status,
      paymentMethods: result.data.invoice?.payment_methods,
      paymentStatus: result.data.invoice?.payment_status ?? result.data.invoice?.gocardless_payment_status ?? null,
      paymentUrl: result.data.invoice?.payment_url ?? null
    };
  }

  async findCreditNoteByReference(accessToken: string, contactUrl: string, reference: string): Promise<FreeAgentCreditNote | null> {
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
    const result = await this.requestJson<{ credit_notes?: Array<{ url?: string; reference?: string; status?: string; due_value?: string }> }>(accessToken, `/v2/credit_notes${query}`);
    const creditNote = (result.data.credit_notes ?? []).find((candidate) => candidate.reference === reference);
    if (!creditNote?.url) return null;
    const url = canonicalProviderUrl(creditNote.url, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent credit note response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, reference: creditNote.reference, status: creditNote.status, dueValue: creditNote.due_value };
  }

  async getCreditNote(accessToken: string, externalReference: string): Promise<FreeAgentCreditNote | null> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent credit note reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{ credit_note?: { url?: string; reference?: string; status?: string; due_value?: string } }>(accessToken, `/v2/credit_notes/${encodeURIComponent(id)}`);
    const url = canonicalProviderUrl(result.data.credit_note?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent credit note response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      reference: result.data.credit_note?.reference,
      status: result.data.credit_note?.status,
      dueValue: result.data.credit_note?.due_value
    };
  }

  async createDraftCreditNote(
    accessToken: string,
    input: {
      contactUrl: string;
      reference: string;
      datedOn: string;
      paymentTermsInDays: number;
      itemType: string;
      description: string;
      amount: string;
      salesTaxRate: string;
      categoryUrl: string;
      currency: string;
    }
  ): Promise<FreeAgentCreditNote> {
    const creditNote = {
      contact: input.contactUrl,
      reference: input.reference,
      dated_on: input.datedOn,
      payment_terms_in_days: input.paymentTermsInDays,
      currency: input.currency,
      credit_note_items: [{
        item_type: input.itemType,
        description: input.description,
        quantity: "1.0",
        price: `-${input.amount}`,
        sales_tax_rate: input.salesTaxRate,
        category: input.categoryUrl
      }]
    };
    const result = await this.requestJson<{ credit_note?: { url?: string; reference?: string; status?: string; due_value?: string } }>(accessToken, "/v2/credit_notes", {
      method: "POST",
      body: JSON.stringify({ credit_note: creditNote })
    });
    const url = canonicalProviderUrl(result.data.credit_note?.url ?? result.response.headers.get("Location"), this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent credit note response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return {
      url,
      reference: result.data.credit_note?.reference ?? input.reference,
      status: result.data.credit_note?.status
    };
  }

  async markCreditNoteSent(accessToken: string, externalReference: string): Promise<FreeAgentCreditNote> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent credit note reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{ credit_note?: { url?: string; reference?: string; status?: string } }>(accessToken, `/v2/credit_notes/${encodeURIComponent(id)}/transitions/mark_as_sent`, {
      method: "PUT",
      body: JSON.stringify({})
    });
    const url = canonicalProviderUrl(result.data.credit_note?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent credit note transition response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, reference: result.data.credit_note?.reference, status: result.data.credit_note?.status };
  }

  async initiateDirectDebit(accessToken: string, externalReference: string): Promise<{ url: string; status?: string }> {
    const id = externalReference.split("/").pop();
    if (!id || !/^\d+$/.test(id)) throw new FreeAgentApiError({
      code: "VALIDATION",
      status: null,
      message: "The stored FreeAgent invoice reference is invalid.",
      retryable: false,
      unknown: false,
      retryAfterSeconds: null
    });
    const result = await this.requestJson<{ invoice?: { url?: string; status?: string } }>(accessToken, `/v2/invoices/${encodeURIComponent(id)}/direct_debit`, {
      method: "POST",
      body: JSON.stringify({})
    });
    const url = canonicalProviderUrl(result.data.invoice?.url ?? externalReference, this.options.environment);
    if (!url) throw new FreeAgentApiError({
      code: "MALFORMED_RESPONSE",
      status: result.response.status,
      message: "FreeAgent Direct Debit response did not contain a safe URL.",
      retryable: false,
      unknown: true,
      retryAfterSeconds: null
    });
    return { url, status: result.data.invoice?.status };
  }
}

export async function exchangeAuthorizationCode(
  environment: FreeAgentEnvironment,
  input: { clientId: string; clientSecret: string; code: string; redirectUri: string },
  fetcher: typeof fetch = freeAgentFetch
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
  fetcher: typeof fetch = freeAgentFetch
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
  } catch (error) {
    logFetchFailure(
      error,
      new URL("/v2/token_endpoint", freeAgentBaseUrl(environment)),
      error instanceof DOMException && error.name === "AbortError",
      fetcher
    );
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
