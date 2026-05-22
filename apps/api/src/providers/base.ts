// Every external data provider implements this interface.
// This is the ports-and-adapters boundary — swap providers without touching pipeline logic.

export interface RawCompanyData {
  name?: string
  domain?: string
  description?: string
  industry?: string
  subIndustry?: string
  foundedYear?: number
  hqCity?: string
  hqState?: string
  hqCountry?: string
  companyType?: string
  headcount?: number
  headcount6MonthsAgo?: number
  headcount12MonthsAgo?: number
  revenueEstimated?: number
  revenueCurrency?: string
  revenueRange?: string
  // Funding
  fundingStage?: string
  totalRaised?: number
  lastRoundDate?: string
  lastRoundAmount?: number
  lastRoundStage?: string
  lastRoundInvestors?: string[]
  fundingHistory?: Array<{
    stage: string; amount?: number; currency?: string; date?: string; investors: string[]
  }>
  // India-specific
  cin?: string
  bseTicker?: string
  nseTicker?: string
  marketCapINR?: string
  stockPriceINR?: number
  mcaPaidUpCapital?: number
  annualRevenueFromMCA?: number
  netProfitFromMCA?: number
  directors?: string[]
  // Tech stack
  crm?: string
  ats?: string
  hris?: string
  erp?: string
  marketingTools?: string[]
  cloud?: string
  collaborationTools?: string[]
  analyticsTools?: string[]
  securityTools?: string[]
  otherTools?: string[]
  estimatedToolCount?: number
  // Hiring
  openRolesTotal?: number
  openRoles90DaysAgo?: number
  seniorHiresLast90Days?: string[]
  leadershipChange?: boolean
  leadershipChangeDetail?: string
  fresherHiringPct?: number
  avgTenureMonths?: number
  // Reviews
  ambitionBoxRating?: number
  ambitionBoxWLBRating?: number
  ambitionBoxMgmtRating?: number
  glassdoorRating?: number
  reviewSnippets?: string[]
  // News
  recentNews?: Array<{ headline: string; url: string; date: string; source: string }>
  // Logo
  logoUrl?: string
}

export interface ProviderResult {
  source: string
  confidence: number   // 0–1
  data: RawCompanyData
  fetchedAt: string
}

export interface CompanyDataProvider {
  readonly name: string
  fetch(domain: string, companyName?: string): Promise<ProviderResult | null>
}
