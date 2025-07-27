import { createAuthenticatedHandler } from "../../utils/auth-middleware"
import type { EntitiesApiResponse } from "../../../app/types/entities"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const query = getQuery(event)
  const {
    limit = 50,
    offset = 0,
    type,
    search,
    createdByAssistant,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query

  // Build filters for the user-scoped database
  const filters: any = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  }

  if (type) {
    filters.type = type as string
  }

  if (createdByAssistant) {
    filters.createdByAssistant = createdByAssistant as string
  }

  // Get entities with counts using user-scoped database - RLS ensures only user's entities are accessible
  const entities = await userDb.getEntitiesWithCounts(filters)

  // Apply search filter in memory if needed (this could be optimized later by adding to UserScopedDatabase)
  let filteredEntities = entities
  if (search) {
    const searchLower = (search as string).toLowerCase()
    filteredEntities = entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(searchLower) ||
        entity.type.toLowerCase().includes(searchLower)
    )
  }

  // Apply pagination to filtered results if search was applied
  let finalEntities = filteredEntities
  let total = filteredEntities.length

  if (search) {
    // If search was applied, we need to handle pagination manually
    total = filteredEntities.length
    finalEntities = filteredEntities.slice(
      filters.offset,
      filters.offset + filters.limit
    )
  } else {
    // If no search, UserScopedDatabase already handled pagination
    total = entities.length // This is not accurate for pagination, but UserScopedDatabase doesn't return total count
  }

  const response: EntitiesApiResponse = {
    entities: finalEntities,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total, // Note: This won't be accurate when using pagination without search - would need to enhance UserScopedDatabase
    },
  }

  return response
})
