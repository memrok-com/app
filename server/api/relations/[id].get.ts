import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Relation ID is required'
    })
  }

  // Fetch relation by ID using RLS-aware database
  const relation = await userDb.getRelation(id)

  if (!relation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Relation not found'
    })
  }

  // Get subject and object entities using RLS-aware database
  const subjectEntity = await userDb.getEntity(relation.subjectId)
  const objectEntity = await userDb.getEntity(relation.objectId)

  return { 
    relation: {
      ...relation,
      subjectEntity: subjectEntity ? {
        id: subjectEntity.id,
        name: subjectEntity.name,
        type: subjectEntity.type
      } : null,
      objectEntity: objectEntity ? {
        id: objectEntity.id,
        name: objectEntity.name,
        type: objectEntity.type
      } : null
    }
  }
})