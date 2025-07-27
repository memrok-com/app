import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Observation ID is required",
    })
  }

  // Fetch observation by ID using RLS-aware database
  const observation = await userDb.getObservation(id)

  if (!observation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Observation not found",
    })
  }

  // Get entity details using RLS-aware database
  const entity = await userDb.getEntity(observation.entityId)

  return {
    observation: {
      ...observation,
      entity: entity
        ? {
            id: entity.id,
            name: entity.name,
            type: entity.type,
          }
        : null,
    },
  }
})
