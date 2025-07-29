import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, _user) => {
  // Get all user's entities (RLS ensures only user's data is accessible)
  const entities = await userDb.getEntities()

  // Calculate entity types and counts in memory
  const typeStats = entities.reduce((acc, entity) => {
    const type = entity.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const types = Object.entries(typeStats)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type))

  return { types }
})
