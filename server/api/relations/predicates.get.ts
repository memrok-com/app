import { sql } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Get distinct predicates with count and average strength
    const predicates = await db
      .select({
        predicate: schema.relations.predicate,
        count: sql`count(*)`.as('count'),
        avgStrength: sql`avg(${schema.relations.strength})`.as('avgStrength')
      })
      .from(schema.relations)
      .groupBy(schema.relations.predicate)
      .orderBy(schema.relations.predicate)

    return {
      predicates: predicates.map(p => ({
        predicate: p.predicate,
        count: parseInt(p.count as string),
        avgStrength: parseFloat((p.avgStrength as string) || '0')
      }))
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch predicates',
      data: error
    })
  }
})