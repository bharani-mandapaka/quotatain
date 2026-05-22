import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_DIMENSION_WEIGHTS } from '@quotatain/shared'

const client = new Anthropic()

export async function extractProductProfile(description: string): Promise<any> {
  const prompt = `Extract a structured B2B product profile from this description.
Return JSON only — no markdown, no explanation.

Description:
${description}

Return:
{
  "capabilities": ["what the product does"],
  "problemsSolved": ["pain points it addresses"],
  "targetIndustries": ["list of target industries"],
  "targetHeadcountMin": number or null,
  "targetHeadcountMax": number or null,
  "targetFundingStages": ["Seed", "Series A", ...] or [],
  "targetGeographies": ["India"] or other,
  "requiredTechStack": ["tools it integrates with"],
  "displacedCompetitors": ["tools it replaces or competes with"],
  "primaryBuyerTitles": ["job titles of primary buyer"],
  "secondaryBuyerTitles": ["job titles of champion/secondary buyer"],
  "technicalEvaluatorTitles": ["job titles of technical evaluator"] or [],
  "dimensionWeights": {
    "industryFit": 0.20,
    "sizeFit": 0.20,
    "techStackFit": 0.20,
    "painPointFit": 0.20,
    "buyingSignalFit": 0.15,
    "engagementFit": 0.05
  }
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)![0])
    return { ...json, dimensionWeights: json.dimensionWeights ?? DEFAULT_DIMENSION_WEIGHTS }
  } catch {
    return {
      capabilities: [],
      problemsSolved: [],
      targetIndustries: [],
      targetHeadcountMin: null,
      targetHeadcountMax: null,
      targetFundingStages: [],
      targetGeographies: ['India'],
      requiredTechStack: [],
      displacedCompetitors: [],
      primaryBuyerTitles: [],
      secondaryBuyerTitles: [],
      technicalEvaluatorTitles: [],
      dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
    }
  }
}
