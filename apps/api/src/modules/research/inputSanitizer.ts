import type { CompanyInput } from '@quotatain/shared'

// Strip Excel/CSV formula injection from any string field
function sanitizeString(val: string): string {
  // Fields starting with =, +, -, @ are formula injection attempts
  return val.replace(/^[=+\-@\t\r]/, "'")
}

function normalizeDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim()
}

function isPrivateIp(domain: string): boolean {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^::1$/,
    /^metadata\.google\.internal$/i,
  ]
  return privatePatterns.some((p) => p.test(domain))
}

export function sanitizeCompanyInputs(inputs: CompanyInput[]): CompanyInput[] {
  const seen = new Set<string>()
  const result: CompanyInput[] = []

  for (const input of inputs) {
    const name = input.name ? sanitizeString(input.name.trim()) : undefined
    let domain = input.domain ? normalizeDomain(input.domain) : undefined

    if (domain && isPrivateIp(domain)) {
      // Silently drop SSRF-risk domains
      continue
    }

    const key = domain ?? name?.toLowerCase() ?? ''
    if (!key || seen.has(key)) continue
    seen.add(key)

    result.push({ name, domain })
  }

  return result
}
