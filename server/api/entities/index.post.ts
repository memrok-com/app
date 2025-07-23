import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name and type are required'
      })
    }

    // Validate that either createdByUser or createdByAssistant is provided
    if (!body.createdByUser && !body.createdByAssistant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either createdByUser or createdByAssistant must be provided'
      })
    }

    // Create entity
    const [entity] = await db
      .insert(schema.entities)
      .values({
        name: body.name,
        type: body.type,
        metadata: body.metadata || null,
        createdByUser: body.createdByUser || null,
        createdByAssistant: body.createdByAssistant || null,
        updatedByUser: body.createdByUser || null,
        updatedByAssistant: body.createdByAssistant || null,
      })
      .returning()

    return {
      entity,
      message: 'Entity created successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Handle database errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create entity',
      data: error
    })
  }
})