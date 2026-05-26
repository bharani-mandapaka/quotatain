# Quotatain — Task Tracker

## ✅ Done

### Design system & UI (shipped 2026-05-26)
- New saffron design system — tokens, globals, Tailwind v4 `@theme inline`
- Sidebar, Topbar, AppShell redesigned
- All pages redesigned: Login, Runs list, New Run, Run detail, Products, Dashboard, Integrations, Settings/Preferences, Settings/Members
- Shared components: `ScorePill`, `FitmentWheel`
- Company card (`CompanyCard.tsx`) restructured for salespeople:
  - Fit score + verdict + why-now (`buyingSignalSummary`) + competitor displacement angle at top
  - Leadership change banner when `leadershipChangeFlag` is set
  - "Who to Contact" hero section (Economic Buyer / Champion / Tech Evaluator) with one-click copy for outreach angle
  - Senior hires last 90 days strip
  - Talking points, buying signals, pain points promoted above background data
  - Background (collapsible), CRM engagement, confidence footer
  - All colours migrated from hardcoded Tailwind to design tokens

### Bug fixes
- CORS: Railway API now allows all `quotatain-web*.vercel.app` preview subdomains
- Company domain field: frontend used `company.inputDomain`; API returns `company.domain` — names now show in run detail during processing

### QA / Testing
- 19 Playwright E2E tests written and passing (see `TEST_PLAN.md`)
- Auth session setup with Vercel protection bypass header configured


## 🔜 Next up

### High priority
- [x] **Contact lookup via LinkedIn + Apollo** — "Who to Contact" section now shows per-persona LinkedIn search deep links and a URL paste input; pasting a LinkedIn profile URL resolves the contact via Apollo `/people/match` (free-tier compatible). Email reveal also wired up.
- [ ] **Apollo plan upgrade (Option 1)** — upgrade Apollo plan to unlock `/v1/people/search` bulk people search. This would let the app auto-populate contacts without needing the user to paste LinkedIn URLs one by one. Cost: Apollo Basic or Professional plan. Tracked in roadmap, not yet implemented.
- [ ] **Outreach draft** — one-click generate a personalised email or LinkedIn message from the outreach angle + talking points. Copy to clipboard.
- [ ] **Run name auto-generation** — if the run name field is left blank, generate one from product + date + company count.
- [ ] **Stuck run cleanup** — runs in QUEUED/PROCESSING for >30 min should be marked PARTIAL automatically (worker or cron).

### Medium priority
- [ ] **Product profile editor** — allow editing Claude-extracted ICP fields (targetIndustries, headcountMin/Max, displacedCompetitors) after extraction.
- [ ] **Dimension weight sliders** — expose the 6 fitment dimension weights as sliders in the product profile or run creation form.
- [ ] **Dashboard real metrics** — wire up aggregates: total companies researched, avg fitment across all runs, buying signals found this week.
- [ ] **CSV export polish** — group output by section (Identity, Fitment, Signals, Contacts) instead of a flat row.
- [ ] **CRM integrations** — implement read-only Salesforce + HubSpot pull to populate `engagement` (lastContactDate, dealStage) in the company card. Currently stubs.

### Low priority / V2
- [ ] **Intent data pipeline** — Clearbit Reveal / GA4 IP-to-company to identify which target companies visit the user's site.
- [ ] **LinkedIn enrichment** — headcount history, hiring trends, contact data via a compliant provider.
- [ ] **MCA21 / Tofler direct API** — India-specific financials; currently sourced via Tavily web search.
- [ ] **Multi-workspace** — team/workspace switching; currently single workspace per account.
- [ ] **Run completion notifications** — email or Slack alert when a run finishes.


## 🐛 Known issues / watch list

- `synthesis.buyingSignalSummary` and `synthesis.competitorDisplacementAngle` are only populated if Claude returns them — spot-check completed runs to confirm they're non-null in production.
- `hiring.seniorHiresLast90Days` often comes back empty for smaller companies with limited LinkedIn data.
- Vercel protection bypass secret (`xkCH9Ghmp5NQFDeB1edd8TlLIFBkPiBD`) is committed in `playwright.config.ts` — rotate if the preview URL is ever shared publicly.
- `feat/new-design` branch is now behind `main` — can be deleted or repurposed for the next feature branch.
