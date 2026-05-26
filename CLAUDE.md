# Quotatain — Claude Context

B2B sales intelligence platform, India-first. MVP target customer: InfoEdge / Naukri.com.

## Monorepo Structure

```
apps/web        Next.js 16 frontend   → deployed on Vercel
apps/api        Fastify backend        → deployed on Railway
packages/
  database      Prisma schema + client (PostgreSQL via Railway Postgres)
  queue         BullMQ + ioredis       (Redis via Upstash)
  shared        Zod types shared between web + api
```

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web app | Vercel   | https://quotatain-web.vercel.app |
| API     | Railway  | https://quotatainapi-production.up.railway.app |
| DB      | Railway PostgreSQL | `DATABASE_URL` auto-injected |
| Redis   | Upstash  | willing-katydid-79135.upstash.io (configured ✅) |

Both Vercel and Railway auto-deploy on push to `main`.

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

## Design System (saffron — shipped to production 2026-05-26)

All UI uses design tokens. Never use hardcoded Tailwind colour classes.

| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#D85A28` | Primary actions, active states, highlights |
| `--accent-2` | (darker) | Hover state for accent |
| `--accent-soft` | light orange | Chip backgrounds, selected states |
| `--accent-line` | orange border | Borders on accent containers |
| `--bg` | `#FAFAF8` | Page background (warm off-white) |
| `--surface` | white | Card/panel background |
| `--surface-2` | light gray | Secondary surfaces, row hovers |
| `--ink` | near-black | Primary text |
| `--ink-2` | medium gray | Secondary text |
| `--ink-3` | light gray | Labels, metadata |
| `--ink-4` | very light | Disabled, placeholders |
| `--line` | border | Default border |
| `--line-2` | darker border | Input borders |
| `--positive` / `--positive-soft` | green | Success, high scores |
| `--negative` / `--negative-soft` | red | Errors, risk flags |
| `--warning` / `--warning-soft` | amber | Medium signals, caution |

Shared UI components: `ScorePill`, `FitmentWheel` in `apps/web/components/ui/`.

## Company Intelligence Card (`CompanyCard.tsx`)

Layout order (designed for salespeople, not analysts):
1. **The Hook** — fit score + verdict + `synthesis.buyingSignalSummary` + `synthesis.competitorDisplacementAngle`
2. **Leadership change alert** — banner if `hiring.leadershipChangeFlag`
3. **Who to Contact** — Economic Buyer / Champion / Tech Evaluator persona cards with outreach angle + copy button; `hiring.seniorHiresLast90Days` strip
4. **What to Say** — talking points + `synthesis.fresherHiringInterpretation` + risk flags
5. **Buying Signals** — sorted by weight
6. **Pain Points**
7. **Background** — collapsible (company, scale, funding, hiring detail, tech stack)
8. **CRM Engagement**
9. **Footer** — confidence %, sources, freshness, date

## CORS

`apps/api/src/index.ts` uses an origin function (not a string) that allows:
- `process.env.WEB_URL` (production: `https://quotatain-web.vercel.app`)
- Any `https://quotatain-web*.vercel.app` subdomain (Vercel preview deployments)
- `http://localhost:3000` and `http://localhost:3001`

## E2E Tests (Playwright)

Config: `apps/web/playwright.config.ts`
Tests: `apps/web/e2e/`
Auth session saved to: `apps/web/e2e/.auth/session.json`

Run: `cd apps/web && npx playwright test`

The config sends `x-vercel-protection-bypass: xkCH9Ghmp5NQFDeB1edd8TlLIFBkPiBD` for all requests
so tests can run against password-protected Vercel preview URLs.

19/19 tests passing as of 2026-05-26 (see `TEST_PLAN.md`).

## Accounts

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Primary test | meetbharani91@gmail.com | Password@123 | ADMIN |
| Admin | saran@quotatain.com | Punto@6565 | ADMIN |

## Database

| URL type | Value |
|----------|-------|
| Internal (Railway → API, auto-injected) | `postgresql://postgres:ooidwXTRCediihfjQuXDaZRHpLFivKuc@postgres.railway.internal:5432/railway` |
| **Public TCP proxy (local scripts, resets)** | `postgresql://postgres:ooidwXTRCediihfjQuXDaZRHpLFivKuc@kodama.proxy.rlwy.net:27624/railway` |

Use the public URL for any local Prisma scripts (password resets, seed data, etc.).

## Environment Variables

See `railway.env.json` (gitignored) for the full template.
Required for full functionality:
- `DATABASE_URL`      — Railway Postgres (auto-injected as internal URL)
- `REDIS_URL`         — Upstash Redis (`rediss://default:...@willing-katydid-79135.upstash.io:6379`)
- `JWT_SECRET`        — set in Railway
- `WEB_URL`           — https://quotatain-web.vercel.app
- `ANTHROPIC_API_KEY` — Anthropic console
- `TAVILY_API_KEY`    — app.tavily.com (free 1000/month, powers web-search enrichment)
- `APOLLO_API_KEY`    — contact + company enrichment
- `NEWSAPI_KEY`       — news signals
