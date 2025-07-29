import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  // Erase all user data using the bulk operation in UserScopedDatabase
  // RLS ensures only the authenticated user's data is deleted
  const result = await userDb.eraseAllUserData()

  return {
    success: true,
    deletedCounts: {
      entities: result.deletedEntities,
      relations: result.deletedRelations,
      observations: result.deletedObservations,
    },
    message: "All memories have been successfully erased",
  }
})
