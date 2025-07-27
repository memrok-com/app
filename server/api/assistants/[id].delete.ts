import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Assistant ID is required",
    })
  }

  // Delete assistant using user-scoped database
  // RLS ensures only user's assistants can be deleted
  const deletedAssistant = await userDb.deleteAssistant(id)

  if (!deletedAssistant) {
    throw createError({
      statusCode: 404,
      statusMessage: "Assistant not found",
    })
  }

  return {
    message: "Assistant deleted successfully",
  }
})
