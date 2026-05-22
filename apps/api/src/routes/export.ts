import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'
import type { CompanyCard, FitmentScore } from '@quotatain/shared'

export async function exportRoutes(app: FastifyInstance) {
  // GET /api/export/runs/:id?format=csv
  app.get('/runs/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { format = 'csv' } = request.query as { format?: string }
    const { workspaceId } = request.authUser

    const run = await prisma.run.findFirst({
      where: { id, workspaceId },
      include: { companies: { where: { status: 'COMPLETED' }, orderBy: { completedAt: 'asc' } } },
    })
    if (!run) return reply.status(404).send({ error: 'Run not found' })

    const rows = run.companies.map((c) => flattenCompany(c))

    if (format === 'csv') {
      const csv = toCsv(rows)
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="quotatain-${id}.csv"`)
      return reply.send(csv)
    }

    return reply.send({ rows })
  })
}

function flattenCompany(company: any): Record<string, string> {
  const card = company.card as CompanyCard | null
  const fitment = company.fitment as FitmentScore | null

  const sanitize = (val: any): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    // Strip formula injection characters
    if (/^[=+\-@]/.test(str)) return `'${str}`
    return str
  }

  return {
    'Company Name': sanitize(card?.identity.name ?? company.inputName),
    'Domain': sanitize(company.domain),
    'Industry': sanitize(card?.identity.industry),
    'HQ': sanitize([card?.identity.hqCity, card?.identity.hqState, card?.identity.hqCountry].filter(Boolean).join(', ')),
    'Headcount': sanitize(card?.scale.headcount),
    'Headcount Trend': sanitize(card?.scale.headcountTrend),
    'Revenue (Est.)': sanitize(card?.scale.revenueRange ?? card?.scale.revenueEstimated),
    'Revenue Currency': sanitize(card?.scale.revenueCurrency),
    'Funding Stage': sanitize(card?.funding.stage),
    'Total Raised': sanitize(card?.funding.totalRaised),
    'Last Round Date': sanitize(card?.funding.lastRoundDate),
    'Last Round Amount': sanitize(card?.funding.lastRoundAmount),
    'CIN (India)': sanitize(card?.identity.cin),
    'Stock Ticker': sanitize(card?.identity.nseTicker ?? card?.identity.bseTicker),
    'Open Roles': sanitize(card?.hiring.openRolesTotal),
    'Hiring Velocity': sanitize(card?.hiring.hiringVelocity),
    'Leadership Change': sanitize(card?.hiring.leadershipChangeFlag ? 'Yes' : 'No'),
    'Fresher Hiring %': sanitize(card?.hiring.fresherHiringPct ? `${card.hiring.fresherHiringPct}%` : ''),
    'Attrition Risk': sanitize(card?.hiring.attritionRisk),
    'CRM Used': sanitize(card?.techStack.crm),
    'ATS Used': sanitize(card?.techStack.ats),
    'Cloud Provider': sanitize(card?.techStack.cloud),
    'Buying Signals': sanitize(card?.buyingSignals.map((s) => s.signal).join('; ')),
    'Top Pain Points': sanitize(card?.painPoints.map((p) => p.point).join('; ')),
    'Fitment Score': sanitize(fitment?.compositeScore),
    'Industry Fit': sanitize(fitment?.breakdown.industryFit.score),
    'Size Fit': sanitize(fitment?.breakdown.sizeFit.score),
    'Tech Stack Fit': sanitize(fitment?.breakdown.techStackFit.score),
    'Pain Point Fit': sanitize(fitment?.breakdown.painPointFit.score),
    'Buying Signal Fit': sanitize(fitment?.breakdown.buyingSignalFit.score),
    'Economic Buyer Role': sanitize(fitment?.contacts.economicBuyer.recommendedTitle),
    'Champion Role': sanitize(fitment?.contacts.champion.recommendedTitle),
    'Outreach Angle': sanitize(card?.synthesis.talkingPoints[0]),
    'Confidence Score': sanitize(card?.synthesis.confidenceScore),
    'Researched At': sanitize(card?.meta.researchedAt),
  }
}

function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(',')),
  ]
  return lines.join('\r\n')
}
