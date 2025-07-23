import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { 
      limit = '50', 
      offset = '0', 
      subjectId,
      objectId,
      predicate,
      search,
      minStrength,
      maxStrength,
      createdByUser,
      createdByAssistant 
    } = query

    // Build the where conditions
    const conditions = []
    
    if (subjectId) {
      conditions.push(eq(schema.relations.subjectId, subjectId as string))
    }
    
    if (objectId) {
      conditions.push(eq(schema.relations.objectId, objectId as string))
    }
    
    if (predicate) {
      conditions.push(ilike(schema.relations.predicate, `%${predicate}%`))
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(schema.relations.predicate, `%${search}%`),
          ilike(schema.relations.metadata, `%${search}%`)
        )
      )
    }
    
    if (minStrength) {
      conditions.push(sql`${schema.relations.strength} >= ${parseFloat(minStrength as string)}`)
    }
    
    if (maxStrength) {
      conditions.push(sql`${schema.relations.strength} <= ${parseFloat(maxStrength as string)}`)
    }
    
    if (createdByUser) {
      conditions.push(eq(schema.relations.createdByUser, createdByUser as string))
    }
    
    if (createdByAssistant) {
      conditions.push(eq(schema.relations.createdByAssistant, createdByAssistant as string))
    }

    // Execute query to get relations
    const relations = await db
      .select()
      .from(schema.relations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.relations.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))

    // Get entity details for each relation
    const entityIds = [...new Set([...relations.map(r => r.subjectId), ...relations.map(r => r.objectId)])]
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
    const enrichedRelations = relations.map(relation => ({
      ...relation,
      subjectEntity: entities.find(e => e.id === relation.subjectId) || null,
      objectEntity: entities.find(e => e.id === relation.objectId) || null
    }))

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.relations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return {
      relations: enrichedRelations,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: parseInt(totalResult[0].count as string)
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch relations',
      data: error
    })
  }
})