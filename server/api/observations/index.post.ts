import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.entityId || !body.content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'entityId and content are required'
      })
    }

    // Validate that either createdByUser or createdByAssistant is provided
    if (!body.createdByUser && !body.createdByAssistant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either createdByUser or createdByAssistant must be provided'
      })
    }

    // Check that entity exists
    const [entity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, body.entityId))

    if (!entity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Entity not found'
      })
    }

    // Parse observedAt date if provided, otherwise use current time
    let observedAt = new Date()
    if (body.observedAt) {
      observedAt = new Date(body.observedAt)
      if (isNaN(observedAt.getTime())) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid observedAt date format'
        })
      }
    }

    // Create observation
    const [observation] = await db
      .insert(schema.observations)
      .values({
        entityId: body.entityId,
        content: body.content,
        observedAt: observedAt,
        source: body.source || null,
        metadata: body.metadata || null,
        createdByUser: body.createdByUser || null,
        createdByAssistant: body.createdByAssistant || null,
      })
      .returning()

    return {
      observation: {
        ...observation,
        entity: {
          id: entity.id,
          name: entity.name,
          type: entity.type
        }
      },
      message: 'Observation created successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Handle database errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create observation',
      data: error
    })
  }
})