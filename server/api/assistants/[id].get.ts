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

    const [assistant] = await db
      .select()
      .from(schema.assistants)
      .where(eq(schema.assistants.id, id))

    if (!assistant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assistant not found'
      })
    }

    return { assistant }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assistant',
      data: error
    })
  }
})