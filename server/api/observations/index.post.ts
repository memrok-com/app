import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const body = await readBody(event)

  // Validate required fields
  if (!body.entityId || !body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: "entityId and content are required",
    })
  }

  // Check that entity exists using RLS-aware database
  const entity = await userDb.getEntity(body.entityId)

  if (!entity) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entity not found",
    })
  }

  // Create observation using RLS-aware database
  const observation = await userDb.createObservation({
    entityId: body.entityId,
    content: body.content,
    source: body.source || undefined,
    metadata: body.metadata || undefined,
    createdByUser: body.createdByUser || undefined,
    createdByAssistantName: body.createdByAssistantName || undefined,
    createdByAssistantType: body.createdByAssistantType || undefined,
  })

  return {
    observation: {
      ...observation,
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
      },
    },
    message: "Observation created successfully",
  }
})
