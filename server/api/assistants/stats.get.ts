import { sql, gte } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Get assistant statistics
    const [totalCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.assistants)

    // Get assistants by type
    const typeStats = await db
      .select({
        type: schema.assistants.type,
        count: sql`count(*)`.as('count')
      })
      .from(schema.assistants)
      .groupBy(schema.assistants.type)
      .orderBy(sql`count(*) DESC`)

    // Get recent assistant activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [recentCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.assistants)
      .where(gte(schema.assistants.createdAt, sevenDaysAgo))

    return {
      total: parseInt(totalCount.count as string),
      recentActivity: parseInt(recentCount.count as string),
      byType: typeStats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count as string)
      }))
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assistant statistics',
      data: error
    })
  }
})