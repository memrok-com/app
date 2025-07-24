import { eq, and, or, ilike, desc, sql, inArray, gte, lte } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { 
      limit = '50', 
      offset = '0', 
      entityId,
      search,
      fromDate,
      toDate,
      createdByUser,
      createdByAssistant 
    } = query

    // Build the where conditions
    const conditions = []
    
    if (entityId) {
      conditions.push(eq(schema.observations.entityId, entityId as string))
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(schema.observations.content, `%${search}%`),
          sql`${schema.observations.metadata}::text ILIKE ${`%${search}%`}`
        )
      )
    }
    
    if (fromDate) {
      conditions.push(gte(schema.observations.createdAt, new Date(fromDate as string)))
    }
    
    if (toDate) {
      conditions.push(lte(schema.observations.createdAt, new Date(toDate as string)))
    }
    
    if (createdByUser) {
      conditions.push(eq(schema.observations.createdByUser, createdByUser as string))
    }
    
    if (createdByAssistant) {
      conditions.push(eq(schema.observations.createdByAssistant, createdByAssistant as string))
    }

    // Execute query to get observations
    const observations = await db
      .select()
      .from(schema.observations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.observations.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))

    // Get entity details for each observation
    const entityIds = [...new Set(observations.map(o => o.entityId))]
    const entities = entityIds.length > 0 ? await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(inArray(schema.entities.id, entityIds))
    : []

    // Combine results
    const enrichedObservations = observations.map(observation => ({
      ...observation,
      entity: entities.find(e => e.id === observation.entityId) || null
    }))

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.observations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return {
      observations: enrichedObservations,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: parseInt(totalResult[0].count as string)
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch observations',
      data: error
    })
  }
})