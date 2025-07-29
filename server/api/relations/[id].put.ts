import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Relation ID is required",
    })
  }

  // Validate strength is between 0 and 1 if provided
  if (body.strength !== undefined && (body.strength < 0 || body.strength > 1)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Strength must be between 0 and 1",
    })
  }

  // Check if relation exists using RLS-aware database
  const existingRelation = await userDb.getRelation(id)

  if (!existingRelation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Relation not found",
    })
  }

  // If subjectId or objectId are being updated, validate entities exist
  if (body.subjectId && body.subjectId !== existingRelation.subjectId) {
    const subjectEntity = await userDb.getEntity(body.subjectId)

    if (!subjectEntity) {
      throw createError({
        statusCode: 404,
        statusMessage: "Subject entity not found",
      })
    }
  }

  if (body.objectId && body.objectId !== existingRelation.objectId) {
    const objectEntity = await userDb.getEntity(body.objectId)

    if (!objectEntity) {
      throw createError({
        statusCode: 404,
        statusMessage: "Object entity not found",
      })
    }
  }

  // Build update object with only provided fields
  const updateData: Partial<{ 
    subjectId: string
    predicate: string
    objectId: string
    strength: number | null
    metadata: Record<string, unknown> | null 
  }> = {}

  if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
  if (body.objectId !== undefined) updateData.objectId = body.objectId
  if (body.predicate !== undefined) updateData.predicate = body.predicate
  if (body.strength !== undefined) updateData.strength = body.strength
  if (body.metadata !== undefined) updateData.metadata = body.metadata

  // Update relation using RLS-aware database
  const updatedRelation = await userDb.updateRelation(id, updateData as any)

  if (!updatedRelation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Relation not found after update",
    })
  }

  // Get entity details for response using RLS-aware database
  const subjectEntity = await userDb.getEntity(updatedRelation.subjectId)
  const objectEntity = await userDb.getEntity(updatedRelation.objectId)

  return {
    relation: {
      ...updatedRelation,
      subjectEntity: subjectEntity
        ? {
            id: subjectEntity.id,
            name: subjectEntity.name,
            type: subjectEntity.type,
          }
        : null,
      objectEntity: objectEntity
        ? {
            id: objectEntity.id,
            name: objectEntity.name,
            type: objectEntity.type,
          }
        : null,
    },
    message: "Relation updated successfully",
  }
})
