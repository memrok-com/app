import { sql, gte } from "drizzle-orm"
import { createAuthenticatedHandler } from "../../utils/auth-middleware"
import { schema } from "../../utils/db"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  // Get observation statistics using RLS-aware database
  const stats = await userDb.execute(async (db) => {
    // Get total observation count
    const [totalCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.observations)

    // Get observations by entity type
    const entityTypeStats = await db
      .select({
        entityType: schema.entities.type,
        count: sql`count(*)`.as("count"),
      })
      .from(schema.observations)
      .leftJoin(
        schema.entities,
        sql`${schema.observations.entityId} = ${schema.entities.id}`
      )
      .groupBy(schema.entities.type)
      .orderBy(sql`count(*) DESC`)

    // Get recent observation activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [recentCount] = await db
      .select({ count: sql`count(*)` })
      .from(schema.observations)
      .where(gte(schema.observations.createdAt, sevenDaysAgo))

    return {
      totalCount,
      entityTypeStats,
      recentCount,
    }
  })

  return {
    total: parseInt(stats.totalCount.count as string),
    recentActivity: parseInt(stats.recentCount.count as string),
    byEntityType: stats.entityTypeStats.map((stat) => ({
      entityType: stat.entityType || "unknown",
      count: parseInt(stat.count as string),
    })),
  }
})
