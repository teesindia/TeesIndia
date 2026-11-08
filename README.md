# Teesindia E-Commerce — Project Setup Guide

## Prerequisites
- Node.js 18+
- npm
- A Cloudflare account with Workers, D1, and R2 enabled

## Quick Start

### Cloudflare setup (D1 + R2)

The backend now targets Cloudflare Workers. D1 stores products, customers, orders, and other structured records; R2 stores uploaded image files. Create the resources from `backend/`:

```bash
cd backend
npm ci
npx wrangler d1 create teesindia
npx wrangler r2 bucket create teesindia-assets
cp .dev.vars.example .dev.vars
```

Copy the D1 database ID from Wrangler into `backend/wrangler.toml`. Set up a public R2 custom domain (or `r2.dev` URL) and set `R2_PUBLIC_URL` in `wrangler.toml` and `backend/.dev.vars`. Copy `.dev.vars.example` to `.dev.vars`, then set strong JWT secrets and any Razorpay, Resend, and revalidation credentials you use.

Generate and apply the initial schema, then optionally load sample data:

```bash
npm run db:generate
npm run db:migration:generate
npm run db:local
npm run db:seed
cd ../frontend && npm ci
cd ..
make dev
```

The API runs in Wrangler on port 5001; the Next.js frontend runs on port 3000. For a deployed API, use `npm run cf:deploy` from `backend/`, set Worker secrets with `wrangler secret put`, apply D1 migrations with `npm run db:remote`, and set `NEXT_PUBLIC_API_URL` in the frontend to the Worker API URL plus `/api`.

**D1 note:** D1 is SQLite-based and the Prisma D1 adapter does not provide transactional guarantees. The current order and settings flows use Prisma nested writes/transactions, so review those flows carefully before relying on this setup for live purchases. The free tiers are suitable for development and early evaluation; check current Cloudflare quotas and pricing before launch.

**Default development admin (after seeding):**
- Email: `admin@teesindia.com`
- Password: `admin123` (change this immediately)

---

## Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys → Generate Test Key
3. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as Worker secrets
4. Add `Key ID` to `frontend/.env.local` as `NEXT_PUBLIC_RAZORPAY_KEY_ID`

---

## Project Structure

```
teesindia/
├── backend/                 # Express API on Cloudflare Workers
│   ├── src/
│   │   ├── index.ts         # Express app
│   │   ├── worker.ts        # Cloudflare Workers entry point
│   │   ├── routes/          # API routes
│   │   ├── middlewares/     # Auth middleware
│   │   ├── lib/             # Prisma client
│   │   └── lib/             # Prisma client, R2 uploads, email
│   ├── migrations/          # D1 SQL migrations
│   └── prisma/
│       └── schema.prisma    # Database schema
│
└── frontend/                # Next.js App
    └── src/
        ├── app/             # Pages (App Router)
        │   ├── page.tsx     # Home
        │   ├── shop/        # Shop
        │   ├── product/     # Product Detail
        │   ├── checkout/    # Checkout
        │   ├── login/       # Auth
        │   ├── register/    # Auth
        │   ├── admin/       # Admin Dashboard
        │   └── order-success/
        ├── components/
        │   ├── layout/      # Navbar, Footer
        │   ├── cart/        # CartDrawer
        │   └── product/     # ProductCard
        └── lib/
            ├── api.ts       # Axios API client
            └── store.ts     # Zustand state
```

---

## Pages Overview

| Route | Description |
|-------|-------------|
| `/` | Home page (hero, collections, new arrivals) |
| `/shop` | All products with filters and sort |
| `/product/[slug]` | Product detail page |
| `/cart` | Cart (drawer) |
| `/checkout` | Checkout with address + payment |
| `/order-success` | Order confirmation |
| `/login` | Login |
| `/register` | Register |
| `/admin` | Admin dashboard |
| `/admin/products` | Product management |
| `/admin/orders` | Order management |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, CSS Modules |
| State | Zustand (persist) |
| HTTP | Axios (with token refresh) |
| Backend | Express.js, TypeScript |
| Database | MySQL via Prisma ORM |
| Auth | JWT (access + refresh tokens, HTTP-only cookies) |
| Payments | Razorpay + Cash on Delivery |
| Fonts | Space Grotesk + Inter (Google Fonts) |
