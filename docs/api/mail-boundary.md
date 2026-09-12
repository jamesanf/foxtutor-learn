# Fox Mail boundary

Learn must not implement Gmail OAuth, Brevo SMTP, MIME construction or mailbox logic. Those remain authoritative in Fox Mail.

The adapter in `src/mail/client.ts` sends a server-to-server JSON request to:

```text
POST https://mail.foxtutor.org/internal/api/v1/messages/send
Authorization: Bearer <Fox Mail internal API token>
Idempotency-Key: <stable operation key>
Content-Type: application/json
```

The Phase 1 adapter payload is:

```json
{
  "from": "hello@foxtutor.org",
  "to": ["admin@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "Example",
  "text": "Example"
}
```

The bearer token is Fox Mail's `INTERNAL_API_TOKEN`, not a Cloudflare or Google credential. Optional `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers support a separately configured Cloudflare Access Service Auth policy. The token is never sent to the browser or logged. Requests time out after eight seconds, and non-production environments use an explicit mock response when no token is configured.

The live endpoint currently redirects unauthenticated callers to Cloudflare Access. A controlled machine-auth path must therefore be configured before production sends can be claimed. No real recipient message was sent during this remediation pass.
