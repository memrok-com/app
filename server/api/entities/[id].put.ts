import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Entity ID is required",
    })
  }

  // Check if entity exists (RLS ensures only user's entities are accessible)
  const existingEntity = await userDb.getEntity(id)

  if (!existingEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entity not found",
    })
  }

  // Build update data with only provided fields
  const updateData: Partial<{ 
    name: string
    type: string
    metadata: Record<string, unknown> | null
    updatedByUser?: string | null
    updatedByAssistant?: string | null
  }> = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.type !== undefined) updateData.type = body.type
  if (body.metadata !== undefined) updateData.metadata = body.metadata
  if (body.updatedByUser !== undefined)
    updateData.updatedByUser = body.updatedByUser
  if (body.updatedByAssistant !== undefined)
    updateData.updatedByAssistant = body.updatedByAssistant

  // Update entity using user-scoped database
  const baseEntity = await userDb.updateEntity(id, updateData as any)

  if (!baseEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entity not found or update failed",
    })
  }

  // Get current counts for the updated entity
  const [relationsResult, observationsResult] = await Promise.all([
    userDb.getRelationsCount(id),
    userDb.getObservationsCount(id)
  ])

  // Return entity with current counts
  const entity = {
    ...baseEntity,
    relationsCount: relationsResult || 0,
    observationsCount: observationsResult || 0,
    createdByAssistantInfo: baseEntity.createdByAssistantName
      ? {
          name: baseEntity.createdByAssistantName,
          type: baseEntity.createdByAssistantType,
        }
      : null,
  }

  return {
    entity,
    message: "Entity updated successfully",
  }
})
