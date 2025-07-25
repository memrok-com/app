import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const body = await readBody(event)
  
  // Validate required fields
  if (!body.subjectId || !body.objectId || !body.predicate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'subjectId, objectId, and predicate are required'
    })
  }

  // Validate strength is between 0 and 1 if provided
  if (body.strength !== undefined && (body.strength < 0 || body.strength > 1)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Strength must be between 0 and 1'
    })
  }

  // Check that both subject and object entities exist (RLS ensures only user's entities are accessible)
  const subjectEntity = await userDb.getEntity(body.subjectId)
  if (!subjectEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Subject entity not found'
    })
  }

  const objectEntity = await userDb.getEntity(body.objectId)
  if (!objectEntity) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Object entity not found'
    })
  }

  // Create relation using user-scoped database
  const relation = await userDb.createRelation({
    subjectId: body.subjectId,
    objectId: body.objectId,
    predicate: body.predicate,
    strength: body.strength || 1.0,
    metadata: body.metadata || undefined,
    createdByUser: body.createdByUser || user.id,
    createdByAssistant: body.createdByAssistant || undefined
  })

  return {
    relation: {
      ...relation,
      subjectEntity: {
        id: subjectEntity.id,
        name: subjectEntity.name,
        type: subjectEntity.type
      },
      objectEntity: {
        id: objectEntity.id,
        name: objectEntity.name,
        type: objectEntity.type
      }
    },
    message: 'Relation created successfully'
  }
})