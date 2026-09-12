export interface MailMessage {
  to: string;
  subject: string;
  text: string;
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

export async function sendMail(
  env: MailEnvironment,
  message: MailMessage,
  fetcher: typeof fetch = fetch
): Promise<{ accepted: boolean; providerStatus: number }> {
  if (env.ENVIRONMENT !== "production" && !env.MAIL_API_TOKEN) return { accepted: true, providerStatus: 202 };
  if (!env.MAIL_API_URL || !env.MAIL_API_TOKEN || !env.MAIL_API_FROM) throw new Error("Mail integration is not configured");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(message.idempotencyKey)) throw new Error("Invalid mail idempotency key");
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
    const response = await fetcher(`${env.MAIL_API_URL.replace(/\/$/, "")}/internal/api/v1/messages/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env.MAIL_API_FROM,
        to: [message.to],
        cc: [],
        bcc: [],
        subject: message.subject,
        text: message.text
      }),
      signal: controller.signal
    });
    return { accepted: response.ok, providerStatus: response.status };
  } finally {
    clearTimeout(timeout);
  }
}
