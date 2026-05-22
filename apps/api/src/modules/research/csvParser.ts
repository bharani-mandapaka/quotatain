export interface ParsedCompanyRow {
  name?: string
  domain?: string
  raw: Record<string, string>
}

export interface ParseResult {
  rows: ParsedCompanyRow[]
  duplicatesRemoved: number
  errors: string[]
}

// Fuzzy-match column headers to known field names
const NAME_HEADERS = ['company', 'company name', 'name', 'org', 'organization', 'account', 'account name', 'firm']
const DOMAIN_HEADERS = ['domain', 'website', 'url', 'web', 'site', 'company url', 'company website']

function detectColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim())
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate)
    if (idx !== -1) return idx
  }
  // Partial match
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate) || candidate.includes(h))
    if (idx !== -1) return idx
  }
  return -1
}

export function parseCsvBuffer(buffer: Buffer): ParseResult {
  const text = buffer.toString('utf-8').replace(/^﻿/, '') // strip BOM
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const errors: string[] = []

  if (lines.length < 2) {
    return { rows: [], duplicatesRemoved: 0, errors: ['File contains no data rows'] }
  }

  // Simple CSV split that handles quoted fields
  const splitLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0])
  const nameIdx = detectColumn(headers, NAME_HEADERS)
  const domainIdx = detectColumn(headers, DOMAIN_HEADERS)

  if (nameIdx === -1 && domainIdx === -1) {
    errors.push('Could not detect a company name or domain column. Please check your headers.')
  }

  const rows: ParsedCompanyRow[] = []
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = splitLine(lines[i])
      const raw: Record<string, string> = {}
      headers.forEach((h, idx) => { raw[h] = cols[idx] ?? '' })

      const name = nameIdx !== -1 ? cols[nameIdx]?.trim() : undefined
      const domain = domainIdx !== -1 ? cols[domainIdx]?.trim() : undefined

      if (!name && !domain) continue
      rows.push({ name: name || undefined, domain: domain || undefined, raw })
    } catch {
      errors.push(`Row ${i + 1}: Could not parse`)
    }
  }

  return { rows, duplicatesRemoved: 0, errors }
}
