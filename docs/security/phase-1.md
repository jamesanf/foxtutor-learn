# Phase 1 security and privacy

## Perimeter and authorization

Cloudflare Access + Google is the perimeter. Application authorization remains in Learn: only an active D1 user is admitted, and the stored role controls admin/student routes. Access identity is not a lesson permission and must not replace the D1 authorization check.

## Session and CSRF

Sessions are opaque random values stored as SHA-256 hashes in D1. The session cookie is `Secure`, `HttpOnly`, `SameSite=Strict`, scoped to `/learn`, and expires after 14 days. The CSRF token is separate, secure, strict and sent to the rendered form; state-changing requests must present it.

## Indexing controls

Every Learn response uses:

```text
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
```

HTML includes the equivalent robots meta tag. Responses are private and non-cacheable. Learn has no sitemap and the public sitemap is not changed. Access must deny unauthenticated and Googlebot-like requests before useful application content is returned.

## Logging

Do not log cookies, Access assertions, session values, CSRF values, tokens, message content or unnecessary pupil data. Structured Worker logs may record safe route/status categories and a request correlation ID in a later operations pass.
