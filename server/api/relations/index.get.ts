import { createAuthenticatedHandler } from "../../utils/auth-middleware"

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const query = getQuery(event)
  const {
    limit = 50,
    offset = 0,
    subjectId,
    objectId,
    predicate,
    search,
    minStrength,
    maxStrength,
    createdByAssistantName,
  } = query

  // Build filters for the user-scoped database
  const filters: any = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  }

  if (subjectId) {
    filters.subjectId = subjectId as string
  }

  if (objectId) {
    filters.objectId = objectId as string
  }

  if (predicate) {
    filters.predicate = predicate as string
  }

  if (createdByAssistantName) {
    filters.createdByAssistantName = createdByAssistantName as string
  }

  // Get relations using user-scoped database - RLS ensures only user's relations are accessible
  let relations = await userDb.getRelations(filters)

  // Apply additional filters in memory that aren't supported by UserScopedDatabase yet
  if (search) {
    const searchLower = (search as string).toLowerCase()
    relations = relations.filter(
      (relation) =>
        relation.predicate.toLowerCase().includes(searchLower) ||
        (relation.metadata &&
          JSON.stringify(relation.metadata).toLowerCase().includes(searchLower))
    )
  }

  if (minStrength !== undefined) {
    const min = parseFloat(minStrength as string)
    relations = relations.filter((relation) => (relation.strength || 0) >= min)
  }

  if (maxStrength !== undefined) {
    const max = parseFloat(maxStrength as string)
    relations = relations.filter((relation) => (relation.strength || 0) <= max)
  }

  // Get entity details for each relation (only user's entities will be accessible due to RLS)
  const entityIds = [
    ...new Set([
      ...relations.map((r) => r.subjectId),
      ...relations.map((r) => r.objectId),
    ]),
  ]
  const entityDetails: Record<string, any> = {}

  // Fetch entities in batches
  for (const entityId of entityIds) {
    const entity = await userDb.getEntity(entityId)
    if (entity) {
      entityDetails[entityId] = {
        id: entity.id,
        name: entity.name,
        type: entity.type,
      }
    }
  }

  // Combine results
  const enrichedRelations = relations.map((relation) => ({
    ...relation,
    subjectEntity: entityDetails[relation.subjectId] || null,
    objectEntity: entityDetails[relation.objectId] || null,
  }))

  // Apply pagination if search/strength filters were applied
  let finalRelations = enrichedRelations
  let total = enrichedRelations.length

  if (search || minStrength !== undefined || maxStrength !== undefined) {
    // If additional filters were applied, handle pagination manually
    total = enrichedRelations.length
    finalRelations = enrichedRelations.slice(
      filters.offset,
      filters.offset + filters.limit
    )
  }

  return {
    relations: finalRelations,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  }
})
