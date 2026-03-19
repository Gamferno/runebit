export default async function problemRoutes(app) {
  const { prisma } = app

  /* ---- Skill tree (all topics + problems + user progress) ---- */
  app.get('/tree', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const userId = request.user.id

    const topics = await prisma.topic.findMany({
      include: {
        problems: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ tier: 'asc' }, { order: 'asc' }],
    })

    const progress = await prisma.userProgress.findMany({
      where: { userId },
    })

    const progressMap = {}
    for (const p of progress) {
      progressMap[p.problemId] = p
    }

    // Determine unlocked tiers
    const tierGroups = {}
    for (const topic of topics) {
      if (!tierGroups[topic.tier]) tierGroups[topic.tier] = []
      tierGroups[topic.tier].push(topic)
    }

    const tierUnlocked = {}
    for (let t = 1; t <= 7; t++) {
      if (t === 1) {
        tierUnlocked[t] = true
        continue
      }
      // Previous tier all problems must be completed
      const prevTopics = tierGroups[t - 1] || []
      const allPrevDone = prevTopics.every(topic =>
        topic.problems.every(p => progressMap[p.id]?.completed)
      )
      tierUnlocked[t] = allPrevDone
    }

    // Build tree
    const tree = topics.map(topic => ({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      rpgName: topic.rpgName,
      tier: topic.tier,
      icon: topic.icon,
      color: topic.color,
      unlocked: tierUnlocked[topic.tier] || false,
      problems: topic.problems.map(p => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        enemyName: p.enemyName,
        enemyTier: p.enemyTier,
        xpReward: p.xpReward,
        completed: progressMap[p.id]?.completed || false,
        stars: progressMap[p.id]?.stars || 0,
      })),
      completedCount: topic.problems.filter(p => progressMap[p.id]?.completed).length,
      totalCount: topic.problems.length,
    }))

    return { tree, tierUnlocked }
  })

  /* ---- Single problem ---- */
  app.get('/:id', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const problem = await prisma.problem.findUnique({
      where: { id: Number(request.params.id) },
      include: { topic: true },
    })

    if (!problem) return reply.code(404).send({ error: 'Problem not found' })

    return {
      problem: {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        enemyName: problem.enemyName,
        enemyTier: problem.enemyTier,
        xpReward: problem.xpReward,
        enemyHp: problem.enemyHp,
        starterCode: JSON.parse(problem.starterCode),
        testCases: JSON.parse(problem.testCases),
        topic: {
          name: problem.topic.name,
          rpgName: problem.topic.rpgName,
          tier: problem.topic.tier,
          color: problem.topic.color,
        },
      },
    }
  })

  /* ---- Reveal solution (no XP cost — penalty applied at submit time) ---- */
  app.post('/:id/solution', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const problem = await prisma.problem.findUnique({
      where: { id: Number(request.params.id) },
    })

    if (!problem) return reply.code(404).send({ error: 'Problem not found' })

    return {
      solution: JSON.parse(problem.solution),
      xpCost: 0,
    }
  })
}
