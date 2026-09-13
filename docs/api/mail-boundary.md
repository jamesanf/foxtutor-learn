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
  "text": "Example",
  "replyTo": "james@foxtutor.org"
}
```

Phase 4 notification delivery may additionally include an escaped `html`
field and a configured `replyTo` address. The plain-text `text` field remains required. Learn passes one stable
`Idempotency-Key` for the logical notification, including timeout recovery; it
does not create a new provider key for each HTTP attempt. A successful Fox
Mail response may include a provider/message reference, which Learn stores as
operational metadata.

Production Learn notifications use `james@foxtutor.org` as `replyTo` so a
recipient's normal reply reaches the same support address shown in the report
body. This is a sender-consistency and engagement improvement; it does not
control Brevo's return path, tracking links, unsubscribe headers or Gmail
placement.

The bearer token is Fox Mail's `INTERNAL_API_TOKEN`, not a Cloudflare or Google credential. Optional `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers support a separately configured Cloudflare Access Service Auth policy. The token is never sent to the browser or logged. Requests time out after eight seconds, and non-production environments use an explicit mock response when no token is configured.

Fox Mail source confirms that `INTERNAL_API_TOKEN` is the bearer secret owned
by the Fox Mail Worker. The Learn Worker must receive the same value only as
the secret binding `MAIL_API_TOKEN`; it must never be committed, logged,
returned to a browser or pasted into chat. The live endpoint redirects unauthenticated callers to Cloudflare Access.
The configured Learn integration has reached Fox Mail in production and
received structured validation responses. A first authenticated report-send
attempt was rejected as `invalid_recipient`; Learn production data contained
the correct recipient, and the root cause was a Learn notification reload
query that omitted the joined recipient email. That query has been corrected,
but successful real-recipient delivery still requires a controlled re-test.
