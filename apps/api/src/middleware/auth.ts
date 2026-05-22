import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@quotatain/database'

export interface AuthUser {
  userId: string
  workspaceId: string
  role: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { sub: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, workspaceId: true, role: true },
    })

    if (!user) {
      reply.status(401).send({ error: 'User not found' })
      return
    }

    request.authUser = {
      userId: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
    }
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await requireAuth(request, reply)
    if (reply.sent) return
    if (!roles.includes(request.authUser.role)) {
      reply.status(403).send({ error: 'Insufficient permissions' })
    }
  }
}
