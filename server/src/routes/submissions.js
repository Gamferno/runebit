import { executeCode } from '../services/judge0.js'

export default async function submissionRoutes(app) {
  const { prisma } = app

  /* ---- Run code (test without submitting — no XP) ---- */
  app.post('/run', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { problemId, language, code } = request.body || {}

    if (!problemId || !language || !code) {
      return reply.code(400).send({ error: 'problemId, language, and code required' })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: Number(problemId) },
    })
    if (!problem) return reply.code(404).send({ error: 'Problem not found' })

    const testCases = JSON.parse(problem.testCases)
    const results = []

    for (const tc of testCases) {
      try {
        const result = await executeCode(language, code, tc.input)
        const passed = result.stdout?.trim() === tc.expected?.trim()
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: result.stdout?.trim() || '',
          passed,
          error: result.stderr || null,
          runtime: result.time,
          memory: result.memory,
        })
      } catch (err) {
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: '',
          passed: false,
          error: err.message,
        })
      }
    }

    const allPassed = results.every(r => r.passed)
    const passedCount = results.filter(r => r.passed).length

    return {
      status: allPassed ? 'all_passed' : 'partial',
      passedCount,
      totalCount: testCases.length,
      results,
    }
  })

  /* ---- Submit code (validate + award XP) ---- */
  app.post('/submit', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { problemId, language, code, peeked } = request.body || {}
    const userId = request.user.id

    if (!problemId || !language || !code) {
      return reply.code(400).send({ error: 'problemId, language, and code required' })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: Number(problemId) },
    })
    if (!problem) return reply.code(404).send({ error: 'Problem not found' })

    const testCases = JSON.parse(problem.testCases)
    const results = []

    for (const tc of testCases) {
      try {
        const result = await executeCode(language, code, tc.input)
        const passed = result.stdout?.trim() === tc.expected?.trim()
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: result.stdout?.trim() || '',
          passed,
          error: result.stderr || null,
          runtime: result.time,
          memory: result.memory,
        })
      } catch (err) {
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: '',
          passed: false,
          error: err.message,
        })
      }
    }

    const allPassed = results.every(r => r.passed)
    const passedCount = results.filter(r => r.passed).length

    // Calculate stars
    let stars = 0
    if (allPassed) {
      const avgRuntime = results.reduce((s, r) => s + (parseFloat(r.runtime) || 0), 0) / results.length
      if (avgRuntime < 0.1) stars = 3
      else if (avgRuntime < 0.5) stars = 2
      else stars = 1
    }

    const xpGained = allPassed ? Math.round(problem.xpReward * (stars === 3 ? 1.5 : stars === 2 ? 1 : 0.7) * (peeked ? 0.2 : 1)) : 0

    // Save submission
    await prisma.submission.create({
      data: {
        userId,
        problemId: problem.id,
        language,
        code,
        status: allPassed ? 'passed' : 'failed',
        stars,
        xpGained,
        runtime: results[0]?.runtime || null,
        memory: results[0]?.memory || null,
      },
    })

    // Update progress & user if passed
    if (allPassed) {
      const existing = await prisma.userProgress.findUnique({
        where: { userId_problemId: { userId, problemId: problem.id } },
      })

      if (!existing || stars > existing.stars) {
        await prisma.userProgress.upsert({
          where: { userId_problemId: { userId, problemId: problem.id } },
          create: { userId, problemId: problem.id, completed: true, stars },
          update: { completed: true, stars: Math.max(existing?.stars || 0, stars) },
        })
      }

      // Award XP + level up
      const user = await prisma.user.findUnique({ where: { id: userId } })
      let newXp = user.xp + xpGained
      let newLevel = user.level
      let xpToNext = user.xpToNext

      while (newXp >= xpToNext) {
        newXp -= xpToNext
        newLevel++
        xpToNext = Math.floor(xpToNext * 1.5)
      }

      // Daily streak logic — streak counts consecutive days with at least one correct submission
      const now = new Date()
      const today = now.toDateString()
      const yesterday = new Date(now - 86400000).toDateString()
      const lastActiveStr = user.lastActiveDate
        ? new Date(user.lastActiveDate).toDateString()
        : null

      let newStreak = user.streak || 0

      if (lastActiveStr === today) {
        // Already counted today's activity — no change
        newStreak = newStreak // keep as-is
      } else if (lastActiveStr === yesterday) {
        // Consecutive day — increment streak
        newStreak += 1
      } else if (!lastActiveStr) {
        // First ever submission — start streak at 1
        newStreak = 1
      } else {
        // Missed one or more days — reset streak to 1 (today counts)
        newStreak = 1
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          level: newLevel,
          xpToNext,
          title: getTitleForLevel(newLevel),
          streak: newStreak,
          lastActiveDate: new Date(),
        },
      })

    }

    return {
      status: allPassed ? 'passed' : 'failed',
      passedCount,
      totalCount: testCases.length,
      stars,
      xpGained,
      results,
      levelUp: false, // TODO: compute from before/after
    }
  })
}

function getTitleForLevel(lvl) {
  if (lvl >= 50) return 'Legendary Dev'
  if (lvl >= 30) return 'Algorithm Ace'
  if (lvl >= 20) return 'Code Warrior'
  if (lvl >= 10) return 'Bug Squasher'
  if (lvl >= 5) return 'Script Kiddie'
  return 'Newbie Coder'
}
