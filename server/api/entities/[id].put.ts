import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entity ID is required'
    })
  }

  // Check if entity exists (RLS ensures only user's entities are accessible)
  const existingEntity = await userDb.getEntity(id)

  if (!existingEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entity not found'
    })
  }

  // Build update data with only provided fields
  const updateData: any = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.type !== undefined) updateData.type = body.type
  if (body.metadata !== undefined) updateData.metadata = body.metadata
  if (body.updatedByUser !== undefined) updateData.updatedByUser = body.updatedByUser
  if (body.updatedByAssistant !== undefined) updateData.updatedByAssistant = body.updatedByAssistant

  // Update entity using user-scoped database
  const updatedEntity = await userDb.updateEntity(id, updateData)

  if (!updatedEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entity not found or update failed'
    })
  }

  return {
    entity: updatedEntity,
    message: 'Entity updated successfully'
  }
})