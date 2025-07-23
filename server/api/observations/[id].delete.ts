import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
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

    // Get entity details for response
    const [entity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, existingObservation.entityId))

    // Delete observation
    await db
      .delete(schema.observations)
      .where(eq(schema.observations.id, id))

    return {
      message: 'Observation deleted successfully',
      deletedObservation: {
        ...existingObservation,
        entity: entity || null
      }
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete observation',
      data: error
    })
  }
})