import { eq, and, or, ilike, desc, sql } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { 
      limit = '50', 
      offset = '0', 
      search,
      type
    } = query

    // Build the where conditions
    const conditions = []
    
    if (search) {
      conditions.push(
        or(
          ilike(schema.assistants.name, `%${search}%`),
          ilike(schema.assistants.type, `%${search}%`),
          ilike(schema.assistants.externalId, `%${search}%`)
        )
      )
    }
    
    if (type) {
      conditions.push(eq(schema.assistants.type, type as string))
    }

    // Execute query to get assistants
    const assistants = await db
      .select()
      .from(schema.assistants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.assistants.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.assistants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return {
      assistants,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: parseInt(totalResult[0].count as string)
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assistants',
      data: error
    })
  }
})