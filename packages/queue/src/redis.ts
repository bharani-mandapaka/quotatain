import { Redis } from 'ioredis'

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('REDIS_URL environment variable is required')
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
      // Stop retrying after 3 attempts so a bad URL doesn't flood logs
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
      reconnectOnError: () => false,
    })
    // Prevent unhandled error events from crashing the process
    redisClient.on('error', (err: Error) => {
      console.warn('[redis] connection error (worker disabled):', err.message)
    })
  }
  return redisClient
}
