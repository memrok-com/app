import { sql } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Get distinct entity types with count
    const types = await db
      .select({
        type: schema.entities.type,
        count: sql`count(*)`.as('count')
      })
      .from(schema.entities)
      .groupBy(schema.entities.type)
      .orderBy(schema.entities.type)

    return {
      types: types.map(t => ({
        type: t.type,
        count: parseInt(t.count as string)
      }))
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch entity types',
      data: error
    })
  }
})