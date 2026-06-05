/**
 * WhoisProvider — domain registration data via direct TCP WHOIS lookup.
 *
 * Zero npm dependencies — uses Node.js built-in `net` module.
 * Connects to whois.iana.org:43, follows referrals, extracts domain age
 * and registrar. Falls back gracefully on timeout or parse failure.
 */

import net from 'node:net'
import type { CompanyDataProvider, ProviderResult } from './base.js'

export class WhoisProvider implements CompanyDataProvider {
  readonly name = 'whois'

  async fetch(domain: string): Promise<ProviderResult | null> {
    if (!domain) return null
    const apex = apexDomain(domain)

    try {
      // First query IANA to find the authoritative WHOIS server
      const ianaRaw = await tcpWhois(apex, 'whois.iana.org', 6000)
      if (!ianaRaw) return null

      // Extract refer server from IANA response, or use IANA response directly
      const referMatch = ianaRaw.match(/^refer:\s*(.+)$/im)
      const authServer = referMatch?.[1]?.trim()
      const raw = authServer
        ? (await tcpWhois(apex, authServer, 8000)) ?? ianaRaw
        : ianaRaw

      const domainAgeYears = extractDomainAge(raw)
      const domainRegistrar = extractRegistrar(raw)

      if (domainAgeYears === null && domainRegistrar === null) return null

      return {
        source: this.name,
        confidence: 0.3,
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
  return domain.replace(/^www\./, '').split('/')[0].split('?')[0]
}

function tcpWhois(domain: string, server: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => { socket.destroy(); resolve(null) }, timeoutMs)

    const socket = net.createConnection({ host: server, port: 43 }, () => {
      socket.write(domain + '\r\n')
    })

    socket.setEncoding('utf8')
    socket.on('data', (chunk) => { data += chunk })
    socket.on('end', () => { clearTimeout(timer); resolve(data || null) })
    socket.on('error', () => { clearTimeout(timer); resolve(null) })
  })
}

function extractDomainAge(raw: string): number | null {
  const match = raw.match(/(?:creation date|created|registered on|domain registered)[:\s]+(\d{4})/i)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const thisYear = new Date().getFullYear()
  if (year < 1990 || year > thisYear) return null
  return thisYear - year
}

function extractRegistrar(raw: string): string | null {
  const match = raw.match(/registrar:\s*(.+)/i)
  if (!match) return null
  return match[1].trim().slice(0, 80)
}
