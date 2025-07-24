import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Relation ID is required'
      })
    }

    // Validate that either updatedByUser or updatedByAssistant is provided
    if (!body.updatedByUser && !body.updatedByAssistant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either updatedByUser or updatedByAssistant must be provided'
      })
    }

    // Validate strength is between 0 and 1 if provided
    if (body.strength !== undefined && (body.strength < 0 || body.strength > 1)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Strength must be between 0 and 1'
      })
    }

    // Check if relation exists
    const [existingRelation] = await db
      .select()
      .from(schema.relations)
      .where(eq(schema.relations.id, id))

    if (!existingRelation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Relation not found'
      })
    }

    // If subjectId or objectId are being updated, validate entities exist
    if (body.subjectId && body.subjectId !== existingRelation.subjectId) {
      const [subjectEntity] = await db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.id, body.subjectId))

      if (!subjectEntity) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Subject entity not found'
        })
      }
    }

    if (body.objectId && body.objectId !== existingRelation.objectId) {
      const [objectEntity] = await db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.id, body.objectId))

      if (!objectEntity) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Object entity not found'
        })
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedByUser: body.updatedByUser || null,
      updatedByAssistant: body.updatedByAssistant || null,
      updatedAt: new Date()
    }

    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
    if (body.objectId !== undefined) updateData.objectId = body.objectId
    if (body.predicate !== undefined) updateData.predicate = body.predicate
    if (body.strength !== undefined) updateData.strength = body.strength
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    // Update relation
    const [updatedRelation] = await db
      .update(schema.relations)
      .set(updateData)
      .where(eq(schema.relations.id, id))
      .returning()

    // Get entity details for response
    const [subjectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, updatedRelation.subjectId))

    const [objectEntity] = await db
      .select({
        id: schema.entities.id,
        name: schema.entities.name,
        type: schema.entities.type
      })
      .from(schema.entities)
      .where(eq(schema.entities.id, updatedRelation.objectId))

    return {
      relation: {
        ...updatedRelation,
        subjectEntity: subjectEntity || null,
        objectEntity: objectEntity || null
      },
      message: 'Relation updated successfully'
    }
  } catch (error) {
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update relation',
      data: error
    })
  }
})