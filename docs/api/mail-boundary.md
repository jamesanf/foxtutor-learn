# Fox Mail boundary

Learn must not implement Gmail OAuth, Brevo SMTP, MIME construction or mailbox logic. Those remain authoritative in Fox Mail.

The adapter in `src/mail/client.ts` sends a server-to-server JSON request to:

```text
POST https://mail.foxtutor.org/api/send
Authorization: Bearer <secret>
Content-Type: application/json
```

The Phase 1 adapter payload is `{ "to": string, "subject": string, "text": string }`. The token is never sent to the browser or logged. Requests time out after eight seconds. Non-production environments use an explicit mock response when no token is configured. The endpoint contract must be confirmed against the Fox Mail API before enabling production sends.
