export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailEnvironment {
  MAIL_API_URL?: string;
  MAIL_API_TOKEN?: string;
  ENVIRONMENT?: string;
}

export async function sendMail(
  env: MailEnvironment,
  message: MailMessage,
  fetcher: typeof fetch = fetch
): Promise<{ accepted: boolean; providerStatus: number }> {
  if (env.ENVIRONMENT !== "production" && !env.MAIL_API_TOKEN) return { accepted: true, providerStatus: 202 };
  if (!env.MAIL_API_URL || !env.MAIL_API_TOKEN) throw new Error("Mail integration is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(`${env.MAIL_API_URL.replace(/\/$/, "")}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.MAIL_API_TOKEN}` },
      body: JSON.stringify(message),
      signal: controller.signal
    });
    return { accepted: response.ok, providerStatus: response.status };
  } finally {
    clearTimeout(timeout);
  }
}
