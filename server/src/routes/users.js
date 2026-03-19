export default async function userRoutes(app) {
  const { prisma } = app

  /* ---- Get user stats ---- */
  app.get('/me/stats', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const userId = request.user.id

    const user = await prisma.user.findUnique({ where: { id: userId } })
    const progress = await prisma.userProgress.findMany({
      where: { userId, completed: true },
      include: { problem: { include: { topic: true } } },
    })

    const totalSolved = progress.length
    const totalStars = progress.reduce((sum, p) => sum + p.stars, 0)

    // Skills per topic
    const topicSkills = {}
    for (const p of progress) {
      const slug = p.problem.topic.slug
      topicSkills[slug] = (topicSkills[slug] || 0) + 1
    }

    // Tier completion
    const topics = await prisma.topic.findMany({
      include: { problems: true },
      orderBy: [{ tier: 'asc' }, { order: 'asc' }],
    })

    const tierProgress = {}
    for (const topic of topics) {
      if (!tierProgress[topic.tier]) tierProgress[topic.tier] = { total: 0, completed: 0 }
      tierProgress[topic.tier].total += topic.problems.length
      tierProgress[topic.tier].completed += topic.problems.filter(
        prob => progress.some(p => p.problemId === prob.id)
      ).length
    }

    // Highest unlocked tier
    let highestTier = 1
    for (let t = 1; t <= 7; t++) {
      if (t === 1) { highestTier = 1; continue }
      const prevTier = tierProgress[t - 1]
      if (prevTier && prevTier.completed >= prevTier.total) {
        highestTier = t
      } else {
        break
      }
    }

    return {
      user: {
        id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl,
        level: user.level, xp: user.xp, xpToNext: user.xpToNext,
        streak: user.streak, title: user.title,
      },
      totalSolved,
      totalStars,
      topicSkills,
      tierProgress,
      highestTier,
    }
  })

  /* ---- Get progress tree ---- */
  app.get('/me/progress', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const progress = await prisma.userProgress.findMany({
      where: { userId: request.user.id },
    })
    return { progress }
  })

  /* ---- Update profile ---- */
  app.put('/me/profile', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { name, avatarUrl } = request.body || {}
    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: {
        ...(name && { name }),
        ...(avatarUrl && { avatarUrl }),
      },
    })
    const { passwordHash, ...safe } = user
    return { user: safe }
  })
}
