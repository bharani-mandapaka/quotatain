import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

const APOLLO_BASE = 'https://api.apollo.io/v1'

export class ApolloProvider implements CompanyDataProvider {
  readonly name = 'apollo'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(domain: string, companyName?: string): Promise<ProviderResult | null> {
    try {
      const response = await axios.post(
        `${APOLLO_BASE}/organizations/enrich`,
        { domain },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apiKey,
          },
          timeout: 10000,
        }
      )

      const org = response.data?.organization
      if (!org) return null

      const data: RawCompanyData = {
        name: org.name,
        domain: org.primary_domain ?? domain,
        description: org.short_description ?? org.long_description,
        industry: org.industry,
        subIndustry: org.sub_industry,
        foundedYear: org.founded_year,
        hqCity: org.city,
        hqState: org.state,
        hqCountry: org.country,
        companyType: org.publicly_traded_symbol ? 'Public' : 'Private',
        headcount: org.estimated_num_employees,
        revenueEstimated: org.annual_revenue,
        revenueCurrency: 'USD',
        revenueRange: org.annual_revenue_printed,
        fundingStage: mapFundingStage(org.latest_funding_stage),
        totalRaised: org.total_funding,
        lastRoundDate: org.latest_funding_round_date,
        lastRoundAmount: org.latest_funding_amount,
        lastRoundStage: org.latest_funding_stage,
        lastRoundInvestors: org.latest_funding_investors ?? [],
        fundingHistory: (org.funding_rounds ?? []).map((r: any) => ({
          stage: r.round_type,
          amount: r.amount,
          currency: 'USD',
          date: r.funded_at,
          investors: r.investors?.map((i: any) => i.name) ?? [],
        })),
        logoUrl: org.logo_url,
        crm: detectTool(org.technology_names, CRM_TOOLS),
        ats: detectTool(org.technology_names, ATS_TOOLS),
        cloud: detectTool(org.technology_names, CLOUD_TOOLS),
      }

      // Confidence based on data completeness
      const populated = Object.values(data).filter((v) => v !== undefined && v !== null).length
      const confidence = Math.min(populated / 15, 1)

      return { source: this.name, confidence, data, fetchedAt: new Date().toISOString() }
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:apollo')
      throw err
    }
  }
}

function mapFundingStage(stage?: string): string {
  if (!stage) return 'Unknown'
  const map: Record<string, string> = {
    seed: 'Seed',
    series_a: 'Series A',
    series_b: 'Series B',
    series_c: 'Series C',
    series_d: 'Series D',
    series_e: 'Series E+',
    ipo: 'Listed',
    private_equity: 'Growth',
    venture: 'Seed',
  }
  return map[stage.toLowerCase().replace(/[^a-z_]/g, '_')] ?? stage
}

function detectTool(tools: string[] = [], candidates: string[]): string | undefined {
  for (const tool of tools) {
    const match = candidates.find((c) => tool.toLowerCase().includes(c.toLowerCase()))
    if (match) return match
  }
  return undefined
}

const CRM_TOOLS = ['Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive', 'Microsoft Dynamics', 'Freshsales', 'LeadSquared']
const ATS_TOOLS = ['Taleo', 'Workday', 'Greenhouse', 'Lever', 'iCIMS', 'SAP SuccessFactors', 'Smart Recruiters', 'Keka', 'Darwinbox', 'Zoho Recruit']
const CLOUD_TOOLS = ['AWS', 'Amazon Web Services', 'Google Cloud', 'Microsoft Azure', 'Azure']
