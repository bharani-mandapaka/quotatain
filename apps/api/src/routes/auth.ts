import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@quotatain/database'

interface RegisterBody {
  email: string
  name?: string
  password: string
}

interface LoginBody {
  email: string
  password: string
}

// Shared: issue JWT + return user shape
async function issueToken(fastify: Parameters<FastifyPluginAsync>[0], userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, workspaceId: true, avatarUrl: true },
  })
  const token = fastify.jwt.sign(
    { sub: user.id, workspaceId: user.workspaceId, role: user.role, email: user.email, name: user.name },
    { expiresIn: '7d' },
  )
  return { token, user }
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/register — creates workspace + admin user, returns JWT
  fastify.post<{ Body: RegisterBody }>('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, name, password } = request.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const workspaceName = name
      ? `${name.split(' ')[0]}'s Workspace`
      : `${email.split('@')[0]}'s Workspace`

    const workspace = await prisma.workspace.create({ data: { name: workspaceName } })
    const user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash, role: 'ADMIN', workspaceId: workspace.id },
    })

    return reply.status(201).send(await issueToken(fastify, user.id))
  })

  // POST /api/auth/login — verifies password, returns JWT
  fastify.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid email or password.' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password.' })
    }

    return reply.send(await issueToken(fastify, user.id))
  })

  // POST /api/auth/sync — V2: Google OAuth upsert (kept for future use)
  fastify.post('/sync', async (_request, reply) => {
    return reply.status(501).send({ error: 'Google OAuth is a V2 feature.' })
  })
}
