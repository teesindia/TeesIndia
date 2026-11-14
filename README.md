# TeesIndia 

TeesIndia is a full-stack e-commerce storefront for apparel and merchandise, designed to combine a polished shopping experience with a robust admin workflow. The project includes a storefront built with Next.js, a Cloudflare Worker-based API, Prisma data models, and Cloudflare D1/R2 infrastructure for storage and persistence.

## Overview

This monorepo contains:

- Frontend: Next.js 16 storefront and admin dashboard
- Backend: Express app running on Cloudflare Workers
- Database: Prisma schema with Cloudflare D1 SQLite
- Asset storage: Cloudflare R2
- Payments: Razorpay integration with cash-on-delivery support
- Auth: JWT-based customer and admin authentication

## Key Features

- Product catalog with category and collection pages
- Search, filters, and product detail views
- Cart and checkout flow
- Secure customer authentication and account experience
- Admin dashboard for managing products and orders
- Razorpay payment integration
- Image uploads stored in Cloudflare R2
- Blog, FAQs, shipping, and return policy pages
- Cloudflare-ready deployment setup

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, custom UI components |
| State | Zustand |
| API client | Axios |
| Backend | Express.js on Cloudflare Workers |
| Database | Prisma + Cloudflare D1 |
| Storage | Cloudflare R2 |
| Auth | JWT |
| Payments | Razorpay |
| Email | Resend |

## Repository Structure

```bash
teesindia/
├── backend/                  # API, Prisma schema, migrations, Cloudflare config
│   ├── src/
│   │   ├── routes/           # Auth, products, cart, orders, admin APIs
│   │   ├── middlewares/      # Auth and protection middleware
│   │   ├── lib/              # Prisma, mailer, object storage, helpers
│   │   ├── emails/           # Email templates
│   │   ├── index.ts          # Express app setup
│   │   └── worker.ts         # Cloudflare Workers entry point
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── migrations/           # D1 migration SQL
│   ├── wrangler.toml         # Cloudflare Worker configuration
│   ├── .dev.vars.example     # Example local env file
│   └── package.json
├── frontend/                 # Next.js storefront and admin UI
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
├── Makefile                  # Local dev runner
├── README.md                 # Project documentation
└── package.json              # Root workspace metadata (if used)
```

## Prerequisites

Before you begin, make sure you have:

- Node.js 20 LTS or newer
- npm
- A Cloudflare account with Workers, D1, and R2 enabled
- A Razorpay account for payment testing

## Quick Start

### 1) Install dependencies

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

### 2) Set up Cloudflare resources

From the `backend` folder:

```bash
cd backend
npx wrangler d1 create teesindia
npx wrangler r2 bucket create teesindia-assets
cp .dev.vars.example .dev.vars
```

Then update:

- `backend/wrangler.toml` with the D1 database ID returned by Wrangler
- `backend/.dev.vars` with your local secrets and URLs
- `R2_PUBLIC_URL` to your Cloudflare R2 public endpoint

### 3) Configure environment variables

Example required values live in `backend/.dev.vars.example`:

```bash
JWT_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-another-long-random-secret"
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"
R2_PUBLIC_URL="https://your-public-r2-domain.example"
RESEND_API_KEY=""
RESEND_FROM="TEESINDIA <orders@your-verified-domain.example>"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
REVALIDATE_SECRET=""
FRONTEND_URL="http://localhost:3000"
```

### 4) Prepare the database

```bash
cd backend
npm run db:generate
npm run db:migration:generate
npm run db:local
npm run db:seed
```

This applies D1 migrations locally and loads sample data used during development.

### 5) Start the app

From the repo root:

```bash
make dev
```

This starts:

- Backend API: `http://localhost:5001`
- Frontend app: `http://localhost:3000`

You can also run them manually:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Default Admin Account

After seeding the database, the default admin credentials are:

- Email: `admin@teesindia.com`
- Password: `admin123`

Change this immediately in a real environment.

## Razorpay Setup

1. Create an account at [Razorpay](https://razorpay.com)
2. Generate test keys from the dashboard
3. Add the values to your backend environment:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` in the frontend environment if needed by the storefront checkout flow

## Useful Scripts

### Backend

```bash
cd backend
npm run dev
npm run build
npm run cf:deploy
npm run db:local
npm run db:remote
npm run db:seed
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
npm run deploy
```

## Deployment Notes

For production deployment:

- Deploy the backend with Cloudflare Workers
- Set secrets through `wrangler secret put`
- Run database migrations on the remote D1 database
- Set frontend API URLs to the deployed worker endpoint
- Validate the R2 public URL and asset access configuration

Important: D1 is SQLite-based, so transactional guarantees differ from a traditional relational database. Review high-risk write flows before relying on the system for production-critical order processing.

## Development Notes

- The app is structured as a monorepo with a separate API and storefront
- The root `Makefile` is intended for local dev convenience
- The backend and frontend are configured independently and can be developed in parallel

## License

This project is intended for internal or commercial use as defined by the repository owner. If you are contributing or deploying it in a production context, confirm the licensing requirements before distribution.
