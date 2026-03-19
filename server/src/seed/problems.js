import { PrismaClient } from '@prisma/client'
import { TOPICS } from './topics.js'
import { PROBLEMS_T1_T2 } from './problems_t1_t2.js'
import { PROBLEMS_T3_T4 } from './problems_t3_t4.js'
import { PROBLEMS_T5_T7 } from './problems_t5_t7.js'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.achievement.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.problem.deleteMany()
  await prisma.topic.deleteMany()
  console.log('  ✓ Cleared existing data')

  // Insert topics
  for (const topic of TOPICS) {
    await prisma.topic.create({ data: topic })
  }
  console.log(`  ✓ Created ${TOPICS.length} topics`)

  // Insert problems
  const allProblems = [...PROBLEMS_T1_T2, ...PROBLEMS_T3_T4, ...PROBLEMS_T5_T7]

  for (const p of allProblems) {
    const topic = await prisma.topic.findUnique({ where: { slug: p.topic } })
    if (!topic) {
      console.warn(`  ⚠ Topic not found: ${p.topic}`)
      continue
    }

    await prisma.problem.create({
      data: {
        topicId: topic.id,
        title: p.title,
        description: p.title, // Simple desc
        difficulty: p.diff,
        enemyName: p.enemy,
        enemyTier: p.enemyTier ?? p.tier,
        xpReward: p.xp,
        enemyHp: p.hp,
        starterCode: p.starter,
        testCases: p.tests,
        solution: p.solution,
        order: p.order,
      },
    })
  }

  console.log(`  ✓ Created ${allProblems.length} problems`)
  console.log('✅ Seeding complete!')
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
