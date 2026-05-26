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
- **Em dashes**: never use `—` in app UI strings. Use `-` (hyphen), `:`, or rewrite the sentence. AI-generated synthesis content may contain em dashes — that is expected and not fixable at the UI layer.
- **Run progress polling**: KNOWN BUG — the run detail page does not auto-poll while PROCESSING. The progress counter stays at 0% until the user manually refreshes. Fix needed: poll `GET /api/runs/:id` every ~3s while `run.status === 'PROCESSING'`.

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
1. **The Hook** - fit score + verdict + `synthesis.buyingSignalSummary` + `synthesis.competitorDisplacementAngle`
2. **Leadership change alert** - banner if `hiring.leadershipChangeFlag`
3. **Who to Contact** - Economic Buyer / Champion / Tech Evaluator persona cards with outreach angle + copy button; `hiring.seniorHiresLast90Days` strip; LinkedIn search links + URL lookup
4. **What to Say** - talking points + `synthesis.fresherHiringInterpretation` + risk flags
5. **Buying Signals** - sorted by weight
6. **Pain Points**
7. **Background** - collapsible (company, scale, funding, hiring detail, tech stack)
8. **CRM Engagement**
9. **Footer** - confidence %, sources, freshness, date

## Contact Search (Apollo + LinkedIn)

The "Who to Contact" section uses a LinkedIn-first flow (Apollo free tier compatible):

**How it works:**
1. Per-persona LinkedIn deep-search links open `linkedin.com/search/results/people` pre-filtered by `{recommendedTitle} {companyName}`.
2. User finds a person on LinkedIn, pastes their profile URL into the input.
3. Frontend calls `POST /api/companies/:id/contacts/linkedin` with `{ linkedinUrl }`.
4. Backend calls Apollo `/v1/people/match` with the LinkedIn URL — this endpoint works on the free Apollo plan.
5. Contact is returned, deduped by `apolloId`, and persisted to `Company.contacts` (JSON) with a 7-day cache TTL.
6. Email reveal calls Apollo `/v1/people/match` again with `{ id: apolloId }`.

**Why not `/v1/people/search`?**  
Apollo `/v1/people/search` (bulk search by domain + title) requires a paid plan (returns 403 on free tier). This is tracked as a future upgrade in `TASKS.md` (Option 1: Apollo plan upgrade).

**Relevant files:**
- `apps/api/src/modules/contacts/apolloSearch.ts` - `matchPersonByLinkedIn()`, `revealEmail()`, `searchContacts()`, `assignPersona()`
- `apps/api/src/routes/companies.ts` - `POST /:id/contacts/linkedin`, `POST /:id/contacts/:apolloId/reveal`
- `apps/web/lib/api.ts` - `api.companies.matchLinkedIn()`, `api.companies.revealEmail()`
- `apps/web/components/cards/CompanyCard.tsx` - `WhoToContact` component

**Apollo API key** - set as `APOLLO_API_KEY` in Railway. Free tier supports org enrichment and people/match by LinkedIn URL. Paid plan adds bulk people/search.

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

## Production Smoke Test (2026-05-26)

End-to-end run against live prod (Vercel + Railway):

| Check | Result |
|---|---|
| Login | Pass |
| New Run creation | Pass |
| Run queued and processed | Pass — ~50s Standard depth |
| Fitment score (Infosys) | 82 / Strong fit |
| All 6 dimension scores populated | Pass |
| Buying signal summary | Pass |
| Persona cards (CHRO, Head of TA, HR Tech Mgr) | Pass — all high confidence |
| Attrition risk with evidence | Pass — Medium |
| LinkedIn search links | Pass — 3 deep-search buttons with pre-filled title + company |
| LinkedIn URL input + Add button | Pass — renders correctly |
| Buying signals (3) | Pass |
| Talking points (4) | Pass |
| Risk flags | Pass |
| Export CSV button | Pass |
| Run progress live polling | **FAIL** — stays at 0% until page refresh |

**Observations:**
- Standard depth: ~50s for 1 company on Railway (cold-start may add ~10-15s on first run after idle)
- Headcount for large companies (Infosys 323,000) renders in Indian format correctly: `3,23,000`
- Confidence score is ~40-50% when primary source is Tavily web search — expected, surfaced as a footer note
- Raw headcount corruption observed (source returned 9; worker overrode to known public figure and surfaced a risk flag)
- AI-generated synthesis text may contain em dashes — this is Claude output, not app UI code
