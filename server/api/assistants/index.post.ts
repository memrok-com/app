import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const body = await readBody(event)

  // Validate required fields
  if (!body.name || !body.type) {
    throw createError({
      statusCode: 400,
      statusMessage: "name and type are required",
    })
  }

  // Check if assistant with same external ID already exists (if provided)
  if (body.externalId) {
    // Get all user's assistants and check for duplicates
    // This is automatically scoped to the user due to RLS
    const existingAssistants = await userDb.getAssistants()
    const existingAssistant = existingAssistants.find(
      (a) => a.externalId === body.externalId
    )

    if (existingAssistant) {
      throw createError({
        statusCode: 409,
        statusMessage: "Assistant with this external ID already exists",
      })
    }
  }

  // Create assistant using user-scoped database
  // The userDb automatically sets the correct user_id and RLS context
  const assistant = await userDb.createAssistant({
    name: body.name,
    type: body.type,
    externalId: body.externalId || undefined,
    config: body.config || undefined,
  })

  return {
    assistant,
    message: "Assistant created successfully",
  }
})
