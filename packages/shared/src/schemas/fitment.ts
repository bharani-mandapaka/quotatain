import { z } from 'zod'

export const DimensionWeightsSchema = z.object({
  industryFit: z.number().min(0).max(1),
  sizeFit: z.number().min(0).max(1),
  techStackFit: z.number().min(0).max(1),
  painPointFit: z.number().min(0).max(1),
  buyingSignalFit: z.number().min(0).max(1),
  engagementFit: z.number().min(0).max(1),
}).refine(
  (w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1.0) < 0.01,
  { message: 'Dimension weights must sum to 1.0' }
)

export const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  evidence: z.string(),
})

export const SellingGuidanceSchema = z.object({
  positioningStatement: z.string(),
  talkingPointsByPersona: z.object({
    economicBuyer: z.array(z.string()),
    champion: z.array(z.string()),
    technicalEvaluator: z.array(z.string()).nullable(),
  }),
  objections: z.array(z.object({
    concern: z.string(),
    response: z.string(),
  })).max(3),
  callToAction: z.string(),
})

export const FitmentScoreSchema = z.object({
  compositeScore: z.number().min(0).max(100),
  breakdown: z.object({
    industryFit: DimensionScoreSchema,
    sizeFit: DimensionScoreSchema,
    techStackFit: DimensionScoreSchema,
    painPointFit: DimensionScoreSchema,
    buyingSignalFit: DimensionScoreSchema,
    engagementFit: DimensionScoreSchema,
  }),
  contacts: z.object({
    economicBuyer: z.object({
      recommendedTitle: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
      outreachAngle: z.string(),
    }),
    champion: z.object({
      recommendedTitle: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
      outreachAngle: z.string(),
    }),
    technicalEvaluator: z.object({
      recommendedTitle: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
      outreachAngle: z.string(),
    }).nullable(),
  }),
  sellingGuidance: SellingGuidanceSchema.nullable().default(null),
})

export const ProductProfileSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1),
  rawInput: z.string(),
  capabilities: z.array(z.string()),
  problemsSolved: z.array(z.string()),
  targetIndustries: z.array(z.string()),
  targetHeadcountMin: z.number().nullable(),
  targetHeadcountMax: z.number().nullable(),
  targetFundingStages: z.array(z.string()),
  targetGeographies: z.array(z.string()),
  requiredTechStack: z.array(z.string()),
  displacedCompetitors: z.array(z.string()),
  primaryBuyerTitles: z.array(z.string()),
  secondaryBuyerTitles: z.array(z.string()),
  technicalEvaluatorTitles: z.array(z.string()),
  dimensionWeights: DimensionWeightsSchema,
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
})

export type FitmentScore = z.infer<typeof FitmentScoreSchema>
export type ProductProfile = z.infer<typeof ProductProfileSchema>
export type DimensionWeights = z.infer<typeof DimensionWeightsSchema>
export type SellingGuidance = z.infer<typeof SellingGuidanceSchema>

export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights = {
  industryFit: 0.20,
  sizeFit: 0.20,
  techStackFit: 0.20,
  painPointFit: 0.20,
  buyingSignalFit: 0.15,
  engagementFit: 0.05,
}
