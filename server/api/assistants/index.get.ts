import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const query = getQuery(event)
  const { limit = 50, offset = 0, search, type } = query

  // Build filters for the user-scoped database
  const filters: any = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  }

  if (type) {
    filters.type = type as string
  }

  // Note: search functionality would need to be added to UserScopedDatabase.getAssistants
  // For now, we'll get all assistants with basic filtering
  const assistants = await userDb.getAssistants()

  // Apply search filter in memory if needed (can be optimized later by adding to UserScopedDatabase)
  let filteredAssistants = assistants
  if (search) {
    const searchLower = (search as string).toLowerCase()
    filteredAssistants = assistants.filter(
      (assistant) =>
        assistant.name.toLowerCase().includes(searchLower) ||
        assistant.type.toLowerCase().includes(searchLower) ||
        (assistant.externalId &&
          assistant.externalId.toLowerCase().includes(searchLower))
    )
  }

  // Apply pagination to filtered results
  const total = filteredAssistants.length
  const paginatedAssistants = filteredAssistants.slice(
    filters.offset,
    filters.offset + filters.limit
  )

  return {
    assistants: paginatedAssistants,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  }
})
