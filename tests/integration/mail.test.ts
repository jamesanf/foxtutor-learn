import { describe, expect, it } from "vitest";
import { sendMail, sendMailDetailed } from "../../src/mail/client";

describe("mail boundary", () => {
  it("uses a mock-safe path outside production", async () => {
    await expect(sendMail({ ENVIRONMENT: "test" }, {
      to: "admin@example.com",
      subject: "test",
      text: "test",
      idempotencyKey: "learn-test-message-1"
    })).resolves.toEqual({ accepted: true, providerStatus: 202 });
  });

  it("sends through the documented server-side Fox Mail adapter", async () => {
    const calls: Request[] = [];
    const result = await sendMail(
      {
        ENVIRONMENT: "production",
        MAIL_API_URL: "https://mail.foxtutor.org",
        MAIL_API_TOKEN: "test-token",
        MAIL_API_FROM: "hello@foxtutor.org"
      },
      { to: "admin@example.com", subject: "test", text: "test", idempotencyKey: "learn-test-message-1" },
      async (input, init) => {
        calls.push(new Request(input, init));
        return new Response(null, { status: 202 });
      }
    );
    expect(result.accepted).toBe(true);
    expect(calls[0].url).toBe("https://mail.foxtutor.org/internal/api/v1/messages/send");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer test-token");
    expect(calls[0].headers.get("Idempotency-Key")).toBe("learn-test-message-1");
    await expect(calls[0].json()).resolves.toMatchObject({
      from: "hello@foxtutor.org",
      to: ["admin@example.com"],
      subject: "test",
      text: "test"
    });
  });

  it("captures provider references and sends the typed HTML payload", async () => {
    const calls: Request[] = [];
    const result = await sendMailDetailed(
      {
        ENVIRONMENT: "production",
        MAIL_API_URL: "https://mail.foxtutor.org",
        MAIL_API_TOKEN: "test-token",
        MAIL_API_FROM: "hello@foxtutor.org",
        MAIL_API_REPLY_TO: "james@foxtutor.org"
      },
      { to: "student@example.com", fromName: "FoxTutor", subject: "Report", text: "Report", html: "<p>Report</p>", idempotencyKey: "notification-test-message-1", replyTo: "james@foxtutor.org" },
      async (input, init) => {
        calls.push(new Request(input, init));
        return new Response(JSON.stringify({ id: "provider-1" }), { status: 202, headers: { "Content-Type": "application/json" } });
      }
    );
    expect(result).toEqual({ kind: "accepted", providerStatus: 202, providerReference: "provider-1" });
    await expect(calls[0].json()).resolves.toMatchObject({
      html: "<p>Report</p>",
      replyTo: "james@foxtutor.org",
      fromName: "FoxTutor",
      to: ["student@example.com"]
    });
  });

  it("allows billing statements to use the dedicated billing sender", async () => {
      const calls: Request[] = [];
      await sendMailDetailed(
        {
          ENVIRONMENT: "production",
          MAIL_API_URL: "https://mail.foxtutor.org",
          MAIL_API_TOKEN: "test-token",
          MAIL_API_FROM: "hello@foxtutor.org",
          MAIL_API_BILLING_FROM: "billing@foxtutor.org"
        },
        {
          to: "student@example.com",
          fromAddress: "billing@foxtutor.org",
          fromName: "FoxTutor Billing",
          subject: "Credit-covered billing statement FT26091504",
          text: "Amount due: £0.00",
          idempotencyKey: "billing-credit-statement-test-1"
        },
        async (input, init) => {
          calls.push(new Request(input, init));
          return new Response(null, { status: 202 });
        }
      );
      await expect(calls[0].json()).resolves.toMatchObject({
        from: "billing@foxtutor.org",
        fromName: "FoxTutor Billing",
        text: "Amount due: £0.00"
    });
  });

  it("classifies a request timeout as unknown rather than a permanent failure", async () => {
    const result = await sendMailDetailed(
      {
        ENVIRONMENT: "production",
        MAIL_API_URL: "https://mail.foxtutor.org",
        MAIL_API_TOKEN: "test-token",
        MAIL_API_FROM: "hello@foxtutor.org"
      },
      { to: "student@example.com", subject: "Reminder", text: "Reminder", idempotencyKey: "notification-test-message-2" },
      async () => {
        throw new Error("network timeout");
      }
    );
    expect(result).toMatchObject({ kind: "failed", category: "PROVIDER_UNAVAILABLE", unknown: true, retryable: true });
  });

  it("retains the provider error code for actionable delivery diagnostics", async () => {
    const result = await sendMailDetailed(
      {
        ENVIRONMENT: "production",
        MAIL_API_URL: "https://mail.foxtutor.org",
        MAIL_API_TOKEN: "test-token",
        MAIL_API_FROM: "hello@foxtutor.org"
      },
      { to: "student@example.com", subject: "Report", text: "Report", idempotencyKey: "notification-test-message-3" },
      async () => new Response(JSON.stringify({ ok: false, error: "identity_not_allowed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    );
    expect(result).toMatchObject({
      kind: "failed",
      category: "PROVIDER_VALIDATION",
      safeMessage: "Mail provider rejected the request (400: identity_not_allowed)"
    });
  });
});
