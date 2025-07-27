import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Assistant ID is required",
    })
  }

  // Get assistant using user-scoped database - RLS ensures only user's assistants are accessible
  const assistant = await userDb.getAssistant(id)

  if (!assistant) {
    throw createError({
      statusCode: 404,
      statusMessage: "Assistant not found",
    })
  }

  return { assistant }
})
