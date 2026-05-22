import { Queue, QueueEvents } from 'bullmq'
import { getRedis } from './redis.js'

export const QUEUE_NAMES = {
  COMPANY_ENRICH: 'company:enrich',
  RUN_COMPLETE: 'run:complete',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export interface CompanyEnrichJobData {
  companyId: string
  runId: string
  workspaceId: string
  productId: string
  inputName?: string
  domain?: string
  depth: 'quick' | 'standard' | 'deep'
}

export interface RunCompleteJobData {
  runId: string
  workspaceId: string
  createdById: string
}

let enrichQueue: Queue<CompanyEnrichJobData> | null = null
let completeQueue: Queue<RunCompleteJobData> | null = null

export function getEnrichQueue(): Queue<CompanyEnrichJobData> {
  if (!enrichQueue) {
    enrichQueue = new Queue<CompanyEnrichJobData>(QUEUE_NAMES.COMPANY_ENRICH, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })
  }
  return enrichQueue
}

export function getCompleteQueue(): Queue<RunCompleteJobData> {
  if (!completeQueue) {
    completeQueue = new Queue<RunCompleteJobData>(QUEUE_NAMES.RUN_COMPLETE, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        removeOnComplete: { count: 50 },
      },
    })
  }
  return completeQueue
}
