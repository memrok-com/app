import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assistant ID is required'
      })
    }

    // Check if assistant exists
    const [existingAssistant] = await db
      .select()
      .from(schema.assistants)
      .where(eq(schema.assistants.id, id))

    if (!existingAssistant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assistant not found'
      })
    }

    // Delete assistant
    await db
      .delete(schema.assistants)
      .where(eq(schema.assistants.id, id))

    return {
      message: 'Assistant deleted successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete assistant',
      data: error
    })
  }
})