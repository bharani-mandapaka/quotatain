import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'
import { runsRoutes } from './routes/runs.js'
import { companiesRoutes } from './routes/companies.js'
import { productsRoutes } from './routes/products.js'
import { workspaceRoutes } from './routes/workspace.js'
import { integrationsRoutes } from './routes/integrations.js'
import { exportRoutes } from './routes/export.js'
import { startResearchWorker } from './modules/research/worker.js'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin) return cb(null, true)
    const allowed = [
      process.env.WEB_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ]
    // Allow Vercel preview deployments for this project
    const isVercelPreview = /^https:\/\/quotatain-web[a-zA-Z0-9-]*\.vercel\.app$/.test(origin)
    if (allowed.includes(origin) || isVercelPreview) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`), false)
    }
  },
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
})

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// Health check
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// Public auth routes (no JWT required)
await app.register(authRoutes, { prefix: '/api/auth' })

// API routes
await app.register(runsRoutes, { prefix: '/api/runs' })
await app.register(companiesRoutes, { prefix: '/api/companies' })
await app.register(productsRoutes, { prefix: '/api/products' })
await app.register(workspaceRoutes, { prefix: '/api/workspace' })
await app.register(integrationsRoutes, { prefix: '/api/integrations' })
await app.register(exportRoutes, { prefix: '/api/export' })

const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`API running on http://localhost:${port}`)

try {
  startResearchWorker()
  app.log.info('Research worker started')
} catch (err) {
  app.log.warn({ err }, 'Research worker failed to start — REDIS_URL may not be configured')
}
