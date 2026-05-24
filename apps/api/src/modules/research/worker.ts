import { Worker } from 'bullmq'
import { getRedis, QUEUE_NAMES, type CompanyEnrichJobData } from '@quotatain/queue'
import { prisma } from '@quotatain/database'
import { withCircuitBreaker } from '../../providers/circuitBreaker.js'
import { mergeProviderResults } from '../../providers/merger.js'
import { synthesizeCompanyCard } from '../../ai/synthesize.js'
import { scoreFitment } from '../fitment/scorer.js'
import { ApolloProvider } from '../../providers/apollo.js'
import { CrunchbaseProvider } from '../../providers/crunchbase.js'
import { BuiltWithProvider } from '../../providers/builtwith.js'
import { ToflerProvider } from '../../providers/tofler.js'
import { NseProvider } from '../../providers/nse.js'
import { NewsApiProvider } from '../../providers/newsapi.js'
import { TavilyProvider } from '../../providers/tavily.js'
import type { CompanyDataProvider } from '../../providers/base.js'
import type { ProductProfile } from '@quotatain/shared'

// Initialise providers from env
function buildProviders(): CompanyDataProvider[] {
  const providers: CompanyDataProvider[] = []

  if (process.env.APOLLO_API_KEY) providers.push(new ApolloProvider(process.env.APOLLO_API_KEY))
  if (process.env.CRUNCHBASE_API_KEY) providers.push(new CrunchbaseProvider(process.env.CRUNCHBASE_API_KEY))
  if (process.env.BUILTWITH_API_KEY) providers.push(new BuiltWithProvider(process.env.BUILTWITH_API_KEY))
  if (process.env.TOFLER_API_KEY) providers.push(new ToflerProvider(process.env.TOFLER_API_KEY))
  if (process.env.NEWSAPI_KEY) providers.push(new NewsApiProvider(process.env.NEWSAPI_KEY))
  if (process.env.TAVILY_API_KEY) providers.push(new TavilyProvider(process.env.TAVILY_API_KEY))
  providers.push(new NseProvider()) // no key needed

  return providers
}

const providers = buildProviders()
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 10)

export function startResearchWorker() {
  const worker = new Worker<CompanyEnrichJobData>(
    QUEUE_NAMES.COMPANY_ENRICH,
    async (job) => {
      const { companyId, runId, workspaceId, productId, inputName, domain, depth } = job.data

      await prisma.company.update({
        where: { id: companyId },
        data: { status: 'PROCESSING' },
      })

      try {
        // Step 1: resolve domain
        const resolvedDomain = domain ?? (await resolveDomain(inputName ?? ''))
        const companyName = inputName ?? resolvedDomain ?? 'Unknown'

        // Step 2: parallel data fetch from all providers
        const fetchResults = await Promise.allSettled(
          providers.map((provider) =>
            withCircuitBreaker(provider.name, () => provider.fetch(resolvedDomain ?? '', companyName))
          )
        )

        const providerResults = fetchResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value)

        const { merged: rawData, confidenceScore, sourcesUsed } = mergeProviderResults(providerResults)

        // Step 3: fetch product profile for fitment scoring
        const productRecord = await prisma.productProfile.findUnique({ where: { id: productId } })
        const productProfile: ProductProfile | null = productRecord
          ? (productRecord.parsedProfile as ProductProfile)
          : null

        // Step 4: AI synthesis
        const card = await synthesizeCompanyCard({
          companyName,
          domain: resolvedDomain ?? companyName,
          rawData,
          productProfile,
          sourcesUsed,
          confidenceScore,
          depth,
        })

        // Step 5: fitment scoring
        const fitment = productProfile ? await scoreFitment(card, productProfile) : null

        // Step 6: save
        await prisma.company.update({
          where: { id: companyId },
          data: {
            status: 'COMPLETED',
            domain: resolvedDomain ?? null,
            card: card as any,
            fitment: fitment as any,
            completedAt: new Date(),
          },
        })

        // Step 7: update run progress counter
        await prisma.run.update({
          where: { id: runId },
          data: { completedCount: { increment: 1 } },
        })

        await checkAndFinalizeRun(runId)
      } catch (err: any) {
        // Mark the company FAILED on every attempt so the UI shows the right status.
        // Do NOT increment failedCount here — BullMQ will retry this job, and the
        // 'failed' event handler (below) only counts the run total on final failure.
        await prisma.company.update({
          where: { id: companyId },
          data: { status: 'FAILED', error: err?.message ?? 'Unknown error' },
        })
        throw err // let BullMQ retry (no counter increment here)
      }
    },
    {
      connection: getRedis(),
      concurrency: CONCURRENCY,
    }
  )

  // 'failed' fires on every attempt failure (including those that will be retried).
  // Only increment the run counter on the FINAL failure so we don't double-count.
  worker.on('failed', async (job, err) => {
    if (!job) return
    const maxAttempts = job.opts?.attempts ?? 1
    const isFinalFailure = job.attemptsMade >= maxAttempts
    if (!isFinalFailure) return // still has retries left — just log

    console.error(`Job ${job.id} failed permanently (attempt ${job.attemptsMade}/${maxAttempts}):`, err.message)
    const { runId } = job.data as CompanyEnrichJobData
    try {
      await prisma.run.update({
        where: { id: runId },
        data: { failedCount: { increment: 1 } },
      })
      await checkAndFinalizeRun(runId)
    } catch (dbErr) {
      console.error(`Failed to update run counters after permanent job failure:`, dbErr)
    }
  })

  console.log(`Research worker started (concurrency: ${CONCURRENCY})`)
  return worker
}

async function checkAndFinalizeRun(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { companyCount: true, completedCount: true, failedCount: true, status: true },
  })
  if (!run || run.status === 'COMPLETED' || run.status === 'PARTIAL') return

  const done = (run.completedCount ?? 0) + (run.failedCount ?? 0)
  if (done >= run.companyCount) {
    const finalStatus = run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED'
    await prisma.run.update({
      where: { id: runId },
      data: { status: finalStatus, completedAt: new Date() },
    })
  }
}

async function resolveDomain(companyName: string): Promise<string | null> {
  if (!companyName) return null
  try {
    const { default: axios } = await import('axios')
    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_CX,
        q: `${companyName} official website`,
        num: 1,
      },
      timeout: 5000,
    })
    const url = res.data?.items?.[0]?.link ?? ''
    return url ? new URL(url).hostname.replace('www.', '') : null
  } catch {
    return null
  }
}
