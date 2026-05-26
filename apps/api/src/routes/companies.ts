import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'
import { searchContacts, revealEmail, matchPersonByLinkedIn } from '../modules/contacts/apolloSearch.js'

const CONTACTS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function companiesRoutes(app: FastifyInstance) {

  // GET /api/companies/:id — single company card
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId } = request.authUser

    const company = await prisma.company.findFirst({
      where: { id, workspaceId },
    })

    if (!company) return reply.status(404).send({ error: 'Company not found' })
    return reply.send(company)
  })

  // POST /api/companies/:id/contacts — search Apollo for contacts; cache 7 days
  app.post('/:id/contacts', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId } = request.authUser

    const apiKey = process.env.APOLLO_API_KEY
    if (!apiKey) {
      return reply.status(503).send({ error: 'Apollo API key not configured' })
    }

    const company = await prisma.company.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        domain: true,
        inputName: true,
        card: true,
        fitment: true,
        contacts: true,
        contactsFetchedAt: true,
      },
    })

    if (!company) return reply.status(404).send({ error: 'Company not found' })

    // Return cache if fresh
    const cacheAge = company.contactsFetchedAt
      ? Date.now() - company.contactsFetchedAt.getTime()
      : Infinity
    if (company.contacts && cacheAge < CONTACTS_CACHE_TTL_MS) {
      return reply.send({ contacts: company.contacts, cached: true })
    }

    // Need a domain to search
    const domain = company.domain ?? (company.card as any)?.identity?.domain
    if (!domain) {
      return reply.status(422).send({ error: 'No domain available for this company — cannot search contacts' })
    }

    // Need fitment contacts to know who to look for
    const fitment = company.fitment as any
    if (!fitment?.contacts) {
      return reply.status(422).send({ error: 'Fitment not yet scored — run must complete before searching contacts' })
    }

    try {
      const contacts = await searchContacts(
        apiKey,
        domain,
        fitment.contacts,
        (company.card as any)?.identity?.name ?? company.inputName ?? undefined,
      )

      // Persist to cache
      await prisma.company.update({
        where: { id },
        data: {
          contacts: contacts as any,
          contactsFetchedAt: new Date(),
        },
      })

      return reply.send({ contacts, cached: false })
    } catch (err: any) {
      app.log.error({ err, companyId: id }, 'Apollo contact search failed')
      if (err?.message?.startsWith('RATE_LIMITED')) {
        return reply.status(429).send({ error: 'Apollo rate limit reached - try again in a minute' })
      }
      if (err?.message?.startsWith('APOLLO_PLAN')) {
        return reply.status(402).send({ error: 'People search requires an Apollo API plan with people search access. Upgrade at apollo.io or add the API access add-on.' })
      }
      return reply.status(500).send({ error: err?.message ?? 'Contact search failed' })
    }
  })

  // POST /api/companies/:id/contacts/:apolloId/reveal — reveal email for one contact
  app.post('/:id/contacts/:apolloId/reveal', { preHandler: requireAuth }, async (request, reply) => {
    const { id, apolloId } = request.params as { id: string; apolloId: string }
    const { workspaceId } = request.authUser

    const apiKey = process.env.APOLLO_API_KEY
    if (!apiKey) {
      return reply.status(503).send({ error: 'Apollo API key not configured' })
    }

    const company = await prisma.company.findFirst({
      where: { id, workspaceId },
      select: { contacts: true },
    })

    if (!company) return reply.status(404).send({ error: 'Company not found' })

    const contacts: any[] = (company.contacts as any[]) ?? []
    const contact = contacts.find(c => c.apolloId === apolloId)
    if (!contact) return reply.status(404).send({ error: 'Contact not found — search contacts first' })

    // Already revealed
    if (contact.email) return reply.send({ email: contact.email, alreadyRevealed: true })

    try {
      const email = await revealEmail(apiKey, apolloId)

      // Update the cached contact with the revealed email
      if (email) {
        const updated = contacts.map(c =>
          c.apolloId === apolloId ? { ...c, email, emailStatus: 'verified' } : c
        )
        await prisma.company.update({
          where: { id },
          data: { contacts: updated as any },
        })
      }

      return reply.send({ email, alreadyRevealed: false })
    } catch (err: any) {
      app.log.error({ err, apolloId }, 'Apollo email reveal failed')
      return reply.status(500).send({ error: 'Email reveal failed' })
    }
  })

  // POST /api/companies/:id/contacts/linkedin — look up a person by LinkedIn URL
  app.post('/:id/contacts/linkedin', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { linkedinUrl } = request.body as { linkedinUrl?: string }
    const { workspaceId } = request.authUser

    if (!linkedinUrl?.includes('linkedin.com')) {
      return reply.status(400).send({ error: 'A valid LinkedIn profile URL is required' })
    }

    const apiKey = process.env.APOLLO_API_KEY
    if (!apiKey) return reply.status(503).send({ error: 'Apollo API key not configured' })

    const company = await prisma.company.findFirst({
      where: { id, workspaceId },
      select: { contacts: true },
    })
    if (!company) return reply.status(404).send({ error: 'Company not found' })

    try {
      const contact = await matchPersonByLinkedIn(apiKey, linkedinUrl)
      if (!contact) return reply.status(404).send({ error: 'No Apollo record found for this LinkedIn URL' })

      // Merge into contacts cache (deduplicate by apolloId)
      const existing: any[] = (company.contacts as any[]) ?? []
      if (existing.find(c => c.apolloId === contact.apolloId)) {
        return reply.send({ contact, alreadyExists: true })
      }
      const updated = [...existing, contact]
      await prisma.company.update({
        where: { id },
        data: { contacts: updated as any, contactsFetchedAt: new Date() },
      })

      return reply.send({ contact, alreadyExists: false })
    } catch (err: any) {
      app.log.error({ err, companyId: id }, 'Apollo LinkedIn match failed')
      if (err?.message?.startsWith('APOLLO_PLAN')) {
        return reply.status(402).send({ error: 'People match requires an Apollo API plan upgrade' })
      }
      return reply.status(500).send({ error: err?.message ?? 'LinkedIn match failed' })
    }
  })
}
