# MemoNuvia.com

Personalized photo slate e-commerce built with **Node.js (Express)**, **Supabase**, **Printify**, and **Stripe**.

Site language: **English**  
Design: warm cream, powder pink, burgundy — illusion slate products as the visual focus.

## Quick start

```bash
cd Memonuvia.com
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without API keys the store runs in **demo mode**:
- Local product catalog
- Local photo uploads (`/uploads`)
- Orders stored in memory
- Checkout marks orders paid and opens the success page (no Stripe redirect)
- `/admin` is open in development when Supabase is not configured

## Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (browser auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (orders, storage) |
| `PRINTIFY_API_KEY` | Printify API token |
| `PRINTIFY_SHOP_ID` | Target Printify shop |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `SITE_URL` | Public site URL (callbacks) |

## Supabase setup

Project for MemoNuvia: `bxmdcyidpqtoshdwpqmn`

1. Put keys in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`)
   - `SUPABASE_SECRET_KEY` (`sb_secret_…`) — required for admin writes & seeding
2. Run these SQL migrations in order (Dashboard → [SQL Editor](https://supabase.com/dashboard/project/bxmdcyidpqtoshdwpqmn/sql/new)):
   - `supabase/migrations/20260322120000_init_schema.sql`
   - `supabase/migrations/20260322140000_platform_hardening.sql` (profiles addresses, personalizations, fulfillment retry, webhook idempotency, realtime)
3. Enable **Email** and **Google** under Authentication.
4. Redirect URLs: `http://localhost:3000/auth/callback` and your production `/auth/callback`.
5. `npm run verify:supabase` then `node scripts/apply-hardening-migration.js` then `npm run seed`.
6. Promote admins via `ADMIN_EMAILS` or set `profiles.role = 'admin'`.

## Printify setup

1. Create a Printify store and API token.
2. Set `PRINTIFY_API_KEY` and `PRINTIFY_SHOP_ID`.
3. Map each catalog product’s `printify_product_id` / `printify_variant_id` in `data/catalog.js` (or sync into the `products` table).
4. Paid orders call Printify `POST /shops/{id}/orders.json` automatically.

## Stripe setup

1. Create products or use Checkout Sessions (already implemented).
2. Set secret + publishable keys.
3. Webhook endpoint: `POST /api/webhooks/stripe` → event `checkout.session.completed`.
4. On payment success the order is marked paid and pushed to Printify.

## Main routes

| Path | Description |
|---|---|
| `/` | Homepage (11 sections) |
| `/shop` | Product grid |
| `/personalize/:slug` | Photo + text personalization |
| `/checkout` | Address + Stripe payment |
| `/track` | Order tracking |
| `/auth` | Google / email sign-in |
| `/account` | Profile, addresses, order history (cross-device) |
| `/admin` | Orders dashboard + realtime |
| `/admin/products` | Printify sync & product pricing |
| `/admin/orders/:id` | Personalization review + photo download |

## Architecture

```
server.js
config/
routes/          pages + REST API
services/        supabase, printify, stripe, orders
middleware/      auth (persistent session via cookie + Supabase)
data/catalog.js  local / enrichment catalog
views/           EJS storefront + admin
public/          CSS, JS, design images
supabase/migrations/
```

## Order flow

1. Customer personalizes product (photo upload + names).
2. Draft order is created in Supabase (or memory in demo).
3. Stripe Checkout collects payment.
4. Webhook / demo fulfillment marks order **paid**.
5. Order is sent to **Printify** and visible in **Admin**.

## Scripts

- `npm run dev` — start with `--watch`
- `npm start` — production start
