import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Observation ID is required'
      })
    }

    // Check if observation exists
    const [existingObservation] = await db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.id, id))

    if (!existingObservation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Observation not found'
      })
    }

    // If entityId is being updated, validate entity exists
    if (body.entityId && body.entityId !== existingObservation.entityId) {
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
    }

    // Parse observedAt date if provided
    let observedAt = undefined
    if (body.observedAt) {
      observedAt = new Date(body.observedAt)
      if (isNaN(observedAt.getTime())) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid observedAt date format'
        })
      }
    }

    // Build update object with only provided fields
    const updateData: any = {}

    if (body.entityId !== undefined) updateData.entityId = body.entityId
    if (body.content !== undefined) updateData.content = body.content
    if (observedAt !== undefined) updateData.observedAt = observedAt
    if (body.source !== undefined) updateData.source = body.source
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    // Update observation
    const [updatedObservation] = await db
      .update(schema.observations)
      .set(updateData)
      .where(eq(schema.observations.id, id))
      .returning()

    // Get entity details for response
    const [entity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, updatedObservation.entityId))

    return {
      observation: {
        ...updatedObservation,
        entity: entity || null
      },
      message: 'Observation updated successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update observation',
      data: error
    })
  }
})