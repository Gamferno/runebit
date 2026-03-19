import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import problemRoutes from './routes/problems.js'
import submissionRoutes from './routes/submissions.js'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

/* ---- Plugins ---- */
await app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
})

await app.register(cookie)

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'codequest-dev-secret-change-in-production',
  cookie: { cookieName: 'token', signed: false },
})

/* ---- Decorators ---- */
app.decorate('prisma', prisma)

// Auth middleware decorator
app.decorate('authenticate', async function (request, reply) {
  try {
    // Try cookie first, then Authorization header
    const token = request.cookies.token || request.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new Error('No token')
    request.user = app.jwt.verify(token)
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

/* ---- Routes ---- */
app.register(authRoutes, { prefix: '/api/auth' })
app.register(userRoutes, { prefix: '/api/users' })
app.register(problemRoutes, { prefix: '/api/problems' })
app.register(submissionRoutes, { prefix: '/api/submissions' })

/* ---- Health ---- */
app.get('/api/health', async () => ({ status: 'ok', name: 'CodeQuest API' }))

/* ---- Start ---- */
const PORT = process.env.PORT || 3001

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`⚔️  CodeQuest API running on http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
