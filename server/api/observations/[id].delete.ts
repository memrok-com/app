import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Observation ID is required",
    })
  }

  // Check if observation exists using RLS-aware database
  const existingObservation = await userDb.getObservation(id)

  if (!existingObservation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Observation not found",
    })
  }

  // Get entity details for response using RLS-aware database
  const entity = await userDb.getEntity(existingObservation.entityId)

  // Delete observation using RLS-aware database
  const deletedObservation = await userDb.deleteObservation(id)

  if (!deletedObservation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Observation not found during deletion",
    })
  }

  return {
    message: "Observation deleted successfully",
    deletedObservation: {
      ...deletedObservation,
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
