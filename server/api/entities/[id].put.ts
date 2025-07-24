import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Entity ID is required'
      })
    }

    // Validate that either updatedByUser or updatedByAssistant is provided
    if (!body.updatedByUser && !body.updatedByAssistant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either updatedByUser or updatedByAssistant must be provided'
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

    // Build update object with only provided fields
    const updateData: any = {
      updatedByUser: body.updatedByUser || null,
      updatedByAssistant: body.updatedByAssistant || null,
      updatedAt: new Date()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    // Update entity
    const [updatedEntity] = await db
      .update(schema.entities)
      .set(updateData)
      .where(eq(schema.entities.id, id))
      .returning()

    return {
      entity: updatedEntity,
      message: 'Entity updated successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update entity',
      data: error
    })
  }
})