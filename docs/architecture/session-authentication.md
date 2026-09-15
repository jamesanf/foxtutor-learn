# Learn session authentication

FoxTutor Learn keeps its application session in D1-backed `learn_session` and
`learn_csrf` cookies. The upstream identity provider may still authenticate
the browser after the application session is deleted, so logout also sets a
short-lived `learn_signed_out` marker.

The marker prevents the normal request path from immediately provisioning a
new Learn session after the logout redirect. The browser receives a signed-out
page with an explicit `Sign in again` link. Following that link uses
`/learn?resume=1`, provisions a fresh application session, and clears the
marker. Logout remains a CSRF-protected POST and deletes all D1 sessions for
the user before clearing the session cookies.
