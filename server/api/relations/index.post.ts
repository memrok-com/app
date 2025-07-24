import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.subjectId || !body.objectId || !body.predicate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'subjectId, objectId, and predicate are required'
      })
    }

    // Validate that either createdByUser or createdByAssistant is provided
    if (!body.createdByUser && !body.createdByAssistant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either createdByUser or createdByAssistant must be provided'
      })
    }

    // Validate strength is between 0 and 1 if provided
    if (body.strength !== undefined && (body.strength < 0 || body.strength > 1)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Strength must be between 0 and 1'
      })
    }

    // Check that both subject and object entities exist
    const [subjectEntity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, body.subjectId))

    if (!subjectEntity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Subject entity not found'
      })
    }

    const [objectEntity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, body.objectId))

    if (!objectEntity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Object entity not found'
      })
    }

    // Create relation
    const [relation] = await db
      .insert(schema.relations)
      .values({
        subjectId: body.subjectId,
        objectId: body.objectId,
        predicate: body.predicate,
        strength: body.strength || 1.0,
        metadata: body.metadata || null,
        createdByUser: body.createdByUser || null,
        createdByAssistant: body.createdByAssistant || null,
        updatedByUser: body.createdByUser || null,
        updatedByAssistant: body.createdByAssistant || null,
      })
      .returning()

    return {
      relation: {
        ...relation,
        subjectEntity: {
          id: subjectEntity.id,
          name: subjectEntity.name,
          type: subjectEntity.type
        },
        objectEntity: {
          id: objectEntity.id,
          name: objectEntity.name,
          type: objectEntity.type
        }
      },
      message: 'Relation created successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Handle database errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create relation',
      data: error
    })
  }
})