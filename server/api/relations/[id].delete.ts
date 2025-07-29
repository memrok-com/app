import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  const id = getRouterParam(event, "id")

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Relation ID is required",
    })
  }

  // Check if relation exists using RLS-aware database
  const existingRelation = await userDb.getRelation(id)

  if (!existingRelation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Relation not found",
    })
  }

  // Get entity details for response using RLS-aware database
  const subjectEntity = await userDb.getEntity(existingRelation.subjectId)
  const objectEntity = await userDb.getEntity(existingRelation.objectId)

  // Delete relation using RLS-aware database
  const deletedRelation = await userDb.deleteRelation(id)

  if (!deletedRelation) {
    throw createError({
      statusCode: 404,
      statusMessage: "Relation not found during deletion",
    })
  }

  return {
    message: "Relation deleted successfully",
    deletedRelation: {
      ...deletedRelation,
      subjectEntity: subjectEntity
        ? {
            id: subjectEntity.id,
            name: subjectEntity.name,
            type: subjectEntity.type,
          }
        : null,
      objectEntity: objectEntity
        ? {
            id: objectEntity.id,
            name: objectEntity.name,
            type: objectEntity.type,
          }
        : null,
    },
  }
})
