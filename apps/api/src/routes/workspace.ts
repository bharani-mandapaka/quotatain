import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth, requireRole } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const requireAdmin = requireRole('ADMIN')

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'HEAD_OF_SALES', 'AE', 'SDR']).default('AE'),
})

const UpdateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'HEAD_OF_SALES', 'AE', 'SDR']),
})

export async function workspaceRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.authUser
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: { select: { id: true, name: true, email: true, role: true } } },
    })
    return reply.send(workspace)
  })

  // ─── User Management (admin only) ────────────────────────────────────────────

  // GET /api/workspace/users — list all users in workspace
  app.get('/users', { preHandler: requireAdmin }, async (request, reply) => {
    const { workspaceId } = request.authUser
    const users = await prisma.user.findMany({
      where: { workspaceId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ users })
  })

  // POST /api/workspace/users — create a new user in this workspace
  app.post('/users', { preHandler: requireAdmin }, async (request, reply) => {
    const body = CreateUserSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() })
    }
    const { workspaceId } = request.authUser
    const { name, email, password, role } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'A user with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role, workspaceId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return reply.status(201).send({ user })
  })

  // PUT /api/workspace/users/:id — update a user's role
  app.put('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId, userId } = request.authUser

    if (id === userId) {
      return reply.status(400).send({ error: 'You cannot change your own role.' })
    }

    const body = UpdateUserRoleSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request' })
    }

    const existing = await prisma.user.findFirst({ where: { id, workspaceId } })
    if (!existing) return reply.status(404).send({ error: 'User not found.' })

    const user = await prisma.user.update({
      where: { id },
      data: { role: body.data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return reply.send({ user })
  })

  // DELETE /api/workspace/users/:id — remove a user from workspace
  app.delete('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId, userId } = request.authUser

    if (id === userId) {
      return reply.status(400).send({ error: 'You cannot remove yourself.' })
    }

    const existing = await prisma.user.findFirst({ where: { id, workspaceId } })
    if (!existing) return reply.status(404).send({ error: 'User not found.' })

    await prisma.user.delete({ where: { id } })
    return reply.send({ ok: true })
  })

  // ─── Team dashboard stats ─────────────────────────────────────────────────────

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
