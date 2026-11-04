# Greenleaf — plant shop

A full-stack plant e-commerce site: catalogue with varieties, benefits and care guides, accounts, cart, buy-now and checkout, order tracking, a community forum, expert-visit booking, and an admin panel for prices, stock, orders and bookings.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · PostgreSQL (`pg`, plain SQL) · Tailwind CSS 4 · Zod · Vitest.

## Run locally

Requires Node 22.18+ and PostgreSQL 14+.

```bash
cp .env.example .env.local      # then set DATABASE_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev                     # http://localhost:3000
```

## Make yourself the admin

Admin rights can only be granted from the server shell, never through the website:

1. Sign up on the site with your email.
2. Run `npm run make-admin -- you@example.com`.
3. Log out and back in; **Admin dashboard** appears in your account menu.

## Set prices and stock

Seeded prices are placeholders. Go to **Admin → Products & prices**, edit each variety's price (in rupees) and stock, and press **Save**. Changes apply to new orders immediately; existing orders keep the price they were placed at. Untick **On sale** to hide a variety, or use **Edit details** to hide a whole plant, feature it on the home page, or set a photo URL (must be `https://`). Without a photo, each plant shows a built-in illustration.

## Deploy (Vercel + Supabase)

1. Create a Supabase project. Copy the Transaction Pooler URL into `DATABASE_URL` and the Session Pooler URL into `DIRECT_URL`.
2. From your machine, with those set: `npm run db:migrate && npm run db:seed`.
3. Import this repo in Vercel and add `DATABASE_URL` as an environment variable.
4. Deploy, sign up, then run `make-admin` against the production database.

Self-hosting instead: `npm run build && npm start`, put it behind HTTPS, set `TRUST_PROXY=1` only if your proxy overwrites `X-Forwarded-For`, and set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` if you run several instances.

## Tests

```bash
npm test          # unit + database integration tests (uses TEST_DATABASE_URL, wiped each run)
npm run typecheck
npm run lint
```

## Payments

Checkout currently offers **Cash on delivery** and **UPI on delivery**. Online payment (Razorpay/Stripe) is not integrated yet; when added, confirm payment server-side via the provider's signed webhook before marking an order paid.

## Security

See [SECURITY.md](SECURITY.md) for the threat model, the controls in place, and the results of the pre-launch penetration test.
