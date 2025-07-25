import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Assistant ID is required'
    })
  }

  // Check if assistant exists (RLS ensures only user's assistants are accessible)
  const existingAssistant = await userDb.getAssistant(id)

  if (!existingAssistant) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Assistant not found'
    })
  }

  // Check if external ID is being updated and would create a conflict
  if (body.externalId && body.externalId !== existingAssistant.externalId) {
    const allAssistants = await userDb.getAssistants()
    const conflictingAssistant = allAssistants.find(a => a.externalId === body.externalId)

    if (conflictingAssistant) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Assistant with this external ID already exists'
      })
    }
  }

  // Build update data with only provided fields
  const updateData: any = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.type !== undefined) updateData.type = body.type
  if (body.externalId !== undefined) updateData.externalId = body.externalId
  if (body.config !== undefined) updateData.config = body.config

  // Update assistant using user-scoped database
  const updatedAssistant = await userDb.updateAssistant(id, updateData)

  if (!updatedAssistant) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Assistant not found or update failed'
    })
  }

  return {
    assistant: updatedAssistant,
    message: 'Assistant updated successfully'
  }
})