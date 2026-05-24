import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

const PERPLEXITY_AGENT_URL = 'https://api.perplexity.ai/v1/agent'

// System instruction: forces JSON-only output
const SYSTEM_INSTRUCTIONS = `You are a B2B company intelligence engine focused on Indian companies.
Your ONLY output is a valid JSON object — no markdown, no prose, no explanation.
Only include fields you have real data for. Never hallucinate. Omit unknown fields entirely.`

function buildPrompt(companyName: string, domain: string): string {
  return `Research the company "${companyName}" (website: ${domain}).
Use web search to find current information. Return ONLY this JSON (omit any field you are unsure about):

{
  "description": "one paragraph company description",
  "industry": "primary industry",
  "subIndustry": "sub-industry if known",
  "foundedYear": 2010,
  "hqCity": "city name",
  "hqState": "state if India",
  "hqCountry": "India",
  "companyType": "Public | Private | Bootstrapped | NGO",
  "headcount": 5000,
  "revenueRange": "₹500–1000 Cr or $10–50M",
  "fundingStage": "Seed | Series A | Series B | Series C | Growth | Listed | Bootstrapped",
  "totalRaised": 50000000,
  "lastRoundDate": "2024-01-15",
  "lastRoundAmount": 10000000,
  "lastRoundStage": "Series B",
  "lastRoundInvestors": ["Sequoia", "Accel"],
  "nseTicker": "INFY",
  "bseTicker": "500209",
  "marketCapINR": "₹8.5L Cr",
  "openRolesTotal": 120,
  "leadershipChange": false,
  "leadershipChangeDetail": "New CTO appointed Jan 2024",
  "crm": "Salesforce",
  "ats": "Darwinbox",
  "cloud": "AWS",
  "recentNews": [
    { "headline": "...", "url": "https://...", "date": "2024-01-01", "source": "Economic Times" }
  ]
}`
}

export class PerplexityProvider implements CompanyDataProvider {
  readonly name = 'perplexity'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(domain: string, companyName?: string): Promise<ProviderResult | null> {
    const name = companyName ?? domain
    if (!name) return null

    try {
      const response = await axios.post(
        PERPLEXITY_AGENT_URL,
        {
          model: 'perplexity/sonar',
          input: buildPrompt(name, domain),
          instructions: SYSTEM_INSTRUCTIONS,
          tools: [{ type: 'web_search' }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45_000, // web search can be slow
        }
      )

      // Perplexity provides a top-level output_text convenience field
      const text: string =
        response.data?.output_text ??
        extractTextFromOutput(response.data?.output ?? [])

      if (!text) return null

      const parsed = extractJson(text)
      if (!parsed) {
        console.warn('[perplexity] could not extract JSON from response')
        return null
      }

      const data = mapToRawCompanyData(parsed)
      const confidence = computeConfidence(data)

      return {
        source: this.name,
        confidence,
        data,
        fetchedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:perplexity')
      if (err?.response?.status === 401) {
        console.error('[perplexity] invalid API key')
        return null
      }
      console.error('[perplexity] fetch error:', err?.message)
      return null
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTextFromOutput(output: any[]): string {
  let text = ''
  for (const item of output) {
    if (item.type === 'message') {
      const content = item.content
      if (typeof content === 'string') {
        text += content
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'output_text' || part.type === 'text') {
            text += part.text ?? ''
          }
        }
      }
    }
  }
  return text
}

function extractJson(text: string): Record<string, any> | null {
  // Try direct parse
  try { return JSON.parse(text.trim()) } catch {}

  // Extract from ```json ... ``` or ``` ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()) } catch {}
  }

  // Find the first { ... } block
  const jsonBlock = text.match(/\{[\s\S]*\}/)
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[0]) } catch {}
  }

  return null
}

function mapToRawCompanyData(p: Record<string, any>): RawCompanyData {
  return {
    description:           p.description,
    industry:              p.industry,
    subIndustry:           p.subIndustry,
    foundedYear:           toNumber(p.foundedYear),
    hqCity:                p.hqCity,
    hqState:               p.hqState,
    hqCountry:             p.hqCountry,
    companyType:           p.companyType,
    headcount:             toNumber(p.headcount),
    revenueRange:          p.revenueRange,
    fundingStage:          p.fundingStage,
    totalRaised:           toNumber(p.totalRaised),
    lastRoundDate:         p.lastRoundDate,
    lastRoundAmount:       toNumber(p.lastRoundAmount),
    lastRoundStage:        p.lastRoundStage,
    lastRoundInvestors:    Array.isArray(p.lastRoundInvestors) ? p.lastRoundInvestors : undefined,
    nseTicker:             p.nseTicker,
    bseTicker:             p.bseTicker,
    marketCapINR:          p.marketCapINR,
    openRolesTotal:        toNumber(p.openRolesTotal),
    leadershipChange:      typeof p.leadershipChange === 'boolean' ? p.leadershipChange : undefined,
    leadershipChangeDetail: p.leadershipChangeDetail,
    crm:                   p.crm,
    ats:                   p.ats,
    cloud:                 p.cloud,
    recentNews:            Array.isArray(p.recentNews) ? p.recentNews : undefined,
  }
}

function toNumber(val: any): number | undefined {
  if (val === undefined || val === null) return undefined
  const n = Number(val)
  return isNaN(n) ? undefined : n
}

function computeConfidence(data: RawCompanyData): number {
  const fields: (keyof RawCompanyData)[] = [
    'description', 'industry', 'headcount', 'hqCity',
    'fundingStage', 'recentNews', 'openRolesTotal',
  ]
  const found = fields.filter((f) => data[f] !== undefined).length
  // Perplexity uses live web search — base confidence 0.65, up to 0.85
  return Math.min(0.65 + (found / fields.length) * 0.20, 0.85)
}
