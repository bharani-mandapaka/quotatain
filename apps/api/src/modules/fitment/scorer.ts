import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { CompanyCard, ProductProfile, FitmentScore, DimensionWeights } from '@quotatain/shared'
import { FitmentScoreSchema } from '@quotatain/shared'

const client = new Anthropic()

// ─── Deterministic scorers ─────────────────────────────────────────────────

function scoreIndustryFit(card: CompanyCard, profile: ProductProfile): { score: number; evidence: string } {
  const companyIndustry = card.identity.industry?.toLowerCase() ?? ''
  const companySubIndustry = card.identity.subIndustry?.toLowerCase() ?? ''
  const targets = profile.targetIndustries.map((i) => i.toLowerCase())

  if (targets.length === 0) return { score: 50, evidence: 'No target industries configured' }

  for (const target of targets) {
    if (companyIndustry.includes(target) || target.includes(companyIndustry)) {
      return { score: 100, evidence: `Industry "${card.identity.industry}" is an exact match` }
    }
    if (companySubIndustry.includes(target) || target.includes(companySubIndustry)) {
      return { score: 80, evidence: `Sub-industry "${card.identity.subIndustry}" closely matches` }
    }
  }

  // Adjacent industry check (simple keyword overlap)
  const cardWords = new Set([...companyIndustry.split(/\W+/), ...companySubIndustry.split(/\W+/)])
  for (const target of targets) {
    const targetWords = target.split(/\W+/)
    if (targetWords.some((w) => w.length > 3 && cardWords.has(w))) {
      return { score: 40, evidence: `Partial industry overlap with target "${target}"` }
    }
  }

  return { score: 10, evidence: `Industry "${card.identity.industry}" does not match targets: ${profile.targetIndustries.join(', ')}` }
}

function scoreSizeFit(card: CompanyCard, profile: ProductProfile): { score: number; evidence: string } {
  const headcount = card.scale.headcount
  const min = profile.targetHeadcountMin
  const max = profile.targetHeadcountMax

  if (!headcount) return { score: 40, evidence: 'Headcount unknown — cannot score size fit' }
  if (!min && !max) return { score: 50, evidence: 'No size target configured' }

  const lo = min ?? 0
  const hi = max ?? Infinity

  if (headcount >= lo && headcount <= hi) {
    return { score: 100, evidence: `Headcount ${headcount.toLocaleString()} is within target range ${lo}–${hi === Infinity ? '∞' : hi}` }
  }

  const midpoint = hi === Infinity ? lo * 2 : (lo + hi) / 2
  const deviation = Math.abs(headcount - midpoint) / midpoint
  if (deviation < 0.25) return { score: 70, evidence: `Headcount ${headcount.toLocaleString()} is within 25% of target range` }
  if (deviation < 0.5) return { score: 40, evidence: `Headcount ${headcount.toLocaleString()} is within 50% of target range` }
  return { score: 10, evidence: `Headcount ${headcount.toLocaleString()} is far outside target range` }
}

function scoreTechStackFit(card: CompanyCard, profile: ProductProfile): { score: number; evidence: string } {
  const { crm, ats, hris, erp, other } = card.techStack
  const allTools = [crm, ats, hris, erp, ...(other ?? [])].filter(Boolean).map((t) => t!.toLowerCase())
  const competitors = profile.displacedCompetitors.map((c) => c.toLowerCase())
  const required = profile.requiredTechStack.map((r) => r.toLowerCase())

  // Check if they already use YOUR product (handled separately as "existing customer")
  // Check if they use a direct competitor
  for (const comp of competitors) {
    const match = allTools.find((t) => t.includes(comp) || comp.includes(t))
    if (match) {
      return { score: 90, evidence: `Uses competitor "${match}" — strong displacement opportunity` }
    }
  }

  // Check if they use required/compatible tech
  const compatibleFound: string[] = []
  for (const req of required) {
    const match = allTools.find((t) => t.includes(req) || req.includes(t))
    if (match) compatibleFound.push(match)
  }

  if (compatibleFound.length > 0) {
    return { score: 75, evidence: `Compatible tech detected: ${compatibleFound.join(', ')}` }
  }

  if (allTools.length === 0) {
    return { score: 50, evidence: 'Tech stack unknown — cannot score' }
  }

  return { score: 35, evidence: 'No compatible or competing tools detected in their stack' }
}

function scoreBuyingSignalFit(card: CompanyCard): { score: number; evidence: string } {
  if (card.buyingSignals.length === 0) {
    return { score: 20, evidence: 'No active buying signals detected' }
  }

  const totalWeight = card.buyingSignals.reduce((sum, s) => sum + s.weight, 0)
  const score = Math.min(100, 20 + totalWeight)
  const topSignals = card.buyingSignals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => s.signal)
    .join(', ')

  return { score, evidence: `Active signals: ${topSignals}` }
}

function scoreEngagementFit(card: CompanyCard): { score: number; evidence: string } {
  if (!card.engagement && !card.intent) {
    return { score: 0, evidence: 'No CRM or intent data available — connect integrations to score' }
  }

  let score = 0
  const signals: string[] = []

  if (card.intent) {
    if (card.intent.pricingPageVisits30Days > 0) {
      score += 40
      signals.push(`Visited pricing page ${card.intent.pricingPageVisits30Days}x this month`)
    }
    if (card.intent.productPageVisits30Days > 0) {
      score += 20
      signals.push(`Visited product pages ${card.intent.productPageVisits30Days}x`)
    }
    if (card.intent.formCompleted) { score += 40; signals.push('Submitted demo request') }
    else if (card.intent.formStarted) { score += 15; signals.push('Started demo request form') }
    if (card.intent.contentDownloads30Days > 0) { score += 10; signals.push('Downloaded content') }
  }

  if (card.engagement) {
    if (card.engagement.openOpportunity) { score += 20; signals.push('Open opportunity in CRM') }
    else if (card.engagement.lastContactDate) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(card.engagement.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysAgo < 30) { score += 30; signals.push(`Last contacted ${daysAgo} days ago`) }
      else if (daysAgo < 90) { score += 15; signals.push(`Last contacted ${daysAgo} days ago`) }
    }
  }

  return { score: Math.min(100, score), evidence: signals.join('; ') || 'Low engagement' }
}

// ─── AI-powered pain point fit ─────────────────────────────────────────────

async function scorePainPointFit(
  card: CompanyCard,
  profile: ProductProfile
): Promise<{ score: number; evidence: string }> {
  if (card.painPoints.length === 0 && card.synthesis.talkingPoints.length === 0) {
    return { score: 30, evidence: 'No public pain points detected' }
  }

  const prompt = `Score 0-100: how well do this company's pain points match what this product solves?
Be precise — do not round to multiples of 10.

Product solves: ${profile.problemsSolved.join(', ')}

Company pain points:
${card.painPoints.map((p) => `- ${p.point}: ${p.evidence}`).join('\n')}

Talking points context:
${card.synthesis.talkingPoints.join('\n')}

Respond with JSON only: {"score": number, "evidence": "one sentence explanation"}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const result = JSON.parse(text.match(/\{[\s\S]*\}/)![0])
    return { score: Math.min(100, Math.max(0, result.score)), evidence: result.evidence }
  } catch {
    // Fallback: keyword matching
    const problems = profile.problemsSolved.join(' ').toLowerCase()
    const pains = card.painPoints.map((p) => p.point).join(' ').toLowerCase()
    const words = problems.split(/\W+/).filter((w) => w.length > 4)
    const matches = words.filter((w) => pains.includes(w)).length
    const score = Math.min(90, 20 + matches * 15)
    return { score, evidence: `Keyword match: ${matches} pain point overlaps detected` }
  }
}

// ─── Contact recommendation ────────────────────────────────────────────────

async function recommendContacts(
  card: CompanyCard,
  profile: ProductProfile
): Promise<FitmentScore['contacts']> {
  const headcount = card.scale.headcount ?? 0
  const prompt = `Given this company profile and product, recommend the right contacts to approach.
Return JSON only.

Company: ${card.identity.name}, ${card.identity.industry}, ${headcount} employees
Funding: ${card.funding.stage}
Detected leadership roles from job postings/data: ${card.hiring.seniorHiresLast90Days.join(', ') || 'None detected'}
Directors (from MCA): ${JSON.stringify(card.identity)}

Product: ${profile.name}
Primary buyer titles: ${profile.primaryBuyerTitles.join(', ')}
Secondary buyer titles: ${profile.secondaryBuyerTitles.join(', ')}
Technical evaluator titles: ${profile.technicalEvaluatorTitles.join(', ')}

Return:
{
  "economicBuyer": { "recommendedTitle": "...", "confidence": "high|medium|low", "rationale": "...", "outreachAngle": "..." },
  "champion": { "recommendedTitle": "...", "confidence": "high|medium|low", "rationale": "...", "outreachAngle": "..." },
  "technicalEvaluator": null or { "recommendedTitle": "...", "confidence": "high|medium|low", "rationale": "...", "outreachAngle": "..." }
}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    return JSON.parse(text.match(/\{[\s\S]*\}/)![0])
  } catch {
    return {
      economicBuyer: {
        recommendedTitle: profile.primaryBuyerTitles[0] ?? 'Senior Decision Maker',
        confidence: 'low',
        rationale: 'Defaulted to configured primary buyer title',
        outreachAngle: `Reach out about ${profile.problemsSolved[0] ?? 'your key pain point'}`,
      },
      champion: {
        recommendedTitle: profile.secondaryBuyerTitles[0] ?? 'Department Manager',
        confidence: 'low',
        rationale: 'Defaulted to configured secondary buyer title',
        outreachAngle: `Start a conversation about day-to-day challenges`,
      },
      technicalEvaluator: null,
    }
  }
}

// ─── Main scoring function ─────────────────────────────────────────────────

export async function scoreFitment(
  card: CompanyCard,
  profile: ProductProfile
): Promise<FitmentScore> {
  const weights = profile.dimensionWeights as DimensionWeights

  const [industryFit, sizeFit, techStackFit, buyingSignalFit, engagementFit, painPointFit, contacts] =
    await Promise.all([
      Promise.resolve(scoreIndustryFit(card, profile)),
      Promise.resolve(scoreSizeFit(card, profile)),
      Promise.resolve(scoreTechStackFit(card, profile)),
      Promise.resolve(scoreBuyingSignalFit(card)),
      Promise.resolve(scoreEngagementFit(card)),
      scorePainPointFit(card, profile),
      recommendContacts(card, profile),
    ])

  const composite = Math.round(
    industryFit.score * weights.industryFit +
    sizeFit.score * weights.sizeFit +
    techStackFit.score * weights.techStackFit +
    painPointFit.score * weights.painPointFit +
    buyingSignalFit.score * weights.buyingSignalFit +
    engagementFit.score * weights.engagementFit
  )

  return FitmentScoreSchema.parse({
    compositeScore: Math.min(100, Math.max(0, composite)),
    breakdown: { industryFit, sizeFit, techStackFit, painPointFit, buyingSignalFit, engagementFit },
    contacts,
  })
}
