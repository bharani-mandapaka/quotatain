import { z } from 'zod'

export const ResearchDepthSchema = z.enum(['quick', 'standard', 'deep'])

export const CompanyInputSchema = z.object({
  name: z.string().optional(),
  domain: z.string().optional(),
  notes: z.string().optional(),
}).refine((c) => c.name || c.domain, {
  message: 'Either name or domain must be provided',
})

export const RunStatusSchema = z.enum([
  'queued', 'processing', 'completed', 'failed', 'partial'
])

export const CompanyStatusSchema = z.enum([
  'pending', 'processing', 'completed', 'failed'
])

export const CreateRunRequestSchema = z.object({
  name: z.string().optional(),
  productId: z.string(),
  depth: ResearchDepthSchema.default('standard'),
  companies: z.array(CompanyInputSchema).min(1).max(50),
})

export const RunSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  productId: z.string(),
  productName: z.string(),
  status: RunStatusSchema,
  depth: ResearchDepthSchema,
  companyCount: z.number(),
  completedCount: z.number(),
  failedCount: z.number(),
  createdBy: z.string(),
  createdByName: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  estimatedSeconds: z.number().nullable(),
})

export const SSEProgressEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('company_started'),
    companyId: z.string(),
    companyName: z.string(),
  }),
  z.object({
    event: z.literal('company_complete'),
    companyId: z.string(),
    companyName: z.string(),
    status: z.enum(['completed', 'failed']),
    completedCount: z.number(),
    totalCount: z.number(),
  }),
  z.object({
    event: z.literal('run_complete'),
    runId: z.string(),
    completedCount: z.number(),
    failedCount: z.number(),
  }),
])

export type ResearchDepth = z.infer<typeof ResearchDepthSchema>
export type CompanyInput = z.infer<typeof CompanyInputSchema>
export type RunStatus = z.infer<typeof RunStatusSchema>
export type CompanyStatus = z.infer<typeof CompanyStatusSchema>
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>
export type RunSummary = z.infer<typeof RunSummarySchema>
export type SSEProgressEvent = z.infer<typeof SSEProgressEventSchema>
