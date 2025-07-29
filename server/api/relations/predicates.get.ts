import { sql } from "drizzle-orm"
import { createAuthenticatedHandler } from "../../utils/auth-middleware"
import { schema } from "../../utils/db"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  // Get distinct predicates with count and average strength using RLS-aware database
  const predicates = await userDb.execute(async (db) => {
    return await db
      .select({
        predicate: schema.relations.predicate,
        count: sql`count(*)`.as("count"),
        avgStrength: sql`avg(${schema.relations.strength})`.as("avgStrength"),
      })
      .from(schema.relations)
      .groupBy(schema.relations.predicate)
      .orderBy(schema.relations.predicate)
  })

  return {
    predicates: predicates.map((p) => ({
      predicate: p.predicate,
      count: parseInt(p.count as string),
      avgStrength: parseFloat((p.avgStrength as string) || "0"),
    })),
  }
})
