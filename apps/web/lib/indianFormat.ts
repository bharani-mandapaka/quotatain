/**
 * Indian number formatting utilities.
 *
 * Indian number system:
 *   1 lakh  = 1,00,000   (100 thousand)
 *   1 crore = 1,00,00,000 (10 million)
 *
 * Rules used across the app:
 *   - INR amounts: ₹ prefix + crore (Cr) / lakh (L) notation
 *   - USD amounts: keep Western $M / $B - Indian business press still
 *     quotes USD in millions even internally
 *   - Plain counts (headcount, roles): Indian-locale commas (3,00,000)
 */

const CR = 1_00_00_000   // 10 million
const L  = 1_00_000      // 100 thousand

/**
 * Format a plain number in crore / lakh notation.
 * e.g. 300_000_000 → "30 Cr", 150_000 → "1.5 L", 9_500 → "9,500"
 */
export function fmtCrLakh(n: number): string {
  if (n >= CR) {
    const cr = n / CR
    // Always show full crore value with Indian comma grouping for readability.
    // e.g. 20,200 Cr (Infosys) is clearer than "20K Cr".
    if (cr >= 100)  return `${Math.round(cr).toLocaleString('en-IN')} Cr`
    return `${+cr.toFixed(2)} Cr`
  }
  if (n >= L) {
    const lk = n / L
    return `${+lk.toFixed(2)} L`
  }
  return n.toLocaleString('en-IN')
}

/** ₹-prefixed crore / lakh. Returns null if amount is null/undefined. */
export function fmtINR(n: number | null | undefined): string | null {
  if (n == null) return null
  return `₹${fmtCrLakh(n)}`
}

/**
 * Format a monetary amount respecting its currency.
 *   INR → ₹X Cr / ₹X L
 *   USD → $XM / $XB  (Indian VCs quote USD amounts in millions)
 */
export function fmtMoney(
  n: number | null | undefined,
  currency: string = 'USD',
): string | null {
  if (n == null) return null
  const cur = currency.toUpperCase()
  if (cur === 'INR') return fmtINR(n)
  // USD - use standard M/B since mixing "crore" with "$" confuses readers
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${+(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

/** Headcount / plain count with Indian comma grouping: 3,00,000 */
export function fmtCount(n: number | null | undefined): string | null {
  if (n == null) return null
  return n.toLocaleString('en-IN')
}

/**
 * Parse a revenue string Claude might emit ("$838.8M", "₹70,000 Cr", "28.4B")
 * and reformat it in Indian style.  Falls back to the original string if it
 * can't be parsed (never throws).
 */
export function normaliseRevenueString(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()

  // Already has ₹ - assume INR, re-parse the numeric part
  const inrMatch = s.match(/^₹\s*([\d.,]+)\s*(Cr|crore|L|lakh|K|M|B)?$/i)
  if (inrMatch) {
    const n = parseFloat(inrMatch[1].replace(/,/g, ''))
    const unit = (inrMatch[2] ?? '').toLowerCase()
    let val = n
    if (unit === 'cr' || unit === 'crore') val = n * CR
    else if (unit === 'l' || unit === 'lakh') val = n * L
    else if (unit === 'k') val = n * 1e3
    else if (unit === 'm') val = n * 1e6
    else if (unit === 'b') val = n * 1e9
    return fmtINR(val)
  }

  // USD string like "$838.8M", "28.4B", "$28.4B USD"
  const usdMatch = s.match(/^\$?\s*([\d.,]+)\s*(K|M|B|T)?\s*(USD)?$/i)
  if (usdMatch) {
    const n = parseFloat(usdMatch[1].replace(/,/g, ''))
    const unit = (usdMatch[2] ?? '').toLowerCase()
    let val = n
    if (unit === 'k') val = n * 1e3
    else if (unit === 'm') val = n * 1e6
    else if (unit === 'b') val = n * 1e9
    else if (unit === 't') val = n * 1e12
    return fmtMoney(val, 'USD')
  }

  return s   // unrecognised format - show as-is
}
