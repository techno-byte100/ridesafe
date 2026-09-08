# RideSafe

RideSafe is a school transport management platform for tracking buses in
real time, managing student attendance and pickup/drop-off, handling
parent registration and billing, and giving school admins a single
dashboard to run their fleet.

## Deployment Environments

- **Main Branch**: The `main` branch is deployed via Vercel and represents the stable production application.
- **Testing Branch**: The `testing` branch is deployed via Vercel and is used for testing new feature implementations before they are merged into the stable application.

## Features

- **Real-time bus tracking** with a layered GPS source chain — dedicated
  hardware trackers (Wialon, Katsana) with automatic fallback to the
  driver's mobile phone GPS, shown live on an admin map.
- **Attendance management** — daily roster per route/trip with
  pick-up / drop-off / absent status, corrections, and CSV export.
- **Fleet & route management** — buses, routes, stops, driver
  assignment, with full create/edit/delete for every entity.
- **Student & parent registration** — public self-service sign-up form
  gated behind payment (via [Billplz](https://www.billplz.com)); a
  parent account and student record are created automatically once
  payment is confirmed.
- **Billing** — invoice generation via Bukku, plus the Billplz payment
  flow for registration fees.
- **Driver app** — trip start/stop, student check-in, offline queueing
  of attendance/location updates.
- **Parent app** — live trip view, notifications, ratings, lost & found.
- **Admin console** — users, students, fleet, schedules, maintenance
  logs, announcements, academic calendar, analytics, multi-organisation
  support for Super Admins.
- **Multi-language** — English, Bahasa Malaysia, and Chinese.
- **Emergency alerts**, **overcrowding alerts**, **night-bus curfew
  alerts**, and role-based access control (Admin / School Admin /
  Driver / Parent / Super Admin).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Prisma](https://www.prisma.io) ORM on PostgreSQL
- Redis (pub/sub for live location updates)
- JWT-based auth (`jose`), bcrypt password hashing
- Leaflet / react-leaflet for maps, Framer Motion for UI, Recharts for analytics
- Docker + docker-compose for deployment

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Docker & Docker Compose (for containerized deployment)

### Local development

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, etc.
npm run db:push           # sync Prisma schema to your database
npm run db:seed           # optional — creates test accounts
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

See [`.env.example`](.env.example) for local development and
[`.env.production.example`](.env.production.example) for the full set
used in production (copy to `.env.production` and fill in real values —
`docker-compose.yml` reads from this file via `env_file`).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` / `NEXTAUTH_SECRET` | Auth token signing secrets |
| `WIALON_TOKEN` | Wialon GPS Hosting API access token |
| `KATSANA_CLIENT_ID` / `KATSANA_CLIENT_SECRET` | Katsana fleet tracker API credentials |
| `BUKKU_API_KEY` | Bukku invoicing API key |
| `BILLPLZ_API_KEY` / `BILLPLZ_COLLECTION_ID` / `BILLPLZ_X_SIGNATURE_KEY` | Billplz payment gateway — registration payments run in a built-in mock mode when unset |
| `BILLPLZ_SANDBOX` | `"true"`/`"false"` — use Billplz sandbox vs production API |
| `REGISTRATION_FEE_AMOUNT` | One-time registration fee (RM), defaults to 50 |

### Useful scripts

```bash
npm run dev              # start dev server
npm run build             # production build
npm run start              # run production build
npm run lint                # lint
npm run db:generate        # regenerate Prisma client
npm run db:push             # push schema to database (no migration history)
npm run db:migrate           # apply migrations (production)
npm run db:studio             # open Prisma Studio
npm run db:seed                # seed test accounts
```

### Deployment (Docker)

```bash
cp .env.production.example .env.production   # fill in real values
docker compose build ridesafe
docker compose up -d
```

This starts three containers: `ridesafe-app` (Next.js, port 3500),
`ridesafe-db` (PostgreSQL), and `ridesafe-cache` (Redis). Nginx +
Certbot in front handle the `ridesafe.com.my` / `www.ridesafe.com.my`
domain and SSL (see `setup_ssl.mjs`, kept out of version control since
it embeds server credentials).

## Project structure

```
src/
  app/
    admin/            Admin dashboard (tabbed SPA)
    driver/            Driver app
    parent/              Parent app
    student-form/          Public registration form
    register/mock-pay/       Simulated Billplz checkout (mock mode only)
    api/                       All backend routes (REST-style, Next.js route handlers)
  components/
    admin/                     One component per admin dashboard tab
  lib/
    adapters/                    Wialon / Katsana / Bukku / Billplz integrations
    services/                      Tracking, payment, and registration business logic
    auth.ts, prisma.ts, redis.ts       Core infrastructure
  i18n/                                 en / ms / zh translations
prisma/
  schema.prisma                          Data model
```

## Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | All organisations, global user management |
| `ADMIN` / `SCHOOL_ADMIN` | Single-organisation admin dashboard |
| `DRIVER` | Driver app — trip control, student check-in |
| `PARENT` | Parent app — live tracking, notifications, billing |

## License

Proprietary — all rights reserved.
