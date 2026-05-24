/**
 * TavilyProvider — web-search enrichment via Tavily AI Search API.
 *
 * Free tier: 1000 searches/month, no credit card required.
 * Sign up at https://app.tavily.com/home → copy API key.
 *
 * Strategy: two parallel searches per company
 *   1. Overview — description, industry, headcount, funding, HQ
 *   2. News/hiring — recent news, leadership changes, open roles
 * Results are merged and mapped to RawCompanyData using the AI-generated
 * `answer` field (synthesised summary) + snippet heuristics.
 */

import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

const TAVILY_URL = 'https://api.tavily.com/search'

export class TavilyProvider implements CompanyDataProvider {
  readonly name = 'tavily'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(domain: string, companyName?: string): Promise<ProviderResult | null> {
    const name = companyName ?? domain
    if (!name) return null

    try {
      const [overviewRes, newsRes] = await Promise.allSettled([
        this.search(
          `"${name}" company India overview employees headcount funding headquarters industry`,
          'advanced',
          'general',
        ),
        this.search(
          `"${name}" India news 2025 hiring leadership announcement`,
          'basic',
          'news',
        ),
      ])

      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value : null

      if (!overview && !newsData) return null

      const data = this.extractCompanyData(name, overview, newsData)
      const confidence = this.computeConfidence(data)

      return {
        source: this.name,
        confidence,
        data,
        fetchedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:tavily')
      if (err?.response?.status === 401) {
        console.error('[tavily] invalid API key')
        return null
      }
      console.error('[tavily] fetch error:', err?.message)
      return null
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async search(
    query: string,
    searchDepth: 'basic' | 'advanced',
    topic: 'general' | 'news',
  ) {
    const res = await axios.post(
      TAVILY_URL,
      {
        query,
        search_depth: searchDepth,
        topic,
        include_answer: 'basic',
        max_results: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20_000,
      },
    )
    return res.data as TavilyResponse
  }

  private extractCompanyData(
    companyName: string,
    overview: TavilyResponse | null,
    news: TavilyResponse | null,
  ): RawCompanyData {
    const allSnippets = [
      ...(overview?.results ?? []).map((r) => r.content),
      ...(news?.results ?? []).map((r) => r.content),
    ].join(' ')

    const data: RawCompanyData = {}

    // Description from the AI-synthesised answer
    if (overview?.answer) {
      data.description = overview.answer.trim()
    }

    // Headcount — patterns: "2,500 employees", "headcount of 12000", "~5k employees"
    const headcountMatch = allSnippets.match(
      /(?:employs?|headcount[^\d]*|workforce[^\d]*|staff[^\d]*)(\d[\d,]+)\s*(?:employees?|people|professionals?|staff)?/i,
    ) ?? allSnippets.match(/(\d[\d,]+)\s*employees?/i)
    if (headcountMatch) {
      data.headcount = parseInt(headcountMatch[1].replace(/,/g, ''), 10)
    }

    // Funding — "raised \$50M", "Series B funding", "$100 million"
    const fundingMatch = allSnippets.match(
      /raised\s+\$?([\d,.]+)\s*([MBK](?:illion|n)?)/i,
    )
    if (fundingMatch) {
      const amount = parseFloat(fundingMatch[1].replace(/,/g, ''))
      const unit = fundingMatch[2].toUpperCase()
      data.totalRaised = unit.startsWith('B')
        ? amount * 1_000_000_000
        : unit.startsWith('M')
          ? amount * 1_000_000
          : amount * 1_000
    }

    // Funding stage
    const stageMatch = allSnippets.match(
      /\b(Seed|Pre-Seed|Series [A-F]|Growth|Late[- ]Stage|IPO|Listed|Bootstrapped|Profitable)\b/i,
    )
    if (stageMatch) data.fundingStage = stageMatch[1]

    // HQ city — "headquartered in Bangalore", "based in Mumbai"
    const hqMatch = allSnippets.match(
      /(?:headquartered|based|offices?)\s+in\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
    )
    if (hqMatch) {
      data.hqCity = hqMatch[1]
      data.hqCountry = 'India'
    }

    // Industry — best-effort from overview answer
    const industryMatch = allSnippets.match(
      /\b(SaaS|FinTech|EdTech|HealthTech|HRTech|E-commerce|Logistics|Manufacturing|IT Services?|BFSI|Retail|Real Estate|Media|Telecom|Pharma|Agriculture)\b/i,
    )
    if (industryMatch) data.industry = industryMatch[1]

    // NSE/BSE ticker
    const nseMatch = allSnippets.match(/NSE[:\s]+([A-Z]{2,10})/)
    if (nseMatch) data.nseTicker = nseMatch[1]
    const bseMatch = allSnippets.match(/BSE[:\s]+(\d{6})/)
    if (bseMatch) data.bseTicker = bseMatch[1]

    // Leadership change
    const leadershipMatch = allSnippets.match(
      /(?:new|appointed|named|joins as)\s+(?:CEO|CTO|CFO|COO|MD|President)/i,
    )
    if (leadershipMatch) {
      data.leadershipChange = true
      data.leadershipChangeDetail = leadershipMatch[0]
    }

    // Open roles — "hiring 200 people", "500 open positions"
    const rolesMatch = allSnippets.match(/(\d+)\s+(?:open\s+)?(?:job|position|role|vacanc)/i)
    if (rolesMatch) data.openRolesTotal = parseInt(rolesMatch[1], 10)

    // Recent news from news search results
    const newsArticles = (news?.results ?? [])
      .filter((r) => r.title && r.url)
      .slice(0, 5)
      .map((r) => ({
        headline: r.title,
        url: r.url,
        date: r.published_date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        source: extractDomain(r.url),
      }))
    if (newsArticles.length > 0) data.recentNews = newsArticles

    return data
  }

  private computeConfidence(data: RawCompanyData): number {
    const coreFields: (keyof RawCompanyData)[] = [
      'description', 'industry', 'headcount', 'hqCity', 'fundingStage', 'recentNews',
    ]
    const found = coreFields.filter((f) => data[f] !== undefined).length
    // Base 0.55 (web snippets are noisier than structured APIs), up to 0.75
    return Math.min(0.55 + (found / coreFields.length) * 0.20, 0.75)
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

interface TavilyResponse {
  query: string
  answer?: string
  results: TavilyResult[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
