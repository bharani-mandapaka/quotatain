/**
 * WhoisProvider — domain registration data via direct IANA WHOIS lookup.
 *
 * No API key required. Free. Used for domain age and registrar.
 * Falls back gracefully if lookup times out or returns no data.
 */

import { createRequire } from 'node:module'
import type { CompanyDataProvider, ProviderResult } from './base.js'

// whois is a CJS-only package; createRequire lets us use it safely from ESM
const _require = createRequire(import.meta.url)
const whoisLookup = _require('whois') as {
  lookup: (domain: string, opts: Record<string, unknown>, cb: (err: Error | null, data: string) => void) => void
}

export class WhoisProvider implements CompanyDataProvider {
  readonly name = 'whois'

  async fetch(domain: string): Promise<ProviderResult | null> {
    if (!domain) return null
    const apex = apexDomain(domain)

    try {
      const raw = await lookupWithTimeout(apex, 8000)
      if (!raw) return null

      const domainAgeYears = extractDomainAge(raw)
      const domainRegistrar = extractRegistrar(raw)

      if (domainAgeYears === null && domainRegistrar === null) return null

      return {
        source: this.name,
        confidence: 0.3, // supplementary data only
        data: { domainAgeYears, domainRegistrar },
        fetchedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apexDomain(domain: string): string {
  // Strip www. and any path
  return domain.replace(/^www\./, '').split('/')[0]
}

function lookupWithTimeout(domain: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    whoisLookup.lookup(domain, { timeout: timeoutMs - 500 }, (err, data) => {
      clearTimeout(timer)
      if (err || !data) return resolve(null)
      resolve(data)
    })
  })
}

function extractDomainAge(raw: string): number | null {
  // "Creation Date: 1997-06-12" or "created: 2001-10-17"
  const match = raw.match(/(?:creation date|created|registered on)[:\s]+(\d{4})/i)
  if (!match) return null
  const year = parseInt(match[1], 10)
  if (year < 1990 || year > new Date().getFullYear()) return null
  return new Date().getFullYear() - year
}

function extractRegistrar(raw: string): string | null {
  const match = raw.match(/registrar:\s*(.+)/i)
  if (!match) return null
  return match[1].trim().slice(0, 80)
}
