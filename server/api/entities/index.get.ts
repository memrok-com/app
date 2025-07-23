import { eq, and, or, ilike, desc, sql } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { 
      limit = '50', 
      offset = '0', 
      type, 
      search,
      createdByUser,
      createdByAssistant 
    } = query

    // Build the where conditions
    const conditions = []
    
    if (type) {
      conditions.push(eq(schema.entities.type, type as string))
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(schema.entities.name, `%${search}%`),
          ilike(schema.entities.type, `%${search}%`)
        )
      )
    }
    
    if (createdByUser) {
      conditions.push(eq(schema.entities.createdByUser, createdByUser as string))
    }
    
    if (createdByAssistant) {
      conditions.push(eq(schema.entities.createdByAssistant, createdByAssistant as string))
    }

    // Execute query with pagination
    const entities = await db
      .select()
      .from(schema.entities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.entities.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.entities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return {
      entities,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: parseInt(totalResult[0].count as string)
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch entities',
      data: error
    })
  }
})