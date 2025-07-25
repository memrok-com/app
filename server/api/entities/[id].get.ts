import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entity ID is required'
    })
  }

  // Get entity using user-scoped database - RLS ensures only user's entities are accessible
  const entity = await userDb.getEntity(id)

  if (!entity) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entity not found'
    })
  }

  return { entity }
})