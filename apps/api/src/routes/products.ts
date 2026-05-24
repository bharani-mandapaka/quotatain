import type { FastifyInstance } from 'fastify'
import { prisma } from '@quotatain/database'
import { requireAuth } from '../middleware/auth.js'
import { z } from 'zod'
import { extractProductProfile } from '../modules/fitment/productIngestion.js'

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  targetIndustries: z.array(z.string()).optional(),
  targetHeadcountMin: z.number().optional(),
  targetHeadcountMax: z.number().optional(),
  targetFundingStages: z.array(z.string()).optional(),
  dimensionWeights: z.object({
    industryFit: z.number(),
    sizeFit: z.number(),
    techStackFit: z.number(),
    painPointFit: z.number(),
    buyingSignalFit: z.number(),
    engagementFit: z.number(),
  }).optional(),
})

export async function productsRoutes(app: FastifyInstance) {
  // GET /api/products
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.authUser
    const products = await prisma.productProfile.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ products })
  })

  // POST /api/products — create product profile from text
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const body = CreateProductSchema.safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() })

      const { workspaceId } = request.authUser
      const { name, description, dimensionWeights } = body.data

      // Use Claude to extract structured profile from description
      const extracted = await extractProductProfile(description)

      const parsedProfile = {
        ...extracted,
        targetIndustries: body.data.targetIndustries ?? extracted.targetIndustries,
        targetHeadcountMin: body.data.targetHeadcountMin ?? extracted.targetHeadcountMin,
        targetHeadcountMax: body.data.targetHeadcountMax ?? extracted.targetHeadcountMax,
        targetFundingStages: body.data.targetFundingStages ?? extracted.targetFundingStages,
        dimensionWeights: dimensionWeights ?? extracted.dimensionWeights,
      }

      const product = await prisma.productProfile.create({
        data: {
          workspaceId,
          name,
          rawInput: description,
          parsedProfile: parsedProfile as any,
          isActive: true,
        },
      })

      return reply.status(201).send({ product, extractedProfile: parsedProfile })
    } catch (err: any) {
      app.log.error({ err }, 'POST /api/products error')
      return reply.status(500).send({ error: err?.message ?? 'Failed to create product' })
    }
  })

  // PUT /api/products/:id
  app.put('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId } = request.authUser
    const body = CreateProductSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid request' })

    const existing = await prisma.productProfile.findFirst({ where: { id, workspaceId } })
    if (!existing) return reply.status(404).send({ error: 'Product not found' })

    const updated = await prisma.productProfile.update({
      where: { id },
      data: {
        name: body.data.name ?? undefined,
        parsedProfile: body.data.dimensionWeights
          ? { ...(existing.parsedProfile as object), dimensionWeights: body.data.dimensionWeights }
          : undefined,
        updatedAt: new Date(),
      },
    })

    return reply.send({ product: updated })
  })

  // DELETE /api/products/:id
  app.delete('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { workspaceId } = request.authUser
    await prisma.productProfile.updateMany({
      where: { id, workspaceId },
      data: { isActive: false },
    })
    return reply.send({ ok: true })
  })
}
