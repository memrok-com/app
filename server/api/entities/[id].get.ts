import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Entity ID is required'
      })
    }

    // Fetch entity by ID
    const [entity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, id))

    if (!entity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Entity not found'
      })
    }

    return { entity }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch entity',
      data: error
    })
  }
})