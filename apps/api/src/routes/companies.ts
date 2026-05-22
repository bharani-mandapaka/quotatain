import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'

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
}
