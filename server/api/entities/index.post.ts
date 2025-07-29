import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const body = await readBody(event)

  // Validate required fields
  if (!body.name || !body.type) {
    throw createError({
      statusCode: 400,
      statusMessage: "Name and type are required",
    })
  }

  // Create entity using user-scoped database
  // The userDb automatically sets the correct user_id and RLS context
  const baseEntity = await userDb.createEntity({
    name: body.name,
    type: body.type,
    metadata: body.metadata || undefined,
    createdByUser: body.createdByUser || user.id,
    createdByAssistantName: body.createdByAssistantName || undefined,
    createdByAssistantType: body.createdByAssistantType || undefined,
  })

  // Return entity with counts (new entities have 0 relations and observations)
  const entity = {
    ...baseEntity,
    relationsCount: 0,
    observationsCount: 0,
    createdByAssistantInfo: baseEntity.createdByAssistantName
      ? {
          name: baseEntity.createdByAssistantName,
          type: baseEntity.createdByAssistantType,
        }
      : null,
  }

  return {
    entity,
    message: "Entity created successfully",
  }
})
