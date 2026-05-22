# Quotatain — Task Tracker

Strike off tasks as work completes. MVP ships first; V2 follows.

**Scale assumption:** Single company (demo) → 10–50 companies (initial users) → 500 (scale, future).

---

## MVP

### 0. Pre-Build Setup

- [ ] Register on Apollo.io → get free API key (Settings → Integrations → API Keys)
- [ ] Register on Tofler.in → get API access (India company financials from MCA21)
- [ ] Register on Crunchbase → get Basic API key (funding data)
- [ ] Register on BuiltWith → get API key (tech stack detection)
- [ ] Register on NewsAPI.org → get free API key (100 req/day free tier)
- [ ] Create Google Cloud project → enable Custom Search API + OAuth credentials → add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to web `.env.local`
- [ ] Create Anthropic account → get Claude API key
- [ ] Create Sentry project (free tier) → get DSN
- [ ] Create Resend account (free tier) → for auth emails
- [ ] Set up Supabase project (PostgreSQL, AP South Singapore region) → run `pnpm db:migrate` once `DATABASE_URL` is set
- [ ] Set up Upstash Redis (AP South region) → set `REDIS_URL`
- [ ] Set up Cloudflare R2 bucket (file storage)
- [ ] Create GitHub repository + branch protection rules
- [ ] Set up secrets management (`.env.local` for dev, Doppler/Railway env for prod)

---

### 1. Project Scaffold & Infrastructure

- [x] Init Next.js 16 project (App Router, TypeScript, Tailwind CSS)
- [x] Init Fastify API server (separate process, TypeScript)
- [x] Configure monorepo structure (`apps/web`, `apps/api`, `packages/shared`, `packages/database`, `packages/queue`)
- [x] Set up Prisma schema (workspaces, users, runs, companies, product_profiles, integrations)
- [x] Add `googleId` + `avatarUrl` fields to User model; regenerate Prisma client
- [ ] Run initial DB migration (`pnpm db:migrate` — needs `DATABASE_URL`)
- [x] Set up BullMQ + Redis connection (`packages/queue`)
- [ ] Configure S3/R2 client for file uploads
- [x] Set up Pino structured logging (Fastify built-in, pino-pretty in dev)
- [ ] Set up Sentry error tracking (web + API)
- [x] TypeScript strict mode configured across all packages
- [x] Per-package `tsconfig.json` for `shared`, `database`, `queue`, `api`, `web` — all typecheck clean
- [ ] Set up Vitest for unit tests
- [ ] Set up Playwright for E2E tests
- [ ] Configure GitHub Actions CI pipeline (typecheck → lint → unit tests → build)
- [ ] Deploy scaffold to Railway/Render (staging environment)

---

### 2. Authentication & Teams

- [x] Email + password signup (`POST /api/auth/register` — bcrypt hash, auto-creates workspace + ADMIN user)
- [x] Email + password login (`POST /api/auth/login` — bcrypt verify, returns 7-day JWT)
- [x] NextAuth.js v4 Credentials provider wired to API login endpoint
- [x] Signup page (`/signup`) — name, email, password; calls register then auto-signs in
- [x] Login page (`/login`) — email + password form with error handling
- [x] Workspace creation on first signup (auto-named from user's name/email)
- [x] Role model: `ADMIN`, `HEAD_OF_SALES`, `AE`, `SDR` (Prisma enum + middleware)
- [x] Auth middleware on all API routes (`requireAuth`, `requireRole`)
- [x] Row-level security: all queries scoped to `workspaceId` from JWT
- [x] `setApiToken` / `AuthProvider` wires NextAuth session token into every API call
- [x] Next.js middleware protects all routes → redirects to `/login` (includes `/signup` as public)
- [x] Settings page stub (shows user name, email, role; sign-out button)
- [ ] Team invite flow (invite by email → one-time link → join existing workspace)
- [ ] Settings page full: workspace name edit, member list, invite button
- [ ] Account page: display name edit
- [ ] Google OAuth / SSO → **V2**

---

### 3. Data Provider Adapters

Each adapter implements `CompanyDataProvider` interface: `fetch(domain) → ProviderResult | null`.

- [ ] **agent.ai adapter** — company research endpoint, parse response, confidence scoring
- [x] **Apollo.io adapter** — `/organizations/enrich` by domain, field mapping, funding stage detection
- [x] **Tofler.in adapter** — Indian company financials, director list, MCA data (CIN, paid-up capital, revenue, net profit)
- [x] **NSE adapter** — stock price, symbol resolution via autocomplete endpoint
- [x] **Crunchbase adapter** — funding rounds, investors, funding stage
- [x] **BuiltWith adapter** — tech stack by domain, category mapping (CRM, ATS, HRIS, ERP, etc.)
- [x] **NewsAPI adapter** — top 8 articles in last 90 days by company name
- [ ] **Economic Times RSS adapter** — parse ET RSS, filter by company name
- [ ] **Mint RSS adapter** — same as ET
- [ ] **AmbitionBox scraper** — overall rating, WLB, management score, review snippets (attrition signal source)
- [ ] **Glassdoor India scraper** — rating + review themes (fallback to AmbitionBox if blocked)
- [ ] **Job postings adapter** — aggregate open roles by domain (Naukri public search + Indeed India + LinkedIn public)
- [ ] **Playwright website crawler** — headless crawl of About, Careers, Pricing pages; extract text
- [x] **Provider merger** — SOURCE_PRIORITY map, ARRAY_MERGE_FIELDS, weighted confidence score
- [x] **Circuit breaker** — 5 failures/30s → open for 60s; immediate open on RATE_LIMITED error
- [ ] **Fixture library** — 10 Indian company fixtures for tests

---

### 4. Company Research Pipeline

- [x] Domain resolution service (Google Custom Search → fallback)
- [x] Research job handler (BullMQ Worker, `company:enrich` queue, configurable concurrency)
- [x] Parallel provider fetch orchestrator (`Promise.allSettled` + `withCircuitBreaker` + per-provider timeout)
- [ ] Attrition risk scorer (point-based: AmbitionBox rating + Glassdoor + headcount delta + job posting pattern)
- [ ] Fresher hiring % calculator (filter open roles for entry-level keywords)
- [x] Buying signal detector (funding recency, leadership change, hiring spike, M&A, expansion signals)
- [x] AI synthesis prompt (Claude claude-sonnet-4-6, India focus, no-hallucination system prompt)
- [x] Zod schema validation for all Claude outputs — retries up to 3× on schema fail; `buildFallbackCard()` on persistent failure
- [x] Confidence score (source quality × recency × cross-validation)
- [x] Card assembly + DB write (`companies` table, `card` + `fitment` JSONB columns)
- [x] SSE progress stream — DB poll every 1.5s, sends `company_complete` / `run_complete` events
- [x] Run completion handler — marks run `COMPLETED` or `PARTIAL` when all companies finish
- [ ] Email notification on run complete (Resend)

---

### 5. Feature 1 — Company List Upload & Research

**Upload Flow:**
- [x] File upload UI (react-dropzone: CSV, XLSX, XLS)
- [x] Client-side CSV parse (papaparse)
- [x] Column auto-detection (fuzzy match on "Company", "Name", "Domain", "Website", "URL")
- [ ] Manual column mapping UI (dropdowns if auto-detect confidence < 80%)
- [x] Paste mode (textarea: one company/domain per line)
- [x] Pre-submit validation: dedup count, row count, warnings
- [x] Run name input
- [x] Research depth selector (Quick / Standard / Deep)
- [x] Product selector (which product to score against)
- [x] `POST /api/runs` — create run + enqueue all company jobs
- [x] Input sanitisation: SSRF protection, CSV formula injection stripping, domain normalization, dedup

**Progress View:**
- [x] SSE `EventSource` connection on run creation
- [x] Per-company progress list (name + status badge: pending / processing / done / failed)
- [x] Overall progress bar (completed / total)
- [ ] Estimated time remaining
- [ ] "Notify me when done" option (email via Resend)

**Results View:**
- [x] Summary table: Company · Industry · Headcount · Funding Stage · Attrition Risk · Fitment Score · Buying Signals
- [x] Sort by fitment score / headcount / name
- [x] Filter by attrition risk
- [ ] Full filter panel: Industry, Headcount range, Funding Stage, Fitment Score range
- [x] Expand row → Intelligence Card (all sections rendered via `CompanyCard` component)
- [x] All card sections: Identity · Scale · Funding · Hiring · Tech Stack · Buying Signals · Pain Points · Engagement · AI Talking Points · Contact Recommendation · Confidence score
- [ ] Data freshness indicator per card
- [ ] "Run Again" button (re-research single company with fresh data)
- [x] Export to CSV (`GET /api/export/runs/:id`, formula-injection-safe)
- [ ] Export to Excel (.xlsx)
- [ ] Copy card as formatted text (clipboard)

---

### 6. Feature 2 — Product Profile & Fitment Scoring

**Product Profile Setup:**
- [x] Product profile list page (all products in workspace)
- [x] Create product profile: name + description textarea
- [ ] File upload for product description (PDF, DOCX, TXT) — server-side parse
- [x] Claude extraction of product profile fields (capabilities, problems solved, ICP, personas, competitors, required tech)
- [ ] Review extracted profile UI: show Claude-parsed fields with inline edits
- [ ] ICP criteria form: target industries (multi-select), headcount range, funding stages, geo
- [ ] Fitment dimension weight sliders (6 sliders, locked to sum to 100%)
- [ ] Buyer persona definition form: primary, secondary, technical evaluator titles
- [x] Save / update / delete product profiles

**Fitment Scoring Engine:**
- [x] Industry fit scorer (exact match 100, sub-industry 80, adjacent 40, no match 10)
- [x] Size/headcount fit scorer (in range 100, ±25% → 70, ±50% → 40, outside 10)
- [x] Tech stack fit scorer (competitor detected 90, compatible 75, no relevant tech 35)
- [x] Pain point fit scorer (Claude Haiku AI scoring; keyword fallback)
- [x] Buying signal fit scorer (weight-based accumulation from card signals)
- [x] Engagement fit scorer (pricing page visits, form completed, CRM activity)
- [x] Weighted composite score (`DEFAULT_DIMENSION_WEIGHTS`, user-overridable)
- [x] Fitment score stored per company per run
- [x] Score breakdown per dimension (score + evidence string)

**Contact Recommendation (Role-Based):**
- [x] Persona mapping: product category → recommended buyer roles
- [ ] Role signals from job postings + MCA directors
- [x] Economic Buyer, Champion, Technical Evaluator with confidence + rationale
- [x] AI-generated outreach angle per role (Claude Haiku)

---

### 7. Team Dashboard

- [x] Dashboard page stub (visible to all roles; head_of_sales content placeholder)
- [ ] Total companies researched (this week / month / all time) — workspace aggregate
- [ ] Research runs table: all runs by all reps, sortable by date/rep/product
- [ ] Rep activity table: runs/week, companies researched, avg fitment score per rep
- [ ] Buying signals feed: aggregate top signals across all runs (last 7 days)
- [ ] Filter controls: by rep, by product, by date range
- [ ] Drill-down: click rep row → see their runs
- [ ] Personal view for AE/SDR: own runs only (managers see all)

---

### 8. CRM Integrations (Read-Only MVP)

**Salesforce:**
- [ ] Salesforce OAuth 2.0 flow (Web Server Flow)
- [ ] Store + refresh access tokens (encrypted)
- [ ] Account lookup by domain → pull: name, industry, headcount, last activity, deal stage
- [ ] Activity history pull: last 20 activities (calls, emails, meetings)
- [ ] Open opportunity pull
- [ ] Display engagement data on company card
- [ ] "In your CRM" / "Not in CRM" flag

**HubSpot:**
- [ ] HubSpot OAuth 2.0 flow
- [ ] Store + refresh access tokens (encrypted)
- [ ] Company lookup by domain → pull: all CRM fields
- [ ] Engagement history (emails, meetings, calls)
- [ ] Deal stage pull
- [ ] Display on company card (same UI as Salesforce)

---

### 9. Testing

- [ ] Unit tests: fitment scoring engine (all 6 dimensions, edge cases)
- [ ] Unit tests: attrition risk scorer
- [ ] Unit tests: buying signal detector
- [ ] Unit tests: fresher hiring % calculator
- [ ] Unit tests: domain resolution + dedup logic
- [ ] Unit tests: provider merger (priority + confidence scoring)
- [ ] Unit tests: CSV/Excel parser (including formula injection, BOM, encoding)
- [ ] Unit tests: Zod schema validation for AI output
- [ ] Integration tests: research pipeline (mocked adapters, real BullMQ/Redis)
- [ ] Integration tests: Salesforce adapter (mocked Salesforce API)
- [ ] Integration tests: HubSpot adapter (mocked HubSpot API)
- [ ] Integration tests: all provider adapters (fixture responses)
- [ ] AI eval suite: 10 Indian company golden dataset → run synthesis → assert schema valid + confidence ≥ 70% + no null hallucinations
- [ ] E2E test: upload CSV → run research → view card (single company, Standard depth)
- [ ] E2E test: create product profile → view fitment score on card
- [ ] E2E test: export to CSV
- [ ] E2E test: Salesforce connect → "in CRM" flag on company
- [ ] Security test: SSRF (domain = localhost, 192.168.x, 169.254.x) → rejected
- [ ] Security test: CSV formula injection → stripped in export
- [ ] Security test: unauthenticated API request → 401
- [ ] Security test: cross-workspace data access → 403
- [ ] Performance test (k6): 50-company Standard run → assert completes < 5 min

---

### 10. Polish & Launch Prep

- [ ] Error states: all API errors surface user-friendly messages (not "500 Internal Server Error")
- [ ] Empty states: no runs yet, no products yet, company not found
- [ ] Loading skeletons on all data-heavy views
- [ ] Mobile-responsive layout (at minimum: usable on tablet)
- [ ] Onboarding flow: first-time user → create product profile → try with one company
- [ ] Email notifications: run complete (Resend)
- [ ] Rate limiting: max 20 runs/hour per workspace (MVP limit)
- [ ] Company limit: max 50 companies/run enforced (MVP limit)
- [ ] Favicon, page titles, meta tags
- [ ] Privacy policy + ToS pages (basic)
- [ ] Production deployment (Railway/Render)
- [ ] Staging vs production environment split
- [ ] Smoke test checklist after each deploy

---

## V2

### Features

- [ ] Google OAuth / SSO (replace or supplement email+password)
- [ ] Intent data pipeline: GA4 + GTM + Clearbit Reveal (IP-to-company) → first-party intent signals on card
- [ ] Cloudflare Worker intent middleware (IP enrichment beacon on customer website)
- [ ] Named contact recommendation (Apollo paid / Lusha) — specific person name + LinkedIn URL
- [ ] CRM push: write enriched account data back to Salesforce + HubSpot
- [ ] AI-generated email sequence per contact (3-touch sequence based on card data)
- [ ] Saved monitoring lists (auto re-research weekly, diff changes)
- [ ] Naukri.com job posting API partnership (InfoEdge internal)
- [ ] PitchBook integration (deep India startup financials)
- [ ] HG Insights integration (deep technographic data)
- [ ] LinkedIn Sales Navigator API (official, requires partnership)
- [ ] Third-party intent data: Bombora or G2 Buyer Intent
- [ ] MCA21 official API (register now, use in V2 when approved)
- [ ] Chrome extension (research any company from any page)
- [ ] Customer-facing API (for programmatic access)
- [ ] Webhook (generic outbound — push events to any system)

### Scale

- [ ] Increase run limit to 500 companies
- [ ] Worker horizontal scaling (separate worker containers)
- [ ] PostgreSQL read replica for dashboard queries
- [ ] Apollo.io paid plan (when volume exceeds free tier)
- [ ] CDN for static assets
- [ ] Database query optimization + indexes audit

### Integrations

- [ ] Pipedrive CRM integration
- [ ] Zoho CRM integration
- [ ] Outreach / Salesloft integration (engagement data pull)
- [ ] Calendly integration (meeting history per company)
- [ ] Slack notifications (run complete, new buying signal detected)

### Compliance & Global

- [ ] PDPB (India Personal Data Protection Bill) compliance review + legal sign-off
- [ ] GDPR compliance for EU users
- [ ] US market launch: add US data sources (SEC EDGAR, US state registries)
- [ ] Multi-language support (Hindi for India market)

### Monetisation

- [ ] Subscription plan enforcement (free tier limits vs paid tier)
- [ ] Stripe billing integration
- [ ] Usage-based credit system (per-company enrichment cost tracking)
- [ ] Team seat-based pricing
- [ ] Billing portal (upgrade, invoice download)

---

*Strike off items as they complete. Update alongside SPEC.md when scope changes.*
