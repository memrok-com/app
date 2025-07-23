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

    // Check if relation exists
    const [existingRelation] = await db
      .select()
      .from(schema.relations)
      .where(eq(schema.relations.id, id))

    if (!existingRelation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Relation not found'
      })
    }

    // Get entity details for response
    const [subjectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, existingRelation.subjectId))

    const [objectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, existingRelation.objectId))

    // Delete relation
    await db
      .delete(schema.relations)
      .where(eq(schema.relations.id, id))

    return {
      message: 'Relation deleted successfully',
      deletedRelation: {
        ...existingRelation,
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
      statusMessage: 'Failed to delete relation',
      data: error
    })
  }
})