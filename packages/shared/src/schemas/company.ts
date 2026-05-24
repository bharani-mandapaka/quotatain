import { z } from 'zod'

// Helper: normalise a string to match one of the allowed enum values
// case-insensitively. Claude sometimes returns 'listed' instead of 'Listed'.
function caseInsensitiveEnum<T extends string>(values: readonly [T, ...T[]]) {
  return z.preprocess((val) => {
    if (typeof val !== 'string') return val
    const match = values.find(v => v.toLowerCase() === val.trim().toLowerCase())
    return match ?? val
  }, z.enum(values))
}

export const FundingStageSchema = caseInsensitiveEnum([
  'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D',
  'Series E+', 'Growth', 'Pre-IPO', 'Listed', 'Bootstrapped', 'Unknown',
] as const)

export const AttritionRiskSchema = caseInsensitiveEnum(['High', 'Medium', 'Low', 'Unknown'] as const)
export const HiringTrendSchema = caseInsensitiveEnum(['Growing', 'Stable', 'Shrinking', 'Unknown'] as const)

export const BuyingSignalSchema = z.object({
  signal: z.string(),
  detail: z.string(),
  date: z.string().nullable(),
  source: z.string(),
  weight: z.number().min(0).max(100),
})

export const TechStackSchema = z.object({
  crm: z.string().nullable(),
  ats: z.string().nullable(),
  hris: z.string().nullable(),
  erp: z.string().nullable(),
  marketing: z.array(z.string()),
  cloud: z.string().nullable(),
  collaboration: z.array(z.string()),
  analytics: z.array(z.string()),
  security: z.array(z.string()),
  other: z.array(z.string()),
  competitorFlag: z.string().nullable(),
  estimatedToolCount: z.number().nullable(),
})

export const FundingRoundSchema = z.object({
  stage: z.string(),
  amount: z.number().nullable(),
  currency: z.string().default('USD'),
  date: z.string().nullable(),
  investors: z.array(z.string()),
})

export const ContactRecommendationSchema = z.object({
  recommendedTitle: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  rationale: z.string(),
  detectedTitlesAtCompany: z.array(z.string()),
  outreachAngle: z.string(),
})

export const PainPointSchema = z.object({
  point: z.string(),
  evidence: z.string(),
  source: z.string(),
})

// Full intelligence card — this is what Claude must output
export const CompanyCardSchema = z.object({
  identity: z.object({
    name: z.string(),
    domain: z.string(),
    logoUrl: z.string().nullable(),
    description: z.string().nullable(),
    tagline: z.string().nullable(),
    industry: z.string().nullable(),
    subIndustry: z.string().nullable(),
    foundedYear: z.number().nullable(),
    hqCity: z.string().nullable(),
    hqState: z.string().nullable(),
    hqCountry: z.string().default('India'),
    companyType: caseInsensitiveEnum(['Private', 'Public', 'Subsidiary', 'NGO', 'Unknown'] as const),
    cin: z.string().nullable(),       // India: Company Identification Number
    bseTicker: z.string().nullable(),
    nseTicker: z.string().nullable(),
  }),
  scale: z.object({
    headcount: z.number().nullable(),
    headcount6MonthsAgo: z.number().nullable(),
    headcount12MonthsAgo: z.number().nullable(),
    headcountTrend: HiringTrendSchema,
    headcountGrowthPct6mo: z.number().nullable(),
    departmentBreakdown: z.record(z.number()).nullable(),
    revenueEstimated: z.number().nullable(),
    revenueCurrency: z.string().default('INR'),
    revenueRange: z.string().nullable(),
    revenueGrowthYoyPct: z.number().nullable(),
    mcaPaidUpCapital: z.number().nullable(),
  }),
  funding: z.object({
    stage: FundingStageSchema,
    totalRaised: z.number().nullable(),
    totalRaisedCurrency: z.string().default('USD'),
    lastRoundDate: z.string().nullable(),
    lastRoundAmount: z.number().nullable(),
    lastRoundStage: z.string().nullable(),
    lastRoundInvestors: z.array(z.string()),
    fundingHistory: z.array(FundingRoundSchema),
    ipoStatus: caseInsensitiveEnum(['Listed', 'Filed', 'NA'] as const).default('NA'),
    marketCapINR: z.string().nullable(),
    stockPriceINR: z.number().nullable(),
    annualRevenueFromMCA: z.number().nullable(),
    netProfitFromMCA: z.number().nullable(),
  }),
  hiring: z.object({
    openRolesTotal: z.number().nullable(),
    openRoles90DaysAgo: z.number().nullable(),
    hiringVelocity: HiringTrendSchema,
    hiringSpike: z.boolean(),
    rolesByDepartment: z.record(z.number()).nullable(),
    seniorHiresLast90Days: z.array(z.string()),
    leadershipChangeFlag: z.boolean(),
    leadershipChangeDetail: z.string().nullable(),
    fresherHiringPct: z.number().nullable(),
    fresherHiringSignal: caseInsensitiveEnum(['Scaling Fast', 'Cost Optimization', 'Normal', 'Unknown'] as const).nullable(),
    avgTenureMonths: z.number().nullable(),
    attritionRisk: AttritionRiskSchema,
    attritionEvidence: z.string().nullable(),
  }),
  techStack: TechStackSchema,
  buyingSignals: z.array(BuyingSignalSchema),
  painPoints: z.array(PainPointSchema),
  engagement: z.object({
    inCRM: z.boolean(),
    crmAccountId: z.string().nullable(),
    lastContactDate: z.string().nullable(),
    lastMeetingDate: z.string().nullable(),
    emailsSent90Days: z.number().nullable(),
    openOpportunity: z.boolean(),
    dealStage: z.string().nullable(),
    previousCustomer: z.boolean(),
  }).nullable(),
  intent: z.object({
    score: z.number().min(0).max(100),
    pricingPageVisits30Days: z.number(),
    productPageVisits30Days: z.number(),
    formStarted: z.boolean(),
    formCompleted: z.boolean(),
    contentDownloads30Days: z.number(),
    lastVisitDate: z.string().nullable(),
  }).nullable(),
  synthesis: z.object({
    talkingPoints: z.array(z.string()).min(1).max(5),
    buyingSignalSummary: z.string().nullable(),
    riskFlags: z.array(z.string()),
    fresherHiringInterpretation: z.string().nullable(),
    competitorDisplacementAngle: z.string().nullable(),
    confidenceScore: z.number().min(0).max(100),
  }),
  meta: z.object({
    researchedAt: z.string(),
    researchDepth: z.enum(['quick', 'standard', 'deep']),
    sourcesUsed: z.array(z.string()),
    dataFreshness: z.enum(['fresh', 'recent', 'stale']),
  }),
})

export type CompanyCard = z.infer<typeof CompanyCardSchema>
export type BuyingSignal = z.infer<typeof BuyingSignalSchema>
export type TechStack = z.infer<typeof TechStackSchema>
export type FundingStage = z.infer<typeof FundingStageSchema>
export type AttritionRisk = z.infer<typeof AttritionRiskSchema>
