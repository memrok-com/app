import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Entity ID is required",
    })
  }

  // Delete entity using user-scoped database
  // RLS ensures only user's entities can be deleted
  // This will also cascade to related relations and observations
  const deletedEntity = await userDb.deleteEntity(id)

  if (!deletedEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entity not found",
    })
  }

  return {
    message: "Entity deleted successfully",
    deletedEntity,
  }
})
