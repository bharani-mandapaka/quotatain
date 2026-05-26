import axios from 'axios'

const APOLLO_BASE = 'https://api.apollo.io/v1'

export type ContactPersona = 'economicBuyer' | 'champion' | 'technicalEvaluator' | 'other'

export interface Contact {
  apolloId: string
  name: string
  firstName: string
  lastName: string
  title: string
  seniority: string | null
  departments: string[]
  linkedinUrl: string | null
  email: string | null          // null until revealed
  emailStatus: string | null    // 'verified' | 'likely to engage' | etc.
  photoUrl: string | null
  persona: ContactPersona
  relevanceScore: number        // 0–100
}

export interface FitmentContacts {
  economicBuyer: { recommendedTitle: string; detectedTitlesAtCompany?: string[] }
  champion: { recommendedTitle: string; detectedTitlesAtCompany?: string[] }
  technicalEvaluator?: { recommendedTitle: string; detectedTitlesAtCompany?: string[] } | null
}

// ─── Main search function ─────────────────────────────────────────────────────

export async function searchContacts(
  apiKey: string,
  domain: string,
  fitmentContacts: FitmentContacts,
  companyName?: string,
): Promise<Contact[]> {
  // Build a flat list of all title keywords across all personas
  const allTitles = buildTitleKeywords(fitmentContacts)

  // Call Apollo people search
  const people = await apolloPeopleSearch(apiKey, domain, allTitles)
  if (!people.length) return []

  // Assign persona + score to each person, sort by relevance
  const scored = people
    .map(p => assignPersona(p, fitmentContacts))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  // De-duplicate by Apollo ID (search can return duplicates)
  const seen = new Set<string>()
  return scored.filter(c => {
    if (seen.has(c.apolloId)) return false
    seen.add(c.apolloId)
    return true
  })
}

// ─── LinkedIn URL match ───────────────────────────────────────────────────────

export async function matchPersonByLinkedIn(apiKey: string, linkedinUrl: string): Promise<Contact | null> {
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/people/match`,
      {
        api_key: apiKey,
        linkedin_url: linkedinUrl,
        reveal_personal_emails: false,
        reveal_phone_number: false,
      },
      {
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        timeout: 15000,
      }
    )
    const p = res.data?.person
    if (!p) return null
    const name = p.name ?? [p.first_name, p.last_name].filter(Boolean).join(' ')
    return {
      apolloId: p.id,
      name,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      title: p.title ?? '',
      seniority: p.seniority ?? null,
      departments: p.departments ?? [],
      linkedinUrl,
      email: p.email && !p.email.includes('*') ? p.email : null,
      emailStatus: p.email_status ?? null,
      photoUrl: p.photo_url ?? null,
      persona: 'other',
      relevanceScore: 50,
    }
  } catch (err: any) {
    if (err?.response?.status === 403) throw new Error('APOLLO_PLAN:people_match requires an Apollo API plan upgrade')
    if (err?.response?.status === 404 || err?.response?.status === 422) return null
    throw err
  }
}

// ─── Email reveal ─────────────────────────────────────────────────────────────

export async function revealEmail(apiKey: string, apolloId: string): Promise<string | null> {
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/people/match`,
      { id: apolloId, reveal_personal_emails: false, reveal_phone_number: false },
      {
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        timeout: 10000,
      }
    )
    return res.data?.person?.email ?? null
  } catch {
    return null
  }
}

// ─── Internals ────────────────────────────────────────────────────────────────

function buildTitleKeywords(fc: FitmentContacts): string[] {
  const titles: string[] = []

  const add = (t?: string) => {
    if (!t) return
    // Extract the core role words (e.g. "Head of Talent Acquisition" → ["Head of Talent Acquisition", "TA", "CHRO"])
    titles.push(t)
    // Add common abbreviation expansions
    const lower = t.toLowerCase()
    if (lower.includes('chief human resource') || lower.includes('chro')) titles.push('CHRO')
    if (lower.includes('chief people')) titles.push('CPO', 'Chief People')
    if (lower.includes('talent acquisition') || lower.includes(' ta ') || lower.includes(' ta,')) titles.push('Talent Acquisition', 'TA')
    if (lower.includes('head of hr') || lower.includes('vp hr') || lower.includes('vp of hr')) titles.push('VP HR', 'Head of HR')
    if (lower.includes('it director') || lower.includes('cto') || lower.includes('vp engineering')) titles.push('CTO', 'IT Director')
  }

  add(fc.economicBuyer.recommendedTitle)
  fc.economicBuyer.detectedTitlesAtCompany?.forEach(add)
  add(fc.champion.recommendedTitle)
  fc.champion.detectedTitlesAtCompany?.forEach(add)
  if (fc.technicalEvaluator) {
    add(fc.technicalEvaluator.recommendedTitle)
    fc.technicalEvaluator.detectedTitlesAtCompany?.forEach(add)
  }

  // Deduplicate
  return [...new Set(titles)].slice(0, 10) // Apollo caps person_titles at ~10
}

async function apolloPeopleSearch(
  apiKey: string,
  domain: string,
  titles: string[],
): Promise<any[]> {
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/people/search`,
      {
        api_key: apiKey,             // some Apollo plans require key in body
        organization_domains: [domain],
        person_titles: titles,
        per_page: 25,
        page: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        timeout: 15000,
      }
    )
    return res.data?.people ?? []
  } catch (err: any) {
    if (err?.response?.status === 429) throw new Error('RATE_LIMITED:apollo_people')
    if (err?.response?.status === 422) return [] // bad domain, no results
    if (err?.response?.status === 403) throw new Error('APOLLO_PLAN:people_search requires an Apollo API plan upgrade')
    throw err
  }
}

function assignPersona(person: any, fc: FitmentContacts): Contact {
  const title = (person.title ?? '').toLowerCase()
  const name = person.name ?? [person.first_name, person.last_name].filter(Boolean).join(' ')

  // Score how closely this person's title matches each persona
  const ebScore = titleMatch(title, fc.economicBuyer.recommendedTitle, fc.economicBuyer.detectedTitlesAtCompany)
  const chScore = titleMatch(title, fc.champion.recommendedTitle, fc.champion.detectedTitlesAtCompany)
  const teScore = fc.technicalEvaluator
    ? titleMatch(title, fc.technicalEvaluator.recommendedTitle, fc.technicalEvaluator.detectedTitlesAtCompany)
    : 0

  const best = Math.max(ebScore, chScore, teScore)
  const persona: ContactPersona =
    best === 0          ? 'other' :
    ebScore >= chScore && ebScore >= teScore ? 'economicBuyer' :
    chScore >= teScore  ? 'champion' : 'technicalEvaluator'

  // Seniority bonus: C-suite/VP/Director rank higher
  const seniorityBonus = seniorityScore(person.seniority)

  return {
    apolloId: person.id,
    name,
    firstName: person.first_name ?? '',
    lastName: person.last_name ?? '',
    title: person.title ?? '',
    seniority: person.seniority ?? null,
    departments: person.departments ?? [],
    linkedinUrl: person.linkedin_url ?? null,
    email: person.email && !person.email.includes('*') ? person.email : null,
    emailStatus: person.email_status ?? null,
    photoUrl: person.photo_url ?? null,
    persona,
    relevanceScore: Math.min(100, best + seniorityBonus),
  }
}

function titleMatch(
  personTitle: string,
  recommendedTitle: string,
  detected?: string[],
): number {
  const recommended = recommendedTitle.toLowerCase()
  const allTargets = [recommended, ...(detected ?? []).map(t => t.toLowerCase())]

  let best = 0
  for (const target of allTargets) {
    const targetWords = target.split(/\s+/).filter(w => w.length > 2)
    const matches = targetWords.filter(w => personTitle.includes(w)).length
    const score = targetWords.length > 0 ? (matches / targetWords.length) * 80 : 0
    if (score > best) best = score
  }
  return Math.round(best)
}

function seniorityScore(seniority?: string): number {
  const map: Record<string, number> = {
    c_suite: 20, vp: 15, director: 10, manager: 5, senior: 3,
  }
  return map[seniority?.toLowerCase() ?? ''] ?? 0
}
