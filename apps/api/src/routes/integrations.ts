import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'

export async function integrationsRoutes(app: FastifyInstance) {
  // GET /api/integrations — list connected integrations for workspace
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.authUser
    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
      select: { id: true, type: true, status: true, createdAt: true },
    })
    return reply.send({ integrations })
  })

  // Salesforce OAuth — placeholder (full OAuth flow in sprint 2)
  app.post('/salesforce/connect', { preHandler: requireAuth }, async (_request, reply) => {
    return reply.send({ authUrl: `${process.env.SALESFORCE_AUTH_URL ?? '#'}?state=todo` })
  })

  // HubSpot OAuth — placeholder
  app.post('/hubspot/connect', { preHandler: requireAuth }, async (_request, reply) => {
    return reply.send({ authUrl: `${process.env.HUBSPOT_AUTH_URL ?? '#'}?state=todo` })
  })

  // DELETE integration
  app.delete('/:type', { preHandler: requireAuth }, async (request, reply) => {
    const { type } = request.params as { type: string }
    const { workspaceId } = request.authUser
    await prisma.integration.deleteMany({
      where: { workspaceId, type: type.toUpperCase() as any },
    })
    return reply.send({ ok: true })
  })
}
