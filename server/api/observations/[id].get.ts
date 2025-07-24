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

    // Fetch observation by ID
    const [observation] = await db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.id, id))

    if (!observation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Observation not found'
      })
    }

    // Get entity details
    const [entity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, observation.entityId))

    return { 
      observation: {
        ...observation,
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
      statusMessage: 'Failed to fetch observation',
      data: error
    })
  }
})