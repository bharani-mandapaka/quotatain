# Quotatain — Claude Context

B2B sales intelligence platform, India-first. MVP target customer: InfoEdge / Naukri.com.

## Monorepo Structure

```
apps/web        Next.js 16 frontend   → deployed on Vercel
apps/api        Fastify backend        → deployed on Railway
packages/
  database      Prisma schema + client (PostgreSQL via Railway Postgres)
  queue         BullMQ + ioredis       (Redis via Upstash — see below)
  shared        Zod types shared between web + api
```

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web app | Vercel   | quotatain-web.vercel.app |
| API     | Railway  | auto-deployed on push to `main` |
| DB      | Railway PostgreSQL | `DATABASE_URL` injected automatically |
| Redis   | Upstash  | ⚠️ **NOT YET CONFIGURED — see below** |

## ⚠️ Pending: Add Upstash Redis URL

The research worker (BullMQ) requires Redis. `REDIS_URL` was removed from Railway
because a placeholder value was causing a connection error storm.

**To enable the research worker:**
1. Go to [upstash.com](https://upstash.com) → Create Database (free tier, AP South region)
2. Copy the `rediss://default:PASSWORD@xxx.upstash.io:6379` URL
3. In Railway → API service → Variables → add `REDIS_URL` = that URL

Until this is done, the API runs fine but background research jobs won't process.

## Railway Start Command

```
./apps/api/node_modules/.bin/prisma migrate deploy --schema ./packages/database/prisma/schema.prisma && node apps/api/dist/index.js
```

Migrations run automatically on every deploy. Safe to run repeatedly.

## Key Technical Decisions

- **tsup bundling**: `@quotatain/*` workspace packages are bundled inline into `apps/api/dist/index.js`
  via `noExternal`. `@prisma/client` is kept external (native binary must load from node_modules).
- **pnpm virtual store**: `@prisma/client` is a direct dep of both `apps/api` and `packages/database`
  so pnpm creates the symlink in `apps/api/node_modules/@prisma/client` for Node resolution.
- **Prisma generate**: runs scoped to `@quotatain/api` during build — patches the shared virtual
  store entry used by both packages.
- **Dark mode**: intentionally disabled in `globals.css` (business app, light only).

## Admin Account

- Email: `saran@quotatain.com`
- Created via signup page (workspace: Quotatain, role: ADMIN)

## Environment Variables

See `railway.env.json` (gitignored) for the full template.
Required for full functionality:
- `DATABASE_URL`     — Railway Postgres (auto-injected)
- `REDIS_URL`        — Upstash Redis (**pending**)
- `JWT_SECRET`       — set in Railway
- `WEB_URL`          — https://quotatain-web.vercel.app
- `ANTHROPIC_API_KEY`— Anthropic console
- `TAVILY_API_KEY`    — app.tavily.com (free 1000/month, powers web-search enrichment)
