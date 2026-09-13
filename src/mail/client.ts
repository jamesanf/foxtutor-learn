export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
}

export interface MailEnvironment {
  MAIL_API_URL?: string;
  MAIL_API_TOKEN?: string;
  MAIL_API_FROM?: string;
  MAIL_API_ACCESS_CLIENT_ID?: string;
  MAIL_API_ACCESS_CLIENT_SECRET?: string;
  ENVIRONMENT?: string;
}

export type MailDeliveryResult =
  | {
      kind: "accepted";
      providerStatus: number;
      providerReference: string | null;
    }
  | {
      kind: "failed";
      providerStatus: number;
      category: string;
      safeMessage: string;
      retryable: boolean;
      unknown: boolean;
    };

function providerReference(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["providerReference", "messageId", "id", "reference"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return null;
}

function failure(category: string, message: string, retryable: boolean, unknown: boolean, providerStatus = 0): MailDeliveryResult {
  return { kind: "failed", providerStatus, category, safeMessage: message.slice(0, 200), retryable, unknown };
}

export async function sendMailDetailed(
  env: MailEnvironment,
  message: MailMessage,
  fetcher: typeof fetch = fetch
): Promise<MailDeliveryResult> {
  if (env.ENVIRONMENT !== "production" && !env.MAIL_API_TOKEN) {
    return { kind: "accepted", providerStatus: 202, providerReference: "mock-provider" };
  }
  if (!env.MAIL_API_URL || !env.MAIL_API_TOKEN || !env.MAIL_API_FROM) {
    return failure("CONFIGURATION", "Mail integration is not configured", false, false);
  }
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(message.idempotencyKey)) {
    return failure("CONFIGURATION", "Invalid mail idempotency key", false, false);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MAIL_API_TOKEN}`,
      "Idempotency-Key": message.idempotencyKey
    };
    if (env.MAIL_API_ACCESS_CLIENT_ID && env.MAIL_API_ACCESS_CLIENT_SECRET) {
      headers["CF-Access-Client-Id"] = env.MAIL_API_ACCESS_CLIENT_ID;
      headers["CF-Access-Client-Secret"] = env.MAIL_API_ACCESS_CLIENT_SECRET;
    }
    let response: Response;
    try {
      response = await fetcher(`${env.MAIL_API_URL.replace(/\/$/, "")}/internal/api/v1/messages/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: env.MAIL_API_FROM,
          to: [message.to],
          cc: [],
          bcc: [],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {})
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return failure("PROVIDER_TIMEOUT", "Mail provider request timed out", true, true);
      }
      if (error instanceof Error && error.name === "AbortError") {
        return failure("PROVIDER_TIMEOUT", "Mail provider request timed out", true, true);
      }
      if (error instanceof Error) {
        return failure("PROVIDER_UNAVAILABLE", "Mail provider was unavailable", true, true);
      }
      throw error;
    }
    if (!response.ok) {
      const category = response.status === 429
        ? "PROVIDER_RATE_LIMIT"
        : response.status >= 500
          ? "PROVIDER_UNAVAILABLE"
          : response.status === 401 || response.status === 403
            ? "PROVIDER_AUTH"
            : "PROVIDER_VALIDATION";
      return failure(category, `Mail provider rejected the request (${response.status})`, response.status === 429 || response.status >= 500, false, response.status);
    }
    let reference: string | null = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        reference = providerReference(await response.json());
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    return { kind: "accepted", providerStatus: response.status, providerReference: reference };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMail(
  env: MailEnvironment,
  message: MailMessage,
  fetcher: typeof fetch = fetch
): Promise<{ accepted: boolean; providerStatus: number }> {
  const result = await sendMailDetailed(env, message, fetcher);
  if (result.kind === "failed" && result.category === "CONFIGURATION") throw new Error(result.safeMessage);
  return { accepted: result.kind === "accepted", providerStatus: result.providerStatus };
}
