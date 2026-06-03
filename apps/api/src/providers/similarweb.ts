/**
 * SimilarWebProvider — web traffic data via Tavily search fallback.
 *
 * Queries "site:similarweb.com {domain}" to extract monthly visits,
 * traffic trend, and top traffic countries from the public SimilarWeb
 * overview page snippet. Works ~60% of the time for major companies.
 *
 * Upgrade path: swap the Tavily query with a direct SimilarWeb API call
 * by adding SIMILARWEB_API_KEY to Railway env vars.
 */

import axios from 'axios'
import type { CompanyDataProvider, ProviderResult } from './base.js'

const TAVILY_URL = 'https://api.tavily.com/search'

export class SimilarWebProvider implements CompanyDataProvider {
  readonly name = 'similarweb'
  private tavilyKey: string

  constructor(tavilyKey: string) {
    this.tavilyKey = tavilyKey
  }

  async fetch(domain: string, companyName?: string): Promise<ProviderResult | null> {
    if (!domain && !companyName) return null
    const apex = domain.replace(/^www\./, '').split('/')[0]

    try {
      const res = await axios.post(
        TAVILY_URL,
        {
          query: `site:similarweb.com "${apex}" monthly visits traffic`,
          search_depth: 'basic',
          topic: 'general',
          include_answer: 'basic',
          max_results: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.tavilyKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 12_000,
        },
      )

      const tavilyData = res.data as { answer?: string; results: Array<{ content: string }> }
      const text = [
        tavilyData.answer ?? '',
        ...(tavilyData.results ?? []).map((r) => r.content),
      ].join(' ')

      if (!text.trim()) return null

      const estimatedMonthlyVisits = extractMonthlyVisits(text)
      const trafficTrend = extractTrafficTrend(text)
      const topTrafficCountries = extractTopCountries(text)

      if (estimatedMonthlyVisits === null && trafficTrend === 'unknown' && topTrafficCountries.length === 0) {
        return null
      }

      return {
        source: this.name,
        confidence: 0.35, // web snippet — directional, not precise
        data: { estimatedMonthlyVisits, trafficTrend, topTrafficCountries },
        fetchedAt: new Date().toISOString(),
      }
    } catch {
      return null // non-blocking — traffic data is supplementary
    }
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function extractMonthlyVisits(text: string): number | null {
  // "12.5M visits/month", "1.2B monthly visits", "500K visits"
  const m = text.match(/(\d[\d,.]+)\s*([KMB])?\s*(?:monthly\s+)?visits?/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, ''))
  const unit = (m[2] ?? '').toUpperCase()
  if (unit === 'B') return Math.round(n * 1e9)
  if (unit === 'M') return Math.round(n * 1e6)
  if (unit === 'K') return Math.round(n * 1e3)
  return Math.round(n)
}

function extractTrafficTrend(text: string): 'growing' | 'stable' | 'declining' | 'unknown' {
  const lower = text.toLowerCase()
  if (/traffic (?:grew|increased|up|rising|growth)/i.test(lower)) return 'growing'
  if (/traffic (?:declined|decreased|down|falling|drop)/i.test(lower)) return 'declining'
  if (/traffic (?:stable|flat|unchanged|similar)/i.test(lower)) return 'stable'
  return 'unknown'
}

function extractTopCountries(text: string): string[] {
  // SimilarWeb pages often list "Top Countries: India (42%), United States (18%)"
  const m = text.match(/top\s+(?:traffic\s+)?countr(?:y|ies)[:\s]+([^.]+)/i)
  if (!m) return []
  return m[1]
    .split(/[,;]/)
    .map((c) => c.replace(/\([\d.%]+\)/, '').trim())
    .filter((c) => c.length > 0 && c.length < 40)
    .slice(0, 5)
}
