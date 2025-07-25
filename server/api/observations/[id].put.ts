import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Observation ID is required'
    })
  }

  // Check if observation exists using RLS-aware database
  const existingObservation = await userDb.getObservation(id)

  if (!existingObservation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Observation not found'
    })
  }

  // If entityId is being updated, validate entity exists
  if (body.entityId && body.entityId !== existingObservation.entityId) {
    const entity = await userDb.getEntity(body.entityId)

    if (!entity) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Entity not found'
      })
    }
  }

  // Build update object with only provided fields
  const updateData: any = {}

  if (body.content !== undefined) updateData.content = body.content
  if (body.source !== undefined) updateData.source = body.source
  if (body.metadata !== undefined) updateData.metadata = body.metadata

  // Update observation using RLS-aware database
  const updatedObservation = await userDb.updateObservation(id, updateData)

  if (!updatedObservation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Observation not found after update'
    })
  }

  // Get entity details for response using RLS-aware database
  const entity = await userDb.getEntity(updatedObservation.entityId)

  return {
    observation: {
      ...updatedObservation,
      entity: entity ? {
        id: entity.id,
        name: entity.name,
        type: entity.type
      } : null
    },
    message: 'Observation updated successfully'
  }
})