import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
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

    // Check if external ID is being updated and would create a conflict
    if (body.externalId && body.externalId !== existingAssistant.externalId) {
      const [conflictingAssistant] = await db
        .select()
        .from(schema.assistants)
        .where(eq(schema.assistants.externalId, body.externalId))

      if (conflictingAssistant) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Assistant with this external ID already exists'
        })
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.externalId !== undefined) updateData.externalId = body.externalId
    if (body.config !== undefined) updateData.config = body.config

    // Update assistant
    const [updatedAssistant] = await db
      .update(schema.assistants)
      .set(updateData)
      .where(eq(schema.assistants.id, id))
      .returning()

    return {
      assistant: updatedAssistant,
      message: 'Assistant updated successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update assistant',
      data: error
    })
  }
})