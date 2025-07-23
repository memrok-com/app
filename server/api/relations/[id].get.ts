import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Relation ID is required'
      })
    }

    // Fetch relation by ID
    const [relation] = await db
      .select()
      .from(schema.relations)
      .where(eq(schema.relations.id, id))

    if (!relation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Relation not found'
      })
    }

    // Get subject and object entities
    const [subjectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, relation.subjectId))

    const [objectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, relation.objectId))

    return { 
      relation: {
        ...relation,
        subjectEntity: subjectEntity || null,
        objectEntity: objectEntity || null
      }
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch relation',
      data: error
    })
  }
})