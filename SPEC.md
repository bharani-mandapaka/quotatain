# Quotatain — Product Specification (Build-Ready)

**Version:** 1.2  
**Date:** 2026-05-22  
**Status:** In Progress — MVP Being Built  
**First Customer:** InfoEdge India Ltd. (Naukri.com, 99acres, Jeevansathi, Shiksha)
**Build Progress:** Core pipeline + auth + UI built. See TASKS.md for detailed status.


**MVP Geography:** India  
**MVP Scale:** 1 company (demo) → 10–50 companies (initial users) → 500 (V2 scale)

---

## Table of Contents

1. [Product Overview & Context](#1-product-overview--context)
2. [MVP Scope vs V2 Roadmap](#2-mvp-scope-vs-v2-roadmap)
3. [User Personas](#3-user-personas)
4. [User Flows](#4-user-flows)
5. [Feature 1 — Company Research](#5-feature-1--company-research)
6. [Feature 2 — Product Fitment Analysis](#6-feature-2--product-fitment-analysis)
7. [Team Dashboard](#7-team-dashboard)
8. [Company Intelligence Data Model](#8-company-intelligence-data-model)
9. [Data Sources & Provider Strategy](#9-data-sources--provider-strategy)
10. [Integration Architecture](#10-integration-architecture)
11. [Tech Architecture](#11-tech-architecture)
12. [API Specifications](#12-api-specifications)
13. [Testing Strategy](#13-testing-strategy)
14. [Test Cases](#14-test-cases)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Deployment & Infrastructure](#16-deployment--infrastructure)
17. [Open Questions](#17-open-questions)

---

## 1. Product Overview & Context

Quotatain is a B2B sales intelligence platform. A salesperson uploads a list of target companies, selects a product they're selling, and receives a structured intelligence card per company — covering financials, tech stack, hiring trends, buying signals, organizational pain points, and first-party intent data — plus a fitment score and recommended contact for each company.

### First Customer Context: InfoEdge India

InfoEdge (NSE: NAUKRI) is India's leading internet company with multiple B2B products sold to HR, real estate, and education buyers:

| Product | Buyer Persona | What They Sell |
|---------|--------------|----------------|
| Naukri.com (RMS/recruiter tools) | HR Directors, TA Heads, CHROs | Recruitment platform, resume database access |
| Naukri Gulf | HR at companies with Middle East hiring | Gulf-focused recruitment |
| iimjobs / hirist | Heads of Engineering, HR Tech | Premium/tech hiring platform |
| 99acres | Real estate developers, brokers | Property listing & lead gen |
| Shiksha | Education institutions, Admissions heads | Student admission leads |
| Jeevansathi | B2C — out of MVP scope | — |

This means Quotatain must support **multiple products per user account** from day one, each with a different ICP, buyer persona, and fitment scoring model.

---

## 2. MVP Scope vs V2 Roadmap

### MVP (India-First)

| Capability | In MVP |
|-----------|--------|
| Email + password auth (signup/login, workspace auto-created) | ✅ |
| Company list upload (CSV, Excel, paste) | ✅ |
| Parallel company research pipeline | ✅ |
| Intelligence card with all data categories | ✅ |
| Attrition signals (not a %, signals-based) | ✅ |
| Hiring trends + fresher hiring signal | ✅ |
| First-party intent data (GA4 + GTM + IP enrichment) | ❌ → V2 |
| Multiple products per account | ✅ |
| Product fitment scoring (6 dimensions) | ✅ |
| Role-based contact recommendation (no named contacts) | ✅ |
| In-app dashboard + CSV/Excel export | ✅ |
| Team model with head-of-sales dashboard | ✅ |
| Salesforce + HubSpot integration (read-only) | ✅ |
| India-specific data sources (Tofler.in, BSE/NSE, MCA via Tofler) | ✅ |
| Free/low-cost data provider tier (Apollo free, NewsAPI free) | ✅ |
| Run limit: max 50 companies/run (1 company for demo) | ✅ |

### V2 Roadmap

| Capability | V2 |
|-----------|-----|
| Google OAuth / SSO | V2 |
| Third-party intent data (Bombora, G2 Buyer Intent) | V2 |
| First-party intent data (GA4 + GTM + Clearbit Reveal) | V2 |
| Named contact recommendation (with LinkedIn profile) | V2 |
| CRM push — write enriched data back to Salesforce/HubSpot | V2 |
| AI-generated email sequences per contact | V2 |
| Saved monitoring lists (auto re-research weekly) | V2 |
| US/Global geography | V2 |
| More CRM connectors (Pipedrive, Zoho) | V2 |
| Chrome extension | V3 |
| API access for customers | V2 |

---

## 3. User Personas

### 3.1 Account Executive (AE) — Primary

- Works at InfoEdge, sells Naukri/iimjobs/99acres to companies.
- Runs a book of 50–200 target accounts.
- Needs: deep context on each account before outreach. What's their hiring volume? Are they expanding? Did they just raise funding? What's their current ATS/recruitment tool?
- Pain: 30–60 min of manual research per account, scattered across LinkedIn, MCA21, news, Glassdoor.

### 3.2 Sales Development Rep (SDR)

- Works high-volume prospecting lists (100–500 companies/week).
- Needs: fast signal on which accounts to prioritize. Is this company growing? Are they hiring for roles that imply a need for Naukri?
- Pain: no bandwidth to deep-research every account; uses surface-level data and misses buying signals.

### 3.3 Head of Sales / Sales Manager

- Manages a team of 5–20 AEs/SDRs.
- Needs: visibility into research run quality, which accounts the team is targeting, aggregate signals across the pipeline, rep activity metrics.
- Uses: the Team Dashboard view.

### 3.4 Product Manager / RevOps (configuration)

- Sets up product profiles for each InfoEdge product.
- Configures ICP criteria, fitment dimension weights.
- Maps CRM fields for Salesforce/HubSpot sync.

---

## 4. User Flows

### 4.1 Full Happy Path — AE

```
[1] ONBOARDING (first time)
  Sign up / invite from team
  → Configure workspace: company name, CRM connection (optional)
  → Create Product Profiles: one per product being sold
  → Connect GA4 property (optional — for first-party intent)
  → Connect GTM container (optional)

[2] NEW RESEARCH RUN
  Dashboard → "New Run"
  → Name the run (e.g., "Naukri — IT Companies Delhi NCR May 2026")
  → Select product to score against (e.g., "Naukri RMS")
  → Upload file (CSV/Excel) OR paste company names/domains
  → Column mapping confirmation (auto-detected or manual)
  → Select Research Depth: Quick / Standard / Deep
  → Review: "47 companies detected, 2 duplicates removed"
  → Click "Start Research"

[3] PROCESSING (async, real-time progress)
  Progress bar with per-company status
  Estimated time shown
  Can navigate away — notified on completion (in-app + email)

[4] RESULTS
  Summary table: all companies, key metrics, fitment score
  Filter by: Fitment Score, Funding Stage, Headcount, Industry, Intent Signals
  Sort by any column
  Click company → expand Intelligence Card (all sections)
  Toggle: "Company View" / "Fitment View" / "Intent View"

[5] ACTION
  Export CSV / Excel (all results or filtered subset)
  Copy card as formatted text
  Share run link with team member
```

### 4.2 Head of Sales Flow

```
Team Dashboard
  → View all runs across team
  → See aggregate: total companies researched, avg fitment scores, top buying signals detected
  → Rep leaderboard: research runs per rep, accounts worked
  → Filter by product, date range, rep
  → Drill into individual runs
```

### 4.3 Product Profile Setup Flow

```
Settings → Products → "Add Product"
  → Product name (e.g., "Naukri RMS — Enterprise")
  → Description: free text OR upload file (PDF, DOCX, URL)
    → Claude parses it → shows extracted profile for confirmation
  → ICP Criteria:
    - Target industries (multi-select)
    - Headcount range (min/max)
    - Funding stages
    - Geography (India states/cities for MVP)
    - Revenue range
  → Fitment Dimension Weights (sliders, must sum to 100%):
    - Industry fit
    - Size/headcount fit
    - Tech stack fit
    - Pain point fit
    - Buying signal fit
    - Engagement fit (from CRM/website)
  → Buyer Persona definition:
    - Primary buyer title (e.g., "CHRO, Head of Talent Acquisition")
    - Secondary buyer title (e.g., "HR Director, Recruitment Manager")
    - Technical evaluator (e.g., "IT Manager, CTO for HRIS")
  → Save
```

### 4.4 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Company not found in any source | Card marked "Partial — Limited Data"; populated fields shown |
| Ambiguous company name | Top 3 domain matches shown; user selects or auto-select by confidence |
| Indian company with no MCA/LinkedIn presence | Fallback to news + website crawl only |
| GA4 not connected | Intent signals section shows "Connect GA4 to see intent data" prompt |
| No product profile created | Fitment section disabled; prompt to create profile |
| > 500 companies | Error: "MVP limit is 500 companies. Split your list." |
| Duplicate rows | Silently deduplicated by domain; count shown in run summary |
| File encoding issues | Auto-detected and handled; error with row info if unrecoverable |

---

## 5. Feature 1 — Company Research

### 5.1 Research Pipeline (per company)

```
STAGE 1: Domain Resolution
  Input: company name or domain
  → If domain given: normalize (strip www, http, trailing slash)
  → If name given: resolve via Google Custom Search API
    → Fallback: agent.ai company search
    → Confidence score assigned

STAGE 2: Parallel Data Fetches (all sources queried concurrently)
  ├── Identity + Financials    → Apollo.io API (free tier first) + MCA21 (India)
  ├── Funding                  → Crunchbase Basic API + Apollo
  ├── Stock / Market Cap       → NSE/BSE API (India listed) + Yahoo Finance API
  ├── Headcount + Hiring       → Apollo / People Data Labs + LinkedIn (via provider)
  ├── Tech Stack               → BuiltWith API + HG Insights (or agent.ai)
  ├── News / Trigger Events    → NewsAPI.org (free) + Economic Times RSS + Mint RSS
  ├── Reviews / Pain Points    → Glassdoor India (aggregator) + AmbitionBox (India)
  ├── Intent Data              → GA4 API (if connected) — first-party only in MVP
  ├── Engagement Data          → CRM API (if connected: Salesforce / HubSpot)
  ├── Indian Company Data      → Tofler.in API + Zauba Corp (import/export signals)
  └── Website Crawl            → Playwright headless: About, Careers, Pricing pages

STAGE 3: AI Synthesis (Claude claude-sonnet-4-6)
  → All raw data compressed and passed in structured prompt
  → Output: validated JSON card (Zod schema)
  → Retry up to 2x on schema validation failure
  → Confidence score computed per field

STAGE 4: Card Assembly
  → Merge structured data + AI synthesis
  → Source attribution per field
  → Store in DB
  → Emit WebSocket event to frontend
```

### 5.2 Research Depth Modes

| Mode | Sources | Approx Time/Company | Best For |
|------|---------|-------------------|----------|
| Quick | Identity + Funding + Tech Stack + News | ~8s | 200–500 company prospecting lists |
| Standard (default) | All sources except deep job scan + website crawl | ~25s | Pre-campaign account research |
| Deep | All sources + full job posting analysis + website crawl + Glassdoor deep dive | ~75s | Strategic key accounts |

### 5.3 Agent.ai Integration Strategy

agent.ai (https://agent.ai/profile/company-research) provides free AI-powered company research. Use as:

- **Tier 0 (Free):** First call for any company. agent.ai's research output is passed as context to the synthesis layer.
- **Cache layer:** If agent.ai returns high-confidence data for a field, skip the paid API call for that field.
- **Fallback:** For companies not found in paid APIs (especially smaller Indian companies), agent.ai often has better coverage.
- **Rate limit:** agent.ai free tier — monitor rate limits; fall through to direct API calls if throttled.

```
Enrichment priority for each field:
  1. agent.ai (free) — if confidence > 0.8, use it
  2. Primary paid provider (Apollo / Crunchbase / BuiltWith)
  3. India-specific source (MCA21 / Tofler / NSE)
  4. Website crawl (Playwright)
  5. AI synthesis from partial data (Claude)
  6. null + flag as "Unavailable"
```

---

## 6. Feature 2 — Product Fitment Analysis

### 6.1 Product Profile Ingestion

Accepts: free text, PDF, DOCX, TXT, URL.

Claude extracts and stores a structured **Product Profile**:

```typescript
interface ProductProfile {
  id: string;
  workspaceId: string;
  name: string;
  rawDescription: string; // original input
  
  // Extracted by Claude
  capabilities: string[];          // what the product does
  problemsSolved: string[];        // pain points it addresses
  targetIndustries: string[];      // who it's for
  targetHeadcountMin: number;
  targetHeadcountMax: number;
  targetFundingStages: string[];
  targetGeographies: string[];     // India states/cities for MVP
  requiredTechStack: string[];     // technologies it requires/integrates with
  displacedCompetitors: string[];  // tools it replaces
  primaryBuyerTitles: string[];    // e.g., ["CHRO", "Head of Talent Acquisition"]
  secondaryBuyerTitles: string[];  // e.g., ["HR Director", "Recruitment Manager"]
  technicalEvaluatorTitles: string[];
  
  // User-configured weights (must sum to 1.0)
  dimensionWeights: {
    industryFit: number;      // default: 0.20
    sizeFit: number;          // default: 0.20
    techStackFit: number;     // default: 0.20
    painPointFit: number;     // default: 0.20
    buyingSignalFit: number;  // default: 0.15
    engagementFit: number;    // default: 0.05
  };
}
```

### 6.2 Fitment Scoring Engine

For each company, scores 6 dimensions then computes a weighted composite (0–100):

#### Dimension Scoring Rules

**1. Industry Fit (0–100)**
```
exact industry match                    → 100
parent industry match (e.g., "IT" for "SaaS") → 70
adjacent industry                       → 40
no match                                → 0
```

**2. Size/Headcount Fit (0–100)**
```
headcount within target range           → 100
within 25% of range boundaries          → 70
within 50% of range boundaries          → 40
outside by >50%                         → 10
```

**3. Tech Stack Fit (0–100)**
```
uses displaced competitor               → 90  (displacement opportunity)
uses required integration tech          → 80  (easy deployment)
no relevant tech detected               → 50  (neutral)
uses your product already               → 0   (already a customer — flag separately)
```

**4. Pain Point Fit (0–100)**
```
Derived from: G2/AmbitionBox complaints, Glassdoor reviews, job posting language,
news mentions of the specific problem your product solves.

Scored by Claude: do their publicly visible pain points match your product's 
problem-solved list?

Exact pain point match in public data   → 90–100
Implied pain point (e.g., hiring 50+ roles = needs recruitment tool) → 60–80
No detectable pain                      → 30
```

**5. Buying Signal Fit (0–100)**
```
Recent funding (< 6 months)             → +30
Recent leadership change (< 3 months)   → +25
Hiring spike (> 25% increase)           → +20
M&A activity (< 6 months)              → +20
Market expansion                        → +15
Signals are additive, capped at 100
No signals                              → 20 (baseline — they exist, just quiet)
```

**6. Engagement Fit (0–100)** *(requires GA4 or CRM connection)*
```
Visited pricing page in last 30 days    → 100
Visited product pages in last 30 days   → 70
Opened marketing email in last 90 days  → 50
No engagement detected                  → 0
Previously a customer (churned)         → special flag, not scored
```

**Composite Score:**
```
fitmentScore = Σ(dimensionScore × dimensionWeight) × 100
```

### 6.3 Contact Recommendation (Role-Based, MVP)

Based on the product profile's buyer persona definitions and the company's org structure signals (job titles detected in job postings + LinkedIn aggregation via Apollo):

```typescript
interface ContactRecommendation {
  companyId: string;
  
  economicBuyer: {
    recommendedTitle: string;      // e.g., "CHRO / VP HR"
    confidence: "high" | "medium" | "low";
    rationale: string;             // e.g., "Company size (500+ employees) indicates dedicated CHRO"
    detectedTitlesAtCompany: string[]; // from job postings/public data
  };
  
  champion: {
    recommendedTitle: string;      // e.g., "Head of Talent Acquisition"
    confidence: "high" | "medium" | "low";
    rationale: string;
  };
  
  technicalEvaluator: {
    recommendedTitle: string;      // e.g., "HR Systems Manager / IT Manager"
    confidence: "high" | "medium" | "low";
    rationale: string;
  };
  
  outreachAngle: string; // AI-generated, e.g., "They just posted 45 engineering jobs in 30 days 
                         // — a strong signal they need a better recruitment pipeline."
}
```

*Named contacts (actual person name + LinkedIn URL) are a V2 feature requiring a paid enrichment subscription (Apollo paid, Lusha, or Hunter.io).*

---

## 7. Team Dashboard

### 7.1 Head of Sales View

**Overview Panel:**
- Total companies researched (this week / month / all time)
- Total research runs (by rep)
- Average fitment score across all accounts
- Top buying signals detected across all accounts (aggregate)

**Rep Activity Table:**
- Columns: Rep Name · Runs This Week · Companies Researched · Avg Fitment Score · Last Active
- Drill in to see individual rep's runs

**Signal Intelligence Feed:**
- Aggregate feed of the strongest buying signals across all accounts researched by the team
- Filterable by signal type, product, date range
- "3 companies your team researched just raised funding this week"

**Product Performance:**
- For each product profile: avg fitment score, top-scoring industries, top buying signals detected

### 7.2 Access Control

| Role | Permissions |
|------|------------|
| Admin | Full access: configure workspace, manage users, set up products, view all runs |
| Head of Sales | View all team runs + dashboard; cannot edit products or CRM config |
| AE / SDR | Create and view own runs; view shared runs; cannot access other reps' runs |

---

## 8. Company Intelligence Data Model

Full set of fields surfaced on an Intelligence Card. Each field includes: value, confidence (0–1), source, and timestamp.

> Fields marked ★ are directly used in fitment scoring.  
> Fields marked 🇮🇳 have India-specific sources.

### 8.1 Company Identity

| Field | Source | Notes |
|-------|--------|-------|
| Company Name | Apollo / MCA21 🇮🇳 | Legal name |
| Domain | Resolved | Canonical |
| Logo | Clearbit Logo / Apollo | URL |
| Description | Website crawl / Apollo | 2–3 sentences |
| Industry ★ | Apollo / MCA21 🇮🇳 | SIC + human label |
| Sub-industry | Apollo + AI | |
| Founded Year | Apollo / Crunchbase / MCA21 🇮🇳 | |
| HQ Location | Apollo / MCA21 🇮🇳 | City, State, Country |
| Company Type | Apollo / MCA21 🇮🇳 | Private / Public / Subsidiary |
| CIN (India) 🇮🇳 | MCA21 | Company Identification Number |
| BSE/NSE Ticker 🇮🇳 | NSE/BSE API | If listed |

### 8.2 Size & Scale ★

| Field | Source | Notes |
|-------|--------|-------|
| Headcount (current) ★ | Apollo / LinkedIn provider | |
| Headcount (6 months ago) | Apollo historical | For trend |
| Headcount (12 months ago) | Apollo historical | YoY |
| Headcount Trend | Computed | Growing / Stable / Shrinking |
| Headcount Growth % (6mo) | Computed | |
| Department Breakdown | Apollo / LinkedIn | Eng / Sales / Mktg / Ops % |
| Revenue (estimated) ★ | Apollo / Tofler 🇮🇳 / Crunchbase | |
| Revenue Range | Apollo | e.g., ₹10Cr–₹50Cr |
| Revenue Growth YoY | Apollo / public filings | |
| MCA Paid-Up Capital 🇮🇳 | MCA21 | Proxy for company size |

### 8.3 Funding & Financial Health ★

| Field | Source | Notes |
|-------|--------|-------|
| Funding Stage ★ | Crunchbase / Apollo | Seed → Series E / Bootstrapped / Listed |
| Total Funding Raised ★ | Crunchbase | In USD and INR |
| Last Funding Date ★ | Crunchbase | Recency signal |
| Last Funding Amount | Crunchbase | |
| Last Funding Investors | Crunchbase | Lead investors |
| IPO Status 🇮🇳 | NSE/BSE API | Filed / Listed / N/A |
| Market Cap (lite) 🇮🇳 | NSE/BSE API | Current market cap if listed |
| Stock Price (lite) 🇮🇳 | NSE/BSE API | Current price + 52-week range |
| Annual Revenue (MCA) 🇮🇳 | Tofler / MCA21 | From filed financials |
| Net Profit/Loss 🇮🇳 | Tofler / MCA21 | From filed financials |
| Directors 🇮🇳 | MCA21 | Board members (useful for mapping decision-makers) |

### 8.4 Hiring Trends & People Signals ★

| Field | Source | Notes |
|-------|--------|-------|
| Open Roles (total) | Apollo / job boards | Current count |
| Hiring Velocity | Computed | Open roles trend vs. 90 days ago |
| Hiring Spike Flag | Computed | > 25% increase in open roles |
| Roles by Department | Job board API | Breakdown of open roles |
| Senior Hires (last 90 days) | LinkedIn (via provider) | C-suite / VP level hires |
| Leadership Change Flag ★ | LinkedIn + news | New CXO in last 90 days |
| Fresher/Entry-Level Hiring % | Job postings analysis | % of roles tagged "fresher / 0–2 yrs / grad" |
| Fresher Hiring Signal | AI synthesis | Scaling fast (positive) OR cost-cutting (risk) |
| Attrition Risk 🇮🇳 | AmbitionBox + Glassdoor India | High / Medium / Low (signals-based) |
| Attrition Evidence | AI synthesis | "3 Glassdoor reviews cite 'poor retention'; headcount down 8% YoY" |
| Avg Employee Tenure | LinkedIn provider | Median tenure at company |

**Attrition Risk Scoring:**
```
Inputs:
  - AmbitionBox "Work-Life Balance" rating < 3 → +2 pts
  - Glassdoor India "Management" rating < 3 → +2 pts  
  - Headcount declined YoY → +3 pts
  - High volume of "replacement" job postings (same roles posted repeatedly) → +2 pts
  - Glassdoor reviews with "leaving", "attrition", "turnover" keywords → +1 pt/mention (capped at 3)

Score → Risk:
  0–3: Low
  4–6: Medium
  7+:  High
```

### 8.5 Technology Stack ★

| Field | Source | Notes |
|-------|--------|-------|
| CRM in Use ★ | BuiltWith / HG Insights / agent.ai | Salesforce, HubSpot, Zoho, etc. |
| ATS / HRMS in Use ★ | BuiltWith / HG Insights | Especially relevant for Naukri |
| Marketing Automation | BuiltWith | Marketo, Pardot, CleverTap, etc. |
| Cloud Provider | BuiltWith / job postings | AWS, GCP, Azure |
| ERP | HG Insights | SAP, Oracle, Tally 🇮🇳 |
| Collaboration Tools | BuiltWith / job postings | Slack, Teams, Google Workspace |
| Analytics Stack | BuiltWith | GA4, Mixpanel, Segment |
| # SaaS Tools (est.) | HG Insights / agent.ai | Budget signal |
| Competitor Tool Flag ★ | Computed | "Uses [competitor] — displacement opportunity" |
| Integration Compatibility | AI synthesis | "Integrates with their Salesforce instance" |

### 8.6 Buying Signals & Trigger Events ★

| Signal | Source | Recency Weight |
|--------|--------|---------------|
| Recent Funding (< 6 months) ★ | Crunchbase | Highest |
| Recent Funding (6–18 months) | Crunchbase | High |
| New C-Suite / VP Hire ★ | LinkedIn + news | Highest |
| Hiring Spike (> 25% up) ★ | Job boards | High |
| M&A Activity (< 6 months) ★ | Crunchbase + news | High |
| New Market/Geography Expansion | News | High |
| Product Launch | News | Medium |
| Series/IPO Filing | Crunchbase / BSE 🇮🇳 | Highest |
| Negative Competitor Reviews | G2 / AmbitionBox | Medium |
| Awards / Recognition | News / agent.ai | Low (conversation starter) |
| Office Expansion | News / LinkedIn | Medium |

### 8.7 Intent Data (First-Party) ★

*Requires GA4 + GTM connection.*

| Signal | Source | How Detected |
|--------|--------|-------------|
| Pricing Page Visit (last 30 days) | GA4 + IP enrichment | IP resolved to company domain |
| Product Page Visit (last 30 days) | GA4 + IP enrichment | |
| Demo/Contact Form Started | GA4 event (via GTM) | Form start event |
| Demo/Contact Form Completed | GA4 event (via GTM) | Form submit event |
| Whitepaper / Content Download | GA4 event (via GTM) | Download event |
| Repeated Visits (last 30 days) | GA4 | Session count by company |
| Intent Score (0–100) | Computed | Weighted by action type and recency |

**IP-to-Company Resolution (India):**
- Primary: Clearbit Reveal (global, India coverage ~45%)
- Alternative: IPinfo.io Business plan (cheaper, India coverage ~40%)
- Supplement: Domain matching from form fills (100% accurate when available)
- Note: Corporate India often routes traffic through ISP IPs → lower match rate than US. Target 30–40% match for India traffic.

### 8.8 Engagement Data ★

*Requires CRM connection (Salesforce or HubSpot).*

| Field | Source | Notes |
|-------|--------|-------|
| Is Existing Account in CRM | CRM | Flag: "Already in your CRM" |
| Last Contact Date | CRM | When was last outreach |
| Last Meeting Date | CRM | Last call / demo |
| Emails Sent (last 90 days) | CRM | Rep activity |
| Email Opens / Clicks | CRM | Engagement rate |
| Deal Stage (if any) | CRM | Open opportunity? |
| Previous Customer | CRM | Churned? When? |
| Contacts in CRM | CRM | Names/titles of contacts already logged |

### 8.9 Organizational Pain Points

| Field | Source | Notes |
|-------|--------|-------|
| Detected Pain Points | AI synthesis | From Glassdoor, AmbitionBox, news, job posting language |
| Pain Point Evidence | Source citations | Specific quotes / headlines |
| Scale Challenges | News + AI | "Hired 200+ people in 6 months — likely overwhelmed with recruitment ops" |
| Tech Debt Signals | Glassdoor + job postings | "12 job posts mention legacy systems migration" |
| Security Issues | News | Recent breach / compliance issue |
| Customer Satisfaction Issues | G2 / AmbitionBox | Their product's reviews if B2B |

### 8.10 AI-Generated Synthesis ★

| Field | Notes |
|-------|-------|
| ICP Fit Score (0–100) | Product-specific, uses configured weights |
| Fitment Dimension Breakdown | Score per dimension |
| Pain Point Summary | Top 2–3 likely pains in plain language |
| Recommended Talking Points | 3–5 specific, evidence-based outreach hooks |
| Buying Signal Summary | "Why reach out now" in 2 sentences |
| Fresher Hiring Interpretation | "This company is scaling fast" OR "This may indicate cost pressure" |
| Risk Flags | Shrinking headcount, low runway, high attrition risk — deprioritize? |
| Contact Recommendation | Role to target (Economic Buyer, Champion, Tech Evaluator) |
| Outreach Angle | One-line personalized hook per recommended role |
| Confidence Score (0–100) | Data completeness across all fields |
| Data Freshness | Timestamp of research run |

---

## 9. Data Sources & Provider Strategy

### 9.1 Provider Tiers (Cost Optimization)

```
TIER 0 — Free
  agent.ai company research      https://agent.ai/profile/company-research
  NewsAPI.org                     Free tier: 100 req/day
  MCA21 API 🇮🇳                  Free (government API) — requires registration
  BSE/NSE APIs 🇮🇳                Free for basic data
  Google Custom Search API        Free tier: 100 req/day
  Economic Times / Mint RSS       Free RSS feeds
  AmbitionBox 🇮🇳                 Scrape (public data, India-specific Glassdoor equivalent)

TIER 1 — Low Cost / Startup Plans
  Apollo.io                       Free: 50 credits/month; $49/mo for 1000 credits
                                  Covers: company profile, headcount, contacts (V2), funding basics
  NewsAPI.org paid                $449/mo for unlimited — scale to this when needed
  IPinfo.io Business              $99/mo — IP-to-company for intent data
  BuiltWith API                   $295/mo — tech stack detection
  Tofler.in 🇮🇳                  ₹999/report or API subscription — Indian financial data

TIER 2 — Mid-Range (add when scale justifies)
  Crunchbase Basic API            $29/mo — funding data
  Clearbit Enrichment             $99/mo — company + person enrichment
  People Data Labs                $0.01–$0.05/record — LinkedIn-derived data
  HG Insights                     Custom pricing — deep technographic data

TIER 3 — Enterprise (V2)
  Bombora Intent                  Custom — third-party intent signals
  PitchBook                       Custom — deep financial data
  LinkedIn Talent Insights        Custom — official workforce analytics
```

### 9.2 LinkedIn Data Strategy

LinkedIn does not have a public API for company headcount history or hiring data. Options:

| Approach | ToS Risk | Data Quality | Recommendation |
|----------|---------|-------------|----------------|
| LinkedIn official API | None | Very limited (only profile share) | Not useful |
| LinkedIn Sales Navigator API | None (requires LinkedIn partnership) | Excellent | V2 — needs enterprise contract |
| Apollo.io (aggregates LinkedIn data) | None | Good for India | **MVP choice** |
| People Data Labs | None (licensed data) | Good | MVP fallback |
| Proxycurl (LinkedIn scraper) | Violates ToS | Excellent | Do NOT use — legal risk |
| Browser scraping via Playwright | Violates ToS + tech blocks | Variable | Do NOT use |

**Decision for MVP:** Use Apollo.io as primary LinkedIn-derived data source. Apollo aggregates and licenses data from multiple sources including LinkedIn without violating ToS. For India specifically, Apollo has good coverage of companies with 50+ employees.

### 9.3 India-Specific Sources

| Source | What It Provides | API | Notes |
|--------|----------------|-----|-------|
| MCA21 (via Tofler) | Company registration, directors, filing history, paid-up capital | Yes (Tofler API) | Use Tofler for MVP (instant); register MCA21 directly for V2 |
| BSE API | Stock price, market cap, filings for listed companies | Yes | Free basic tier |
| NSE API | Same as BSE | Yes | Free basic tier |
| Tofler.in | Aggregated MCA data + revenue/profit from filings | Paid API | Best for private company financials |
| Zauba Corp | Import/export data (signals company is trading/scaling) | Scrape | Public data |
| AmbitionBox | Employee reviews, salaries, ratings (India's Glassdoor) | Scrape (public) | India-specific attrition signal |
| Naukri.com (ironic) | Job postings for Indian companies | Scrape / partner API | InfoEdge's own platform — potential partnership |
| Economic Times | Indian business news | RSS + scrape | Free |
| Mint (livemint.com) | Indian financial news | RSS | Free |
| VCCEdge / Traxcn | Indian startup funding data | Paid | Crunchbase alternative for India |

---

## 10. Integration Architecture

### 10.1 GA4 + GTM — First-Party Intent Pipeline

```
HOW IT WORKS:

1. USER SETUP (one-time):
   User connects their GA4 property in Quotatain settings
   → OAuth flow: Google OAuth → GA4 Read access
   → User provides their GTM container ID
   → Quotatain generates GTM tag snippet to add to their website
     (or provides instructions for GTM container setup)

2. GTM TAG (on user's website):
   Quotatain's GTM tag:
   a. Fires a custom event on key pages:
      - /pricing → event: "quotatain_pricing_view"
      - /demo, /contact, /trial → event: "quotatain_demo_intent"
      - Any content download → event: "quotatain_content_download"
      - Any form start/submit → event: "quotatain_form_action"
   b. Captures visitor's IP (passed as custom dimension to GA4)

3. IP ENRICHMENT MIDDLEWARE:
   A lightweight Edge Function (Cloudflare Workers or Vercel Edge):
   → Called from the GTM tag via a pixel/beacon
   → Receives IP + event type + page URL
   → Resolves IP → company domain (via IPinfo.io Business)
   → Sends enriched event to GA4 via Measurement Protocol:
     event_params: { company_domain: "acme.com", page_category: "pricing" }

4. QUOTATAIN PULLS FROM GA4:
   When a company card is being built:
   → GA4 Data API query: "For domain X, what events fired in last 30/60/90 days?"
   → Maps events to intent signals on the card
   → Computes Intent Score (0–100)

ARCHITECTURE NOTE: The IP enrichment middleware must be a separate service 
(not the main Quotatain backend) because it runs on the user's website traffic, 
not Quotatain's. Deploy as a Cloudflare Worker for < 1ms latency.
```

### 10.2 Salesforce Integration (V1 — Read-Only for MVP)

**OAuth Flow:**
```
User clicks "Connect Salesforce" in settings
→ Salesforce OAuth 2.0 (Web Server Flow)
→ Scopes: api, refresh_token, offline_access
→ Store access_token + refresh_token (encrypted at rest)
→ Test connection: GET /services/data/v59.0/sobjects/
```

**Data Pull (when building company card):**
```
Given company domain:
1. Query Salesforce Accounts: 
   SELECT Id, Name, Website, NumberOfEmployees, AnnualRevenue, 
          Industry, Type, LastActivityDate, OwnerId
   FROM Account 
   WHERE Website LIKE '%{domain}%' OR Name = '{company_name}'

2. If account found, query recent activities:
   SELECT Id, Subject, ActivityDate, Description, Type 
   FROM Activity 
   WHERE AccountId = '{account_id}' 
   ORDER BY ActivityDate DESC LIMIT 20

3. Query open opportunities:
   SELECT Id, Name, StageName, Amount, CloseDate 
   FROM Opportunity 
   WHERE AccountId = '{account_id}' AND IsClosed = false

4. Map to engagement card fields
```

**Push (V2):** Write enriched data back to Account custom fields.

### 10.3 HubSpot Integration (V1 — Read-Only for MVP)

**OAuth Flow:**
```
HubSpot OAuth 2.0 (standard flow)
Scopes: crm.objects.companies.read, crm.objects.contacts.read, 
        crm.objects.deals.read, sales-email-read
```

**Data Pull:**
```
POST https://api.hubapi.com/crm/v3/objects/companies/search
{
  "filterGroups": [{
    "filters": [{
      "propertyName": "domain",
      "operator": "EQ",
      "value": "{domain}"
    }]
  }],
  "properties": ["name", "domain", "numberofemployees", "annualrevenue", 
                  "industry", "hs_lastmodifieddate", "notes_last_contacted"]
}
```

### 10.4 Integration Data Flow Summary

```
                    ┌─────────────────┐
                    │   Quotatain App  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌───────▼──────┐   ┌──────▼──────┐
    │ Salesforce │    │   HubSpot    │   │  GA4 API    │
    │  (read)   │    │   (read)     │   │  (read)     │
    └─────┬─────┘    └───────┬──────┘   └──────┬──────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Engagement     │
                    │  Data Layer     │
                    │  (per company)  │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  AI Synthesis   │
                    │  (Claude API)   │
                    └─────────────────┘
```

---

## 11. Tech Architecture

### 11.1 Architecture Decision: Modular Monolith (not microservices)

**Decision:** Build a modular monolith with clean internal module boundaries for MVP. Extract services only when there is a specific scaling driver.

**Rationale:** Microservices add deployment, networking, and debugging complexity that a small team cannot absorb in MVP. The research pipeline (BullMQ workers) is the only component that benefits from horizontal scaling — it runs in the same process but can be extracted to separate worker containers when needed without changing the application code, because the queue interface is the boundary.

**Module boundaries:**
```
src/
  modules/
    research/        ← Company research pipeline (data fetching, AI synthesis)
    fitment/         ← Product profile ingestion and fitment scoring engine
    integrations/    ← CRM + GA4 + data provider adapters (ports and adapters pattern)
    companies/       ← Company card storage and retrieval
    runs/            ← Research run management
    workspace/       ← Users, teams, products, configuration
    export/          ← CSV/Excel generation
    intent/          ← GA4 + GTM intent data pipeline
  shared/
    queue/           ← BullMQ setup and job types
    ai/              ← Claude API client + prompt templates + Zod schemas
    db/              ← Prisma client + migrations
    cache/           ← Redis client
```

### 11.2 Full Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | Next.js 16 (App Router) | SSR for initial load speed; React ecosystem |
| Frontend Language | TypeScript | Type safety across full stack |
| Styling | Tailwind CSS + shadcn/ui | Fast, accessible, customizable |
| State (server) | React Query (TanStack Query) | Server state, cache invalidation |
| State (client) | Zustand | Lightweight, no boilerplate |
| File Upload | react-dropzone | Battle-tested |
| CSV Parsing | papaparse | Client-side CSV parse before upload |
| Charts | Recharts | Fitment score gauges, trend charts |
| Real-time | Server-Sent Events (SSE) | Simpler than WebSockets for one-way progress |
| API Framework | Fastify (Node.js) | Faster than Express; built-in TypeScript |
| ORM | Prisma | Type-safe DB queries; good migration tooling |
| Database | PostgreSQL 15 | Relational + JSONB for card storage |
| Queue | BullMQ + Redis | Reliable job queue; per-company parallel jobs |
| Auth | NextAuth.js + email/password (Credentials) | Simple MVP auth; Google OAuth in V2 |
| AI | Claude API (claude-sonnet-4-6) | Synthesis layer; structured JSON output |
| File Parsing (server) | pdf-parse + mammoth | PDF + DOCX product description ingestion |
| Web Scraping | Playwright (containerized) | Headless browser for website crawl |
| Validation | Zod | Runtime schema validation for AI outputs |
| Logging | Pino | Structured JSON logs |
| Error Tracking | Sentry | Exception monitoring |

### 11.3 System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 14)                              │
│  Upload UI → Progress Tracker → Intelligence Dashboard             │
│  Product Config → Team Dashboard → Export                          │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ HTTPS (REST) + SSE
┌──────────────────────────▼─────────────────────────────────────────┐
│                    API LAYER (Fastify)                              │
│  /api/runs  /api/companies  /api/products  /api/workspace          │
│  /api/integrations  /api/export  /api/intent                       │
│  Auth: NextAuth.js JWT middleware                                   │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   JOB QUEUE (BullMQ)    │
              │   Redis 7               │
              │   Queues:               │
              │   - run:research        │
              │   - company:enrich      │
              │   - company:synthesize  │
              └────────────┬────────────┘
                           │ Worker pool (10–20 concurrent)
┌──────────────────────────▼─────────────────────────────────────────┐
│               RESEARCH WORKER (Node.js)                            │
│                                                                    │
│  Domain Resolution → Parallel Fetches → AI Synthesis → Store      │
│                                                                    │
│  Data Provider Adapters (ports & adapters):                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ agent.ai │ │ Apollo   │ │BuiltWith │ │  MCA21   │ ...          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│                                                                    │
│  Each adapter: fetch() → normalize() → ProviderResult              │
│  Merger: priority-based field selection with confidence scores     │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                    DATA LAYER                                       │
│  PostgreSQL 15 (primary: runs, companies, products, workspaces)    │
│  Redis 7 (BullMQ queue + run progress state)                       │
│  S3/R2 (uploaded files, exports, AI prompt/response logs)          │
└────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │  INTENT MIDDLEWARE               │
                    │  Cloudflare Worker              │
                    │  (deployed separately on        │
                    │   customer's domain/subdomain)  │
                    │  IP → Company resolution        │
                    │  → GA4 Measurement Protocol     │
                    └─────────────────────────────────┘
```

### 11.4 AI Prompt Architecture

**Company Synthesis Prompt:**
```
System:
You are a B2B sales intelligence analyst for the Indian market. You receive raw 
data about a company and produce a structured intelligence card. Rules:
- If data is unavailable, set the field to null. Never fabricate data.
- All monetary values in INR for Indian companies unless explicitly USD.
- Attrition risk is inferred from signals, not stated as a %.
- Buying signals must cite their source and date.
- Talking points must reference specific evidence from the data.

User:
Company: {company_name} ({domain})
Research depth: {depth}

<profile>{{ apollo_data }}</profile>
<india_data>{{ mca21_data }}{{ tofler_data }}{{ nse_bse_data }}</india_data>
<funding>{{ crunchbase_data }}</funding>
<tech_stack>{{ builtwith_data }}{{ agent_ai_data }}</tech_stack>
<news>{{ newsapi_data }}{{ et_rss }}{{ mint_rss }}</news>
<jobs>{{ job_postings_data }}</jobs>
<reviews>{{ ambitionbox_data }}{{ glassdoor_data }}</reviews>
<intent>{{ ga4_data }}</intent>
<engagement>{{ crm_data }}</engagement>
<website>{{ playwright_crawl }}</website>

ICP Criteria: {{ product_profile_json }}

Output the following JSON exactly. Use null for missing fields.
{{ output_zod_schema_as_json_schema }}
```

**Fitment Scoring Prompt** (separate, called after card assembly):
```
System:
You are scoring how well a company fits a sales product profile.
Score each dimension 0–100 with evidence. Do not round to multiples of 10.

User:
Product Profile: {{ product_profile }}
Company Card: {{ assembled_card }}

Score these dimensions with evidence:
1. industryFit: Is their industry in the target list?
2. sizeFit: Does their headcount/revenue fit the target range?
3. techStackFit: Do they use compatible or competing tools?
4. painPointFit: Are their public pain points matched by this product?
5. buyingSignalFit: Are there active trigger events?
6. engagementFit: Have they engaged with this company before?

Output JSON: { dimension: { score: number, evidence: string } }
```

### 11.5 Database Schema

```sql
-- Workspaces (teams/companies)
CREATE TABLE workspaces (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  plan          TEXT DEFAULT 'free',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT REFERENCES workspaces(id),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'ae', -- admin | head_of_sales | ae | sdr
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Product Profiles
CREATE TABLE product_profiles (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT REFERENCES workspaces(id),
  name          TEXT NOT NULL,
  raw_input     TEXT,
  parsed_profile JSONB NOT NULL,   -- ProductProfile struct
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- Research Runs
CREATE TABLE runs (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT REFERENCES workspaces(id),
  created_by      TEXT REFERENCES users(id),
  product_id      TEXT REFERENCES product_profiles(id),
  name            TEXT,
  depth           TEXT NOT NULL DEFAULT 'standard',
  status          TEXT NOT NULL DEFAULT 'queued',
  company_count   INT,
  completed_count INT DEFAULT 0,
  failed_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Companies (one per company per run)
CREATE TABLE companies (
  id            TEXT PRIMARY KEY,
  run_id        TEXT REFERENCES runs(id),
  workspace_id  TEXT REFERENCES workspaces(id),
  input_name    TEXT,
  domain        TEXT,
  status        TEXT DEFAULT 'pending',
  card          JSONB,          -- full intelligence card
  fitment       JSONB,          -- fitment scores + breakdown
  contacts      JSONB,          -- contact recommendations
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Integration Configs (per workspace)
CREATE TABLE integrations (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT REFERENCES workspaces(id),
  type          TEXT NOT NULL,  -- salesforce | hubspot | ga4 | gtm
  config        JSONB,          -- encrypted credentials + config
  status        TEXT DEFAULT 'connected',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_run ON companies(run_id);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_workspace ON companies(workspace_id);
CREATE INDEX idx_runs_workspace ON runs(workspace_id);
CREATE INDEX idx_companies_card ON companies USING GIN(card);
CREATE INDEX idx_companies_fitment ON companies USING GIN(fitment);
```

---

## 12. API Specifications

### 12.1 Core Endpoints

```
POST   /api/auth/register           — Create account (email + password); auto-creates workspace; returns JWT
POST   /api/auth/login              — Verify credentials; returns JWT
POST   /api/auth/sync               — V2: Google OAuth upsert (stub, returns 501 in MVP)

POST   /api/runs                    — Create research run
GET    /api/runs                    — List runs (workspace-scoped)
GET    /api/runs/:id                — Get run + summary stats
GET    /api/runs/:id/companies      — Get all company cards (paginated)
GET    /api/runs/:id/companies/:cid — Get single company card
GET    /api/runs/:id/export         — Download CSV/Excel
DELETE /api/runs/:id                — Delete run + all cards

POST   /api/products                — Create product profile
GET    /api/products                — List products
PUT    /api/products/:id            — Update product profile
DELETE /api/products/:id            — Delete product profile

GET    /api/workspace               — Get workspace details
GET    /api/workspace/members       — List team members
POST   /api/workspace/invite        — Invite team member

POST   /api/integrations/salesforce/connect   — OAuth start
GET    /api/integrations/salesforce/callback  — OAuth callback
DELETE /api/integrations/salesforce           — Disconnect

POST   /api/integrations/hubspot/connect
GET    /api/integrations/hubspot/callback
DELETE /api/integrations/hubspot

POST   /api/integrations/ga4/connect
GET    /api/integrations/ga4/properties       — List GA4 properties
POST   /api/integrations/ga4/select           — Select property to use

GET    /api/intent/snippet          — Get GTM tag snippet for user's website
GET    /api/intent/status           — Check if intent data is flowing
```

### 12.2 Key Request/Response Shapes

**POST /api/runs**
```json
{
  "name": "Naukri — IT Companies Delhi NCR May 2026",
  "productId": "prod_abc123",
  "depth": "standard",
  "companies": [
    { "name": "Infosys", "domain": "infosys.com" },
    { "name": "Wipro" }
  ]
}
```
Response 202:
```json
{
  "runId": "run_xyz",
  "status": "queued",
  "companyCount": 2,
  "estimatedSeconds": 60,
  "sseChannel": "/api/runs/run_xyz/progress"
}
```

**SSE Progress Stream: GET /api/runs/:id/progress**
```
data: {"event":"company_complete","company":"Infosys","status":"success","completedCount":1,"totalCount":2}
data: {"event":"company_complete","company":"Wipro","status":"success","completedCount":2,"totalCount":2}
data: {"event":"run_complete","runId":"run_xyz","completedCount":2,"failedCount":0}
```

**GET /api/runs/:id/companies/:cid**
```json
{
  "id": "co_abc",
  "domain": "infosys.com",
  "card": {
    "identity": { "name": "Infosys", "industry": "IT Services", ... },
    "scale": { "headcount": 343000, "headcountTrend": "stable", ... },
    "funding": { "type": "public", "ticker": "INFY", "marketCapINR": "6.2L Cr", ... },
    "hiring": { "openRoles": 1200, "hiringVelocity": "growing", "fresnherPct": 35, ... },
    "techStack": { "crm": "Salesforce", "ats": "Taleo", ... },
    "buyingSignals": [ { "signal": "New CHRO hired", "date": "2026-04-10", "source": "LinkedIn" } ],
    "intent": { "score": 72, "pricingPageVisits": 4, "lastVisit": "2026-05-18" },
    "engagement": { "inCRM": true, "lastContactDate": "2026-03-01", "dealStage": null },
    "painPoints": [ { "point": "High recruitment cost per hire", "evidence": "..." } ],
    "synthesis": {
      "talkingPoints": ["..."],
      "buyingSignalSummary": "...",
      "riskFlags": [],
      "confidenceScore": 88
    }
  },
  "fitment": {
    "score": 84,
    "breakdown": {
      "industryFit": { "score": 95, "evidence": "IT Services — exact match" },
      "sizeFit": { "score": 80, "evidence": "343K employees, top of target range" },
      ...
    }
  },
  "contacts": {
    "economicBuyer": { "title": "CHRO / Global Head of HR", "confidence": "high", "outreachAngle": "..." },
    "champion": { "title": "Head of Talent Acquisition", "confidence": "high", "outreachAngle": "..." }
  }
}
```

---

## 13. Testing Strategy

*Informed by world-class testing principles: evaluation-based testing for AI outputs, ports-and-adapters for mocking external dependencies, risk-based prioritization.*

### 13.1 Test Pyramid

```
         ┌──────────────────────────────┐
         │  E2E Tests (Playwright)      │  ~20 tests
         │  Full user flows, happy path │
         ├──────────────────────────────┤
         │  Integration Tests           │  ~80 tests
         │  API + DB + mocked providers │
         ├──────────────────────────────┤
         │  Unit Tests (Jest/Vitest)    │  ~200+ tests
         │  Scoring engine, parsers,    │
         │  field extractors, adapters  │
         └──────────────────────────────┘
         
         + AI Eval Suite (separate)     ~50 eval cases
         + Performance Tests (k6)       ~5 scenarios
         + Security Tests (OWASP ZAP)
```

### 13.2 AI/LLM Testing Strategy

**Problem:** Claude's output is non-deterministic. Standard assertion-based tests (`expect(output).toEqual(expected)`) will fail on every run.

**Solution: Evaluation-based testing (property assertions, not value assertions)**

```typescript
// BAD — this will flake
expect(result.synthesis.talkingPoints[0]).toBe("They hired a new CHRO...")

// GOOD — assert properties, not values
expect(result.synthesis.talkingPoints).toHaveLength.greaterThan(0)
expect(result.synthesis.talkingPoints.length).toBeGreaterThanOrEqual(2)
expect(result.synthesis.talkingPoints.length).toBeLessThanOrEqual(5)
expect(result.synthesis.talkingPoints.every(tp => tp.length > 20)).toBe(true)
expect(result.synthesis.talkingPoints.every(tp => tp.length < 300)).toBe(true)

// Schema validation — ALWAYS run this
const parsed = CompanyCardSchema.safeParse(result)
expect(parsed.success).toBe(true)

// Hallucination check — no fabricated fields
expect(result.funding.totalRaisedUSD).not.toBeNaN()
if (result.funding.totalRaisedUSD !== null) {
  expect(result.funding.source).not.toBeNull() // must have a source
}

// Relevance check for talking points (LLM-as-judge)
const relevanceCheck = await claude.evaluate({
  prompt: `Do these talking points reference actual evidence from the company data?
           Company data: ${JSON.stringify(companyCard)}
           Talking points: ${JSON.stringify(talkingPoints)}
           Answer: yes/no with reason`,
  outputSchema: { relevant: boolean, reason: string }
})
expect(relevanceCheck.relevant).toBe(true)
```

**Prompt Regression Testing:**
- Maintain a golden dataset of 20 well-known Indian companies with known ground truth.
- Run the synthesis pipeline against this dataset on every CI push.
- Compare: field population rate, confidence scores, schema validity. Alert if any metric drops > 10%.

### 13.3 External API Mocking Strategy

All data providers are behind an adapter interface. Tests use mock adapters:

```typescript
// Adapter interface
interface CompanyDataProvider {
  fetchProfile(domain: string): Promise<CompanyProfile | null>
}

// Production adapter
class ApolloAdapter implements CompanyDataProvider { ... }

// Test adapter
class MockApolloAdapter implements CompanyDataProvider {
  constructor(private fixtures: Map<string, CompanyProfile>) {}
  async fetchProfile(domain: string) {
    return this.fixtures.get(domain) ?? null
  }
}

// In tests
const providers = {
  apollo: new MockApolloAdapter(indianCompanyFixtures),
  mca21: new MockMCA21Adapter(mca21Fixtures),
  // ...
}
const pipeline = new ResearchPipeline(providers)
```

**Fixture library:** Create a set of realistic Indian company fixtures covering:
- Large listed IT company (e.g., Infosys-like)
- Mid-size funded startup (e.g., Series B, 200 employees)
- Small private company (limited public data)
- Company with high attrition signals
- Company with all buying signals active
- Company already in CRM
- Company with first-party intent data

### 13.4 Hardest Testing Scenarios

| Scenario | Challenge | Approach |
|----------|-----------|----------|
| AI output non-determinism | Same input → different output | Property-based assertions + schema validation + LLM-as-judge |
| IP-to-company resolution | Match rate varies by ISP | Test with fixture IPs mapped to known domains; assert graceful null when unresolved |
| Rate limiting during large batch | External APIs throttle | Mock with configurable delay/failure injection; test retry logic and graceful degradation |
| MCA21 API downtime | Government API unreliable | Circuit breaker pattern; test fallback to Tofler; assert partial card is stored |
| CRM data out of sync | Salesforce record stale | Test with stale fixture; assert card shows "Last synced: X days ago" |
| 500-company batch performance | Must complete < 30 min | k6 load test + worker concurrency tuning |
| SSRF via malicious domain | User inputs internal IP | Unit test: assert domain validator rejects 10.x, 192.168.x, localhost, 169.254.x |
| CSV formula injection | `=CMD()` in company name | Unit test: assert sanitizer strips formulas from all string fields before export |

---

## 14. Test Cases

### 14.1 Upload & Validation

| TC | Input | Expected | Priority |
|----|-------|----------|----------|
| U-01 | Valid CSV: name + domain columns | 47 companies parsed, column mapping auto-suggested | P0 |
| U-02 | Excel (.xlsx) | Same as CSV flow | P0 |
| U-03 | CSV with only names (no domain) | Warning shown; domain resolution will be attempted; proceed allowed | P0 |
| U-04 | Paste mode: one company per line | Parsed correctly | P0 |
| U-05 | 10 duplicate domains in 50 rows | 40 unique; "10 duplicates removed" shown | P0 |
| U-06 | 501 rows | Error: "MVP limit is 500 companies" | P0 |
| U-07 | Empty file | Error: "File contains no data" | P0 |
| U-08 | File > 10MB | Error: "File exceeds 10MB limit" | P1 |
| U-09 | .pdf file | Error: "Unsupported file type" | P0 |
| U-10 | CSV with formula injection (`=SUM(A1)` in name column) | Formula stripped; company name stored as literal string | P0 |
| U-11 | Mixed Hindi/English company names | Parsed correctly; unicode handled | P1 |
| U-12 | CSV with BOM (UTF-8-BOM, common in Indian Excel exports) | Parsed correctly; BOM stripped | P1 |

### 14.2 Company Research Pipeline

| TC | Company | Expected | Priority |
|----|---------|----------|----------|
| R-01 | Infosys (large listed Indian IT) | All sections populated; MCA21 data present; NSE ticker shown | P0 |
| R-02 | A Series B Indian startup (~200 employees) | Funding from Crunchbase; headcount from Apollo; buying signals present | P0 |
| R-03 | Small private Indian company (< 50 employees) | Partial card; MCA21 basic data present; fields marked unavailable where appropriate | P0 |
| R-04 | Company with recent funding (< 1 month ago) | "Recent Funding" signal shown with date and amount | P0 |
| R-05 | Company with new CHRO in last 90 days | "Leadership Change" signal shown | P0 |
| R-06 | Company with > 25% hiring increase | "Hiring Spike" signal shown | P0 |
| R-07 | Company using Taleo ATS (Naukri competitor) | "Uses competitor: Taleo" flag shown in tech stack | P0 |
| R-08 | Company with high AmbitionBox attrition signals | Attrition Risk: High; evidence cited | P1 |
| R-09 | Company that visited GA4 pricing page 3x this month | Intent Score > 70; pricing page visits shown | P1 |
| R-10 | Company already in Salesforce CRM | "In your CRM" flag; last contact date shown | P1 |
| R-11 | 50-company standard run (end-to-end) | Completes in < 5 minutes (p95) | P0 |
| R-12 | 500-company quick run | Completes in < 30 minutes (p95) | P1 |
| R-13 | Ambiguous name ("Apple") | Top 3 domain matches shown with confidence; auto-select highest confidence | P1 |
| R-14 | Unresolvable company | Card status: "Not Found"; graceful partial shown | P0 |
| R-15 | MCA21 API down (simulated) | Fallback to Tofler; partial card with source warning; run not failed | P1 |
| R-16 | All providers rate-limited for one company | Card stored with available data; error fields flagged; run continues | P0 |

### 14.3 Product Fitment Scoring

| TC | Scenario | Expected | Priority |
|----|----------|----------|----------|
| F-01 | Company exactly matching all ICP criteria | Fitment score ≥ 85 | P0 |
| F-02 | Company matching no ICP criteria | Fitment score ≤ 20 | P0 |
| F-03 | Company using direct competitor tool | techStackFit ≥ 80; "displacement opportunity" flag | P0 |
| F-04 | Company with active buying signals (funding + new hire) | buyingSignalFit ≥ 80 | P0 |
| F-05 | Company with GA4 pricing page visits | engagementFit ≥ 70 (if GA4 connected) | P1 |
| F-06 | User changes dimension weights | Fitment score recalculated correctly | P0 |
| F-07 | Product profile from uploaded PDF | Claude extracts correct capabilities, buyer personas, ICP criteria | P0 |
| F-08 | Product profile from free text ("We sell...") | Same as PDF extraction | P0 |
| F-09 | Contact recommendation for HR tech product | Primary: CHRO/Head of TA recommended | P0 |
| F-10 | Contact recommendation for IT infrastructure product | Primary: CTO/VP Engineering recommended | P0 |
| F-11 | Fitment for Naukri RMS vs. company not hiring | painPointFit low; risk flag shown | P1 |
| F-12 | Score breakdown visible in card | Each dimension score + evidence shown | P0 |

### 14.4 Team Dashboard

| TC | Scenario | Expected | Priority |
|----|----------|----------|----------|
| D-01 | Head of sales views all team runs | Sees all runs by all reps in workspace | P0 |
| D-02 | AE views another AE's run | 403 Forbidden | P0 |
| D-03 | Aggregate buying signals feed | Lists top signals across all recent runs | P1 |
| D-04 | Rep activity table | Correct counts per rep | P1 |
| D-05 | Filter by product | Only runs for that product shown | P1 |
| D-06 | Filter by date range | Correct filtering | P1 |

### 14.5 Integrations

| TC | Scenario | Expected | Priority |
|----|----------|----------|----------|
| I-01 | Salesforce OAuth connect | OAuth flow completes; connection shown as active | P0 |
| I-02 | Salesforce OAuth token expiry | Refresh token used; user not logged out | P1 |
| I-03 | Company found in Salesforce | "In CRM" flag shown; engagement data populated | P0 |
| I-04 | Company not in Salesforce | "Not in CRM" shown; engagement section empty | P0 |
| I-05 | HubSpot OAuth connect | Same as Salesforce | P0 |
| I-06 | GA4 connect + property selection | Properties listed; user selects one; intent data flows | P0 |
| I-07 | GTM snippet generated | Snippet is valid JS; contains correct measurement IDs | P0 |
| I-08 | Intent data appears on card after GTM fires | Company that triggered GTM event shows intent signal | P1 |

### 14.6 Security

| TC | Scenario | Expected | Priority |
|----|----------|----------|----------|
| S-01 | Unauthenticated API request | 401 Unauthorized | P0 |
| S-02 | User A accesses User B's run | 403 Forbidden | P0 |
| S-03 | SSRF via domain field ("http://169.254.169.254") | Domain rejected; 400 Bad Request | P0 |
| S-04 | SSRF via domain field ("localhost") | Same — rejected | P0 |
| S-05 | CSV formula injection in export | Formulas stripped; exported as plain text | P0 |
| S-06 | XSS in company name field | HTML entities escaped on render | P0 |
| S-07 | Oversized AI response (prompt stuffing attempt) | Response size limit enforced; parsed safely | P1 |
| S-08 | Rate limiting: > 10 runs/hour | 429 Too Many Requests | P1 |
| S-09 | Integration credentials in logs | No access tokens, refresh tokens, or API keys in log output | P0 |
| S-10 | Uploaded file containing executable | MIME type validation rejects non-CSV/Excel | P0 |

### 14.7 Performance

| TC | Scenario | Target | Priority |
|----|----------|--------|----------|
| P-01 | 50-company standard run | < 5 min (p95) | P0 |
| P-02 | 500-company quick run | < 30 min (p95) | P1 |
| P-03 | API read: GET /runs/:id/companies | < 300ms (p95) | P0 |
| P-04 | 20 concurrent users each with active runs | No degradation; queue managed | P1 |
| P-05 | SSE connection stability over 10-min run | No dropped events | P0 |
| P-06 | Dashboard load with 500 companies in table | < 1s render (virtual scrolling) | P1 |

---

## 15. Non-Functional Requirements

### Security
- All data in transit: TLS 1.3
- All data at rest: AES-256 (PostgreSQL transparent encryption + S3 server-side encryption)
- API keys (provider credentials): stored in environment secrets (Doppler or AWS SSM); never in code or DB
- SSRF protection: domain validation middleware rejects RFC 1918 addresses + localhost + metadata IP (169.254.169.254) before any HTTP request
- PII: contact names/titles are stored in company cards, not indexed separately; deleted on workspace deletion
- GDPR/PDPB (India): user data deletion cascade on account closure; data processing agreement with all providers

### Performance
- Research throughput: ≥ 20 companies/minute in Quick mode (configurable worker concurrency)
- API p95 latency: < 300ms for read endpoints
- UI initial load: < 2s (Lighthouse ≥ 85)
- Worker jobs: survive process restart (BullMQ persistent queue in Redis)

### Reliability
- Worker failures: failed jobs retried up to 3x with exponential backoff; then moved to dead-letter queue
- External API failures: per-provider circuit breaker (5 failures in 30s → open circuit for 60s)
- Partial cards: a company with < 30% field population is stored with a low confidence score; the run is not failed
- Uptime SLA: 99.5% (MVP)

### Data Quality
- AI output: Zod schema validation on every Claude response; retry up to 2x on failure; partial card on persistent failure
- Confidence scoring: per-field confidence (source quality × recency × cross-validation) and overall card confidence
- Freshness: all cards stamped with research timestamp; UI prompts re-run if card > 30 days old

---

## 16. Deployment & Infrastructure

### MVP Stack (Low Cost, India Region)

| Component | Service | Region | Est. Cost/mo |
|-----------|---------|--------|-------------|
| App hosting | Railway or Render | AP South (Singapore) | $20–50 |
| PostgreSQL | Supabase | AP South | $25 |
| Redis | Upstash | AP South | $10 |
| File storage | Cloudflare R2 | Global | ~$5 |
| Intent middleware | Cloudflare Workers | Global edge | Free–$5 |
| AI (Claude) | Anthropic API | — | Usage-based (~$50–200 at launch volume) |
| Error tracking | Sentry free tier | — | $0 |
| Email (auth/notifications) | Resend | — | Free tier |

**Total MVP infra: ~$120–300/month**

### CI/CD

```
GitHub Actions:
  On PR:
    - TypeScript typecheck
    - Unit tests (Jest/Vitest)
    - Integration tests (with Testcontainers: Postgres + Redis)
    - Lint (ESLint + Prettier)
    - Security scan (npm audit + Snyk)

  On merge to main:
    - All above
    - E2E tests (Playwright, staging environment)
    - AI eval suite (golden dataset, flag if quality drops)
    - Deploy to staging
    - Deploy to production (manual approval gate)
```

### Environment Strategy
- `development` — local, all external APIs mocked by default
- `staging` — real APIs, rate-limited; used for E2E tests
- `production` — full; monitored

---

## 17. Open Questions

| # | Question | Decision Needed By | Impact |
|---|----------|-------------------|--------|
| OQ-1 | Agent.ai ToS — is commercial use of their company research endpoint allowed? | Before launch | If no, drop Tier 0 entirely |
| OQ-2 | AmbitionBox scraping — they're an InfoEdge-owned property. Can InfoEdge (first customer) provide a data partnership/API? | Before build | High India coverage impact |
| OQ-3 | ~~MCA21 API registration~~ → **Resolved:** Use Tofler.in for MVP (instant API). Register MCA21 official API in background for V2. | — | Done |
| OQ-4 | ~~Apollo.io paid tier~~ → **Resolved:** Start with Apollo free tier (10K enrichment calls/month). Upgrade when volume demands. | — | Done |
| OQ-5 | ~~IPinfo vs Clearbit~~ → **Resolved:** Intent data pipeline (Clearbit + GA4) deferred to V2. Not in MVP. | — | Done |
| OQ-6 | ~~Named contacts~~ → **Resolved:** Deferred to V2. Role-based recommendations only in MVP. | — | Done |
| OQ-7 | ~~Naukri job posting API~~ → **Resolved:** Deferred to V2. Use public job board scraping for MVP. | — | Done |
| OQ-8 | PDPB compliance → **Resolved:** Deferred to V2. Legal review before US/global launch. | V2 | Low risk for India B2B company data in MVP |
| OQ-9 | ~~Plan limits~~ → **Resolved:** MVP limit = 50 companies/run. Demo mode = 1 company. No credit system in MVP. | — | Done |

---

*End of Quotatain Spec v1.2 — In Progress*
