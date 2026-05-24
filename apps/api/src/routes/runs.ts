import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { getEnrichQueue } from '@quotatain/queue'
import { CreateRunRequestSchema } from '@quotatain/shared'
import { requireAuth } from '../middleware/auth.js'
import { parseCsvBuffer } from '../modules/research/csvParser.js'
import { sanitizeCompanyInputs } from '../modules/research/inputSanitizer.js'

export async function runsRoutes(app: FastifyInstance) {
  // POST /api/runs — create a new research run
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const body = CreateRunRequestSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() })
      }

      const { workspaceId, userId } = request.authUser
      const { name, productId, depth, companies } = body.data

      // Verify product belongs to this workspace
      const product = await prisma.productProfile.findFirst({
        where: { id: productId, workspaceId },
      })
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      const sanitized = sanitizeCompanyInputs(companies)
      if (sanitized.length === 0) {
        return reply.status(400).send({ error: 'No valid companies after sanitisation — check domains are not private/internal.' })
      }

      const run = await prisma.run.create({
        data: {
          workspaceId,
          createdById: userId,
          productId,
          name: name ?? null,
          depth,
          status: 'QUEUED',
          companyCount: sanitized.length,
          companies: {
            create: sanitized.map((c) => ({
              workspaceId,
              inputName: c.name ?? null,
              domain: c.domain ?? null,
              status: 'PENDING',
            })),
          },
        },
        include: { companies: { select: { id: true, inputName: true, domain: true } } },
      })

      // Enqueue one job per company — wrapped separately so a Redis hiccup surfaces clearly
      try {
        const queue = getEnrichQueue()
        await queue.addBulk(
          run.companies.map((company) => ({
            name: `enrich:${company.id}`,
            data: {
              companyId: company.id,
              runId: run.id,
              workspaceId,
              productId,
              inputName: company.inputName ?? undefined,
              domain: company.domain ?? undefined,
              depth,
            },
          }))
        )
      } catch (queueErr: any) {
        app.log.error({ err: queueErr }, 'Failed to enqueue jobs — Redis/BullMQ error')
        // Clean up the run so it doesn't sit stuck in QUEUED forever
        await prisma.run.delete({ where: { id: run.id } }).catch(() => {})
        return reply.status(500).send({
          error: `Research queue unavailable: ${queueErr?.message ?? 'Redis connection failed'}. Check REDIS_URL in Railway.`,
        })
      }

      const depthSeconds = { quick: 10, standard: 30, deep: 90 }
      const estimatedSeconds = sanitized.length * (depthSeconds[depth] / 10)

      return reply.status(202).send({
        runId: run.id,
        status: 'queued',
        companyCount: sanitized.length,
        estimatedSeconds,
        sseChannel: `/api/runs/${run.id}/progress`,
      })
    } catch (err: any) {
      app.log.error({ err }, 'POST /api/runs unhandled error')
      return reply.status(500).send({
        error: err?.message ?? 'Failed to create research run',
      })
    }
  })

  // GET /api/runs — list all runs for workspace
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId, userId, role } = request.authUser
    const isManager = role === 'HEAD_OF_SALES' || role === 'ADMIN'

    const runs = await prisma.run.findMany({
      where: {
        workspaceId,
        ...(isManager ? {} : { createdById: userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        product: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    })

    return reply.send({ runs: runs.map(formatRunSummary) })
  })

  // GET /api/runs/:id — run details + company list
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId, userId, role } = request.authUser
    const isManager = role === 'HEAD_OF_SALES' || role === 'ADMIN'

    const run = await prisma.run.findFirst({
      where: {
        id,
        workspaceId,
        ...(isManager ? {} : { createdById: userId }),
      },
      include: {
        product: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        companies: {
          select: {
            id: true, inputName: true, domain: true, status: true,
            card: true, fitment: true, error: true, completedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!run) return reply.status(404).send({ error: 'Run not found' })
    return reply.send(run)
  })

  // GET /api/runs/:id/progress — SSE stream for real-time progress
  app.get('/:id/progress', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId } = request.authUser

    const run = await prisma.run.findFirst({ where: { id, workspaceId } })
    if (!run) return reply.status(404).send({ error: 'Run not found' })

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders()

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Poll DB every 1.5s and stream diffs — simple, works without Redis pub/sub for MVP
    const interval = setInterval(async () => {
      try {
        const companies = await prisma.company.findMany({
          where: { runId: id },
          select: { id: true, inputName: true, domain: true, status: true },
        })
        const runState = await prisma.run.findUnique({
          where: { id },
          select: { status: true, completedCount: true, failedCount: true, companyCount: true },
        })
        if (!runState) { clearInterval(interval); reply.raw.end(); return }

        send({ event: 'progress_snapshot', companies, ...runState })

        if (runState.status === 'COMPLETED' || runState.status === 'FAILED' || runState.status === 'PARTIAL') {
          send({ event: 'run_complete', runId: id, ...runState })
          clearInterval(interval)
          reply.raw.end()
        }
      } catch {
        clearInterval(interval)
        reply.raw.end()
      }
    }, 1500)

    request.raw.on('close', () => clearInterval(interval))
  })
}

function formatRunSummary(run: any) {
  return {
    id: run.id,
    name: run.name,
    productId: run.productId,
    productName: run.product?.name,
    status: run.status.toLowerCase(),
    depth: run.depth,
    companyCount: run.companyCount,
    completedCount: run.completedCount,
    failedCount: run.failedCount,
    createdByName: run.createdBy?.name ?? run.createdBy?.email,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}
