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

    // Check if entity exists
    const [existingEntity] = await db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, id))

    if (!existingEntity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Entity not found'
      })
    }

    // Note: In a production system, you might want to soft delete
    // or check for related records before deleting
    await db
      .delete(schema.entities)
      .where(eq(schema.entities.id, id))

    return {
      message: 'Entity deleted successfully',
      deletedEntity: existingEntity
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete entity',
      data: error
    })
  }
})