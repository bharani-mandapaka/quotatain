import type { ProviderResult, RawCompanyData } from './base.js'

// Priority order: higher index = lower priority (first found wins per field)
const SOURCE_PRIORITY: Record<string, number> = {
  tofler: 10,       // India MCA data — highest authority for Indian financials
  apollo: 9,        // Best general company data
  crunchbase: 8,    // Best for funding
  nse: 8,           // Best for listed Indian companies
  builtwith: 7,     // Best for tech stack
  newsapi: 6,
  agentai: 5,
}

type FieldKey = keyof RawCompanyData

// Fields where we want to merge arrays rather than pick one value
const ARRAY_MERGE_FIELDS: FieldKey[] = [
  'marketingTools', 'collaborationTools', 'analyticsTools',
  'securityTools', 'otherTools', 'recentNews', 'reviewSnippets',
  'seniorHiresLast90Days', 'lastRoundInvestors', 'fundingHistory', 'directors',
]

export function mergeProviderResults(results: ProviderResult[]): {
  merged: RawCompanyData
  confidenceScore: number
  sourcesUsed: string[]
} {
  const sorted = [...results].sort(
    (a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0)
  )

  const merged: RawCompanyData = {}
  const sourcesUsed = sorted.map((r) => r.source)

  for (const result of sorted) {
    for (const [key, value] of Object.entries(result.data) as [FieldKey, any][]) {
      if (value === undefined || value === null) continue

      if (ARRAY_MERGE_FIELDS.includes(key)) {
        const existing = (merged[key] as any[]) ?? []
        if (Array.isArray(value)) {
          ;(merged as any)[key] = dedupe([...existing, ...value])
        }
      } else if (merged[key] === undefined) {
        // First non-null value from highest-priority source wins
        ;(merged as any)[key] = value
      }
    }
  }

  // Overall confidence: average of all provider confidences, weighted by source priority
  const weightedSum = sorted.reduce((sum, r) => sum + r.confidence * (SOURCE_PRIORITY[r.source] ?? 1), 0)
  const weightTotal = sorted.reduce((sum, r) => sum + (SOURCE_PRIORITY[r.source] ?? 1), 0)
  const confidenceScore = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) : 0

  return { merged, confidenceScore, sourcesUsed }
}

function dedupe(arr: any[]): any[] {
  if (arr.length === 0) return arr
  if (typeof arr[0] === 'string') return [...new Set(arr)]
  // For objects (news, funding rounds), dedupe by JSON
  const seen = new Set<string>()
  return arr.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
