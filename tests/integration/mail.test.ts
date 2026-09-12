import { describe, expect, it } from "vitest";
import { sendMail } from "../../src/mail/client";

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
});
