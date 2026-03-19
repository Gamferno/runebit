import bcrypt from 'bcrypt'

export default async function authRoutes(app) {
  const { prisma } = app

  /* ---- Register ---- */
  app.post('/register', async (request, reply) => {
    const { email, password, name } = request.body || {}

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
      },
    })

    const token = app.jwt.sign({ id: user.id, email: user.email })

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      .send({
        user: sanitizeUser(user),
        token,
      })
  })

  /* ---- Login ---- */
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body || {}

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ id: user.id, email: user.email })

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      .send({
        user: sanitizeUser(user),
        token,
      })
  })

  /* ---- Google OAuth callback ---- */
  app.post('/google', async (request, reply) => {
    const { googleId, email, name, avatarUrl } = request.body || {}

    if (!googleId || !email) {
      return reply.code(400).send({ error: 'Google credentials required' })
    }

    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user) {
      // Check if email already exists (link accounts)
      user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, avatarUrl: avatarUrl || user.avatarUrl },
        })
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            name: name || email.split('@')[0],
            avatarUrl,
          },
        })
      }
    }

    const token = app.jwt.sign({ id: user.id, email: user.email })

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      .send({
        user: sanitizeUser(user),
        token,
      })
  })

  /* ---- Me ---- */
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
    })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    reply.send({ user: sanitizeUser(user) })
  })

  /* ---- Logout ---- */
  app.post('/logout', async (request, reply) => {
    reply
      .clearCookie('token', { path: '/' })
      .send({ success: true })
  })
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user
  return safe
}
