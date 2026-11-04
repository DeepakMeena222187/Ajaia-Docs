# Security

## Controls in place

| Area | Control |
|---|---|
| Passwords | scrypt (N=2¹⁷, r=8, p=1, 16-byte salt), constant-time compare, 10–128 chars |
| Sessions | 256-bit random token in an `HttpOnly`, `SameSite=Lax`, `Secure` (`__Host-` prefixed in production) cookie; only its SHA-256 is stored; new token on every login; deleted on logout; other devices signed out on password change; 30-day expiry |
| Account enumeration | Same error and same scrypt work for wrong password and unknown email |
| Brute force | 10 login attempts / 15 min per account; 30 / 15 min per IP where the IP is trustworthy; Postgres-backed so it holds across serverless instances |
| Authorization | Every server action and admin page re-checks the session and role; orders, bookings and forum deletes are scoped to the owner in the SQL itself; admin role only grantable from the shell |
| CSRF | Next.js Server Actions reject cross-origin requests (Origin vs Host); cookies are `SameSite=Lax` |
| XSS | All user content rendered as text by React (no `dangerouslySetInnerHTML`); nonce-based CSP with `strict-dynamic`; image URLs restricted to `https://` |
| SQL injection | Parameterised queries everywhere; the only interpolated SQL fragments are fixed whitelists (sort order, column lists) or integers computed server-side |
| Prices & stock | Cart cookie holds ids and quantities only; prices come from the database at checkout; stock decremented with a conditional `UPDATE … WHERE stock >= qty` inside a transaction; idempotency key stops double orders |
| Open redirect | `?next=` accepts same-site relative paths only |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP; `X-Powered-By` removed |
| Dependencies | Next.js upgraded from 16.3.4 (critical RCE advisories) to 16.4.5; `npm audit --omit=dev` reports 0 vulnerabilities |

## Penetration test (pre-launch)

Run against a production build with real browsers and replayed/tampered requests.

| Attack | Result |
|---|---|
| Read another customer's order by id | Blocked (404) |
| Cancel another customer's order by replaying the cancel request with their id | Blocked |
| Customer or anonymous user replays the admin "change price" request | Blocked |
| Cross-origin (CSRF) replay with an admin's cookie | Blocked |
| Delete another user's forum thread | Blocked |
| Stored XSS in forum title/body (`<script>`, `onerror`, `<svg onload>`) | Rendered as text, nothing executed |
| SQL injection in search, sort, category, page, ids, slugs | No errors, no delays, no data |
| Open redirect via `/login?next=//evil.example` | Blocked |
| Reusing a session cookie after logout | Blocked |
| Negative / huge quantities via URL, tampered cart cookie | Ignored or clamped |
| 4 buyers racing for the last item; double-submitted checkout | Exactly one sale; one order |
| Login brute force | Locked out after 10 attempts per account |
| **Signup flood with spoofed `X-Forwarded-For`** | **Was bypassable when self-hosted → fixed**: forwarding headers are trusted only on Vercel or with `TRUST_PROXY=1`, plus a global sign-up ceiling |

### Round 2 — source-code review findings (all fixed, with regression tests)

| Finding | Fix |
|---|---|
| Open redirect via dot segments (`/login?next=/.//evil.com`) | Redirect target re-checked after URL normalisation |
| Password spraying / CPU exhaustion via many emails (each login = 128 MB scrypt) | Global login limit; at most 2 concurrent hashes per instance, bounded queue |
| One client could exhaust the global sign-up ceiling | Ceiling counts only accounts actually created |
| Anyone could lock a real user out with 10 bad passwords | With a trusted IP, lockout is per (account, IP); a looser per-account ceiling stops distributed guessing |
| IPv6 users could rotate addresses within their /64 | IPv6 rate-limit buckets grouped by /64 |
| Parallel requests could exceed the 3-booking cap | Per-user advisory lock inside a transaction |
| Admin stock save could overwrite stock sold while the form was open | Compare-and-set on the previous stock value |
| `rate_limits` table grew forever | Expired windows pruned automatically |
| Admin edge cases returned 500 (variant on missing plant, giant order totals) | Validated: price capped at ₹1,00,000, order total bounded |

## Known limitations

- No email verification or password-reset flow yet (needs an email provider). Until then, reset a password by setting a new hash from the shell.
- No online payment gateway yet; orders are cash/UPI on delivery.
- Rate limits are per-account and global when the client IP can't be trusted, so a determined attacker can still slow sign-ups for everyone (by design: it fails closed).
- Cash-on-delivery orders reserve stock without payment; a throwaway account can tie up stock (10 orders/hour) until an admin cancels. Add phone/email verification or auto-expiry of unconfirmed orders before heavy traffic.
- The sign-up form says when an email is already registered (account enumeration). Acceptable until email verification exists.

## Reporting

Email the site owner with steps to reproduce. Please don't test against real customers' data.
