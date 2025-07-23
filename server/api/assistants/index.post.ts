import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'name and type are required'
      })
    }

    // Check if assistant with same external ID already exists (if provided)
    if (body.externalId) {
      const [existingAssistant] = await db
        .select()
        .from(schema.assistants)
        .where(eq(schema.assistants.externalId, body.externalId))

      if (existingAssistant) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Assistant with this external ID already exists'
        })
      }
    }

    // Create assistant
    const [assistant] = await db
      .insert(schema.assistants)
      .values({
        name: body.name,
        type: body.type,
        externalId: body.externalId || null,
        config: body.config || null,
      })
      .returning()

    return {
      assistant,
      message: 'Assistant created successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Handle database errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create assistant',
      data: error
    })
  }
})