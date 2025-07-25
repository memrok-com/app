import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  const query = getQuery(event)
  const { 
    limit = '50', 
    offset = '0', 
    entityId,
    search,
    fromDate,
    toDate,
    createdByAssistant 
  } = query

  // Build filters object for user-scoped database
  const filters: any = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  }
  
  if (entityId) {
    filters.entityId = entityId as string
  }
  
  if (createdByAssistant) {
    filters.createdByAssistant = createdByAssistant as string
  }

  // Get observations using RLS-aware database
  const observations = await userDb.getObservations(filters)

  // Apply additional filters that aren't directly supported by UserScopedDatabase
  let filteredObservations = observations
  
  if (search) {
    const searchLower = (search as string).toLowerCase()
    filteredObservations = observations.filter(observation => 
      observation.content.toLowerCase().includes(searchLower) ||
      (observation.metadata && JSON.stringify(observation.metadata).toLowerCase().includes(searchLower))
    )
  }
  
  if (fromDate) {
    const fromDateTime = new Date(fromDate as string)
    filteredObservations = filteredObservations.filter(observation =>
      observation.createdAt >= fromDateTime
    )
  }
  
  if (toDate) {
    const toDateTime = new Date(toDate as string)
    filteredObservations = filteredObservations.filter(observation =>
      observation.createdAt <= toDateTime
    )
  }

  // Get entity details for each observation using RLS-aware database
  const entityIds = [...new Set(filteredObservations.map(o => o.entityId))]
  const entityDetailsMap = new Map()
  
  for (const entityId of entityIds) {
    const entity = await userDb.getEntity(entityId)
    if (entity) {
      entityDetailsMap.set(entityId, {
        id: entity.id,
        name: entity.name,
        type: entity.type
      })
    }
  }

  // Combine results
  const enrichedObservations = filteredObservations.map(observation => ({
    ...observation,
    entity: entityDetailsMap.get(observation.entityId) || null
  }))

  // Apply pagination to filtered results if additional filters were used
  let finalObservations = enrichedObservations
  let total = enrichedObservations.length

  if (search || fromDate || toDate) {
    // If additional filters were applied, handle pagination manually
    total = enrichedObservations.length
    finalObservations = enrichedObservations.slice(filters.offset, filters.offset + filters.limit)
  }

  return {
    observations: finalObservations,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total
    }
  }
})