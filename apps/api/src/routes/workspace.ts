import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'

export async function workspaceRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.authUser
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: { select: { id: true, name: true, email: true, role: true } } },
    })
    return reply.send(workspace)
  })

  // Team dashboard stats
  app.get('/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.authUser

    const [totalRuns, totalCompanies, recentRuns] = await Promise.all([
      prisma.run.count({ where: { workspaceId } }),
      prisma.company.count({ where: { workspaceId, status: 'COMPLETED' } }),
      prisma.run.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          createdBy: { select: { name: true, email: true } },
          product: { select: { name: true } },
          _count: { select: { companies: true } },
        },
      }),
    ])

    return reply.send({ totalRuns, totalCompanies, recentRuns })
  })
}
