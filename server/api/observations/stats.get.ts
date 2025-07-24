import { sql, gte } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Get observation statistics
    const [totalCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.observations)

    // Get observations by entity type
    const entityTypeStats = await db
      .select({
        entityType: schema.entities.type,
        count: sql`count(*)`.as('count')
      })
      .from(schema.observations)
      .leftJoin(schema.entities, sql`${schema.observations.entityId} = ${schema.entities.id}`)
      .groupBy(schema.entities.type)
      .orderBy(sql`count(*) DESC`)

    // Get recent observation activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [recentCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.observations)
      .where(gte(schema.observations.observedAt, sevenDaysAgo))

    return {
      total: parseInt(totalCount.count as string),
      recentActivity: parseInt(recentCount.count as string),
      byEntityType: entityTypeStats.map(stat => ({
        entityType: stat.entityType || 'unknown',
        count: parseInt(stat.count as string)
      }))
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch observation statistics',
      data: error
    })
  }
})