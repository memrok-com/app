import { defineStore } from "pinia"
import { ref, computed, readonly } from "vue"
import type { EntityWithCounts, EntitiesApiResponse } from "../types/entities"
import type {
  ObservationData,
  ObservationsApiResponse,
} from "../types/observations"
import type { RelationData, RelationsApiResponse } from "../types/relations"
import {
  validateEntityName,
  validateEntityType,
  validateObservationContent,
  validatePredicate,
  validateAssistantName,
  sanitizeMetadata,
  validateStrength,
} from "../utils/validation"
import {
  getUserFriendlyErrorMessage,
  withRetry,
  isRetryableError,
} from "../utils/security"

// Enhanced loading states interface
interface LoadingStates {
  initializing: boolean
  entities: {
    fetching: boolean
    creating: boolean
    updating: Set<string>
    deleting: Set<string>
  }
  observations: {
    fetching: boolean
    creating: boolean
    updating: Set<string>
    deleting: Set<string>
  }
  relations: {
    fetching: boolean
    creating: boolean
    updating: Set<string>
    deleting: Set<string>
  }
  bulkOperations: boolean
}

// Validated input interfaces
interface CreateEntityInput {
  type: string
  name: string
  metadata?: any
  createdByAssistantName?: string
  createdByAssistantType?: string
}

interface CreateObservationInput {
  entityId: string
  content: string
  source?: string
  metadata?: any
  createdByAssistantName?: string
  createdByAssistantType?: string
}

interface CreateRelationInput {
  subjectId: string
  predicate: string
  objectId: string
  strength?: number
  metadata?: any
  createdByAssistantName?: string
  createdByAssistantType?: string
}

export const useMemoryStore = defineStore("memory", () => {
  // State
  const entities = ref<EntityWithCounts[]>([])
  const observations = ref<ObservationData[]>([])
  const relations = ref<RelationData[]>([])
  const errors = ref<string[]>([])

  // Enhanced loading states
  const loading = ref<LoadingStates>({
    initializing: false,
    entities: {
      fetching: false,
      creating: false,
      updating: new Set(),
      deleting: new Set(),
    },
    observations: {
      fetching: false,
      creating: false,
      updating: new Set(),
      deleting: new Set(),
    },
    relations: {
      fetching: false,
      creating: false,
      updating: new Set(),
      deleting: new Set(),
    },
    bulkOperations: false,
  })

  // Performance optimized computed properties with O(1) lookups
  const entitiesById = computed(() => {
    const map = new Map<string, EntityWithCounts>()
    entities.value.forEach((entity) => map.set(entity.id, entity))
    return map
  })

  const observationsByEntity = computed(() => {
    const map = new Map<string, ObservationData[]>()
    observations.value.forEach((obs) => {
      if (!map.has(obs.entityId)) map.set(obs.entityId, [])
      map.get(obs.entityId)!.push(obs)
    })
    return map
  })

  const relationsByEntity = computed(() => {
    const map = new Map<string, RelationData[]>()
    relations.value.forEach((rel) => {
      // Index by both subject and object
      ;[rel.subjectId, rel.objectId].forEach((entityId) => {
        if (!map.has(entityId)) map.set(entityId, [])
        map.get(entityId)!.push(rel)
      })
    })
    return map
  })

  const relationsByPredicate = computed(() => {
    const map = new Map<string, RelationData[]>()
    relations.value.forEach((rel) => {
      if (!map.has(rel.predicate)) map.set(rel.predicate, [])
      map.get(rel.predicate)!.push(rel)
    })
    return map
  })

  // Business rule validation computed properties
  const canCreateObservations = computed(() => entities.value.length >= 1)
  const canCreateRelations = computed(() => entities.value.length >= 2)

  // Enhanced statistics with memoization
  const statistics = computed(() => ({
    totalEntities: entities.value.length,
    totalObservations: observations.value.length,
    totalRelations: relations.value.length,
    entityTypes: [...new Set(entities.value.map((e) => e.type))],
    predicates: [...new Set(relations.value.map((r) => r.predicate))],
  }))

  // Loading state helpers
  const isEntityLoading = (id: string) =>
    computed(
      () =>
        loading.value.entities.updating.has(id) ||
        loading.value.entities.deleting.has(id)
    )

  const isObservationLoading = (id: string) =>
    computed(
      () =>
        loading.value.observations.updating.has(id) ||
        loading.value.observations.deleting.has(id)
    )

  const isRelationLoading = (id: string) =>
    computed(
      () =>
        loading.value.relations.updating.has(id) ||
        loading.value.relations.deleting.has(id)
    )

  // Error management
  const addError = (message: string) => {
    errors.value.push(message)
  }

  const clearErrors = () => {
    errors.value = []
  }

  // Enhanced initialization
  const initialize = async (force = false): Promise<void> => {
    if (loading.value.initializing) return

    loading.value.initializing = true
    clearErrors()

    try {
      await Promise.all([
        fetchEntities(),
        fetchObservations(),
        fetchRelations(),
      ])
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Initialization", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.initializing = false
    }
  }

  // Enhanced entity operations with security and optimization
  const fetchEntities = async (): Promise<void> => {
    if (loading.value.entities.fetching) return

    loading.value.entities.fetching = true

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<EntitiesApiResponse>("/api/entities", {
          query: { limit: 1000 },
        })
      })
      entities.value = response.entities
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Fetch entities", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.entities.fetching = false
    }
  }

  const createEntity = async (
    entityData: CreateEntityInput
  ): Promise<EntityWithCounts> => {
    if (loading.value.entities.creating) {
      throw new Error("Entity creation already in progress")
    }

    // Input validation and sanitization
    const validatedData = {
      type: validateEntityType(entityData.type),
      name: validateEntityName(entityData.name),
      metadata: entityData.metadata
        ? sanitizeMetadata(entityData.metadata)
        : undefined,
      createdByAssistantName: validateAssistantName(
        entityData.createdByAssistantName
      ),
      createdByAssistantType: entityData.createdByAssistantType,
    }

    loading.value.entities.creating = true

    // Create optimistic entity for immediate UI feedback
    const optimisticEntity: EntityWithCounts = {
      id: `temp-${Date.now()}`,
      userId: "current-user",
      type: validatedData.type,
      name: validatedData.name,
      metadata: validatedData.metadata || null,
      createdByUser: null,
      createdByAssistantName: validatedData.createdByAssistantName || null,
      createdByAssistantType: validatedData.createdByAssistantType || null,
      createdAt: new Date().toISOString(),
      updatedByUser: null,
      updatedByAssistantName: null,
      updatedByAssistantType: null,
      updatedAt: new Date().toISOString(),
      relationsCount: 0,
      observationsCount: 0,
      createdByAssistantInfo: validatedData.createdByAssistantName
        ? {
            name: validatedData.createdByAssistantName,
            type: validatedData.createdByAssistantType || null,
          }
        : null,
    }

    // Add optimistically
    entities.value.push(optimisticEntity)

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ entity: EntityWithCounts }>("/api/entities", {
          method: "POST",
          body: validatedData,
        })
      })

      // Replace optimistic entity with real one
      const index = entities.value.findIndex(
        (e) => e.id === optimisticEntity.id
      )
      if (index !== -1) {
        entities.value[index] = response.entity
      }

      return response.entity
    } catch (err) {
      // Rollback optimistic update
      entities.value = entities.value.filter(
        (e) => e.id !== optimisticEntity.id
      )
      const message = getUserFriendlyErrorMessage("Create entity", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.entities.creating = false
    }
  }

  const updateEntity = async (
    id: string,
    updates: {
      name?: string
      type?: string
      metadata?: any
    }
  ): Promise<EntityWithCounts> => {
    if (loading.value.entities.updating.has(id)) {
      throw new Error("Entity update already in progress")
    }

    // Input validation and sanitization
    const validatedUpdates: any = {}
    if (updates.name !== undefined) {
      validatedUpdates.name = validateEntityName(updates.name)
    }
    if (updates.type !== undefined) {
      validatedUpdates.type = validateEntityType(updates.type)
    }
    if (updates.metadata !== undefined) {
      validatedUpdates.metadata = updates.metadata
        ? sanitizeMetadata(updates.metadata)
        : null
    }

    loading.value.entities.updating.add(id)

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ entity: EntityWithCounts }>(
          `/api/entities/${id}`,
          {
            method: "PUT",
            body: validatedUpdates,
          }
        )
      })

      // Update in local store
      const index = entities.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entities.value[index] = response.entity
      }

      return response.entity
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Update entity", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.entities.updating.delete(id)
    }
  }

  const deleteEntity = async (id: string): Promise<void> => {
    if (loading.value.entities.deleting.has(id)) {
      throw new Error("Entity deletion already in progress")
    }

    loading.value.entities.deleting.add(id)

    try {
      const api = useApi()
      await withRetry(async () => {
        return await api(`/api/entities/${id}`, {
          method: "DELETE" as any,
        })
      })

      // Remove from local store
      entities.value = entities.value.filter((e) => e.id !== id)

      // Also remove related observations and relations
      observations.value = observations.value.filter((o) => o.entityId !== id)
      relations.value = relations.value.filter(
        (r) => r.subjectId !== id && r.objectId !== id
      )

    } catch (err) {
      const message = getUserFriendlyErrorMessage("Delete entity", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.entities.deleting.delete(id)
    }
  }

  // Enhanced observation operations
  const fetchObservations = async (): Promise<void> => {
    if (loading.value.observations.fetching) return

    loading.value.observations.fetching = true

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<ObservationsApiResponse>("/api/observations", {
          query: { limit: 1000 },
        })
      })
      observations.value = response.observations
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Fetch observations", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.observations.fetching = false
    }
  }

  const createObservation = async (
    observationData: CreateObservationInput
  ): Promise<ObservationData> => {
    if (loading.value.observations.creating) {
      throw new Error("Observation creation already in progress")
    }

    // Input validation and sanitization
    const validatedData = {
      entityId: observationData.entityId,
      content: validateObservationContent(observationData.content),
      source: observationData.source,
      metadata: observationData.metadata
        ? sanitizeMetadata(observationData.metadata)
        : undefined,
      createdByAssistantName: validateAssistantName(
        observationData.createdByAssistantName
      ),
      createdByAssistantType: observationData.createdByAssistantType,
    }

    loading.value.observations.creating = true

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ observation: ObservationData }>(
          "/api/observations",
          {
            method: "POST",
            body: validatedData,
          }
        )
      })

      // Add to local store
      observations.value.push(response.observation)
      
      // Update observation count for the related entity
      const entity = entities.value.find(e => e.id === response.observation.entityId)
      if (entity) {
        entity.observationsCount += 1
      }
      
      return response.observation
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Create observation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.observations.creating = false
    }
  }

  const updateObservation = async (
    id: string,
    updates: {
      content?: string
      source?: string
      metadata?: any
    }
  ): Promise<ObservationData> => {
    if (loading.value.observations.updating.has(id)) {
      throw new Error("Observation update already in progress")
    }

    // Input validation and sanitization
    const validatedUpdates: any = {}
    if (updates.content !== undefined) {
      validatedUpdates.content = validateObservationContent(updates.content)
    }
    if (updates.source !== undefined) {
      validatedUpdates.source = updates.source
    }
    if (updates.metadata !== undefined) {
      validatedUpdates.metadata = updates.metadata
        ? sanitizeMetadata(updates.metadata)
        : null
    }

    loading.value.observations.updating.add(id)

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ observation: ObservationData }>(
          `/api/observations/${id}`,
          {
            method: "PUT",
            body: validatedUpdates,
          }
        )
      })

      // Update in local store
      const index = observations.value.findIndex((o) => o.id === id)
      if (index !== -1) {
        observations.value[index] = response.observation
      }

      return response.observation
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Update observation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.observations.updating.delete(id)
    }
  }

  const deleteObservation = async (id: string): Promise<void> => {
    if (loading.value.observations.deleting.has(id)) {
      throw new Error("Observation deletion already in progress")
    }

    // Find the observation before deleting to update counts
    const observationToDelete = observations.value.find(o => o.id === id)

    loading.value.observations.deleting.add(id)

    try {
      const api = useApi()
      await withRetry(async () => {
        return await api(`/api/observations/${id}`, {
          method: "DELETE" as any,
        })
      })

      // Update observation count for the related entity before removing the observation
      if (observationToDelete) {
        const entity = entities.value.find(e => e.id === observationToDelete.entityId)
        if (entity) {
          entity.observationsCount -= 1
        }
      }

      // Remove from local store
      observations.value = observations.value.filter((o) => o.id !== id)

    } catch (err) {
      const message = getUserFriendlyErrorMessage("Delete observation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.observations.deleting.delete(id)
    }
  }

  // Enhanced relation operations
  const fetchRelations = async (): Promise<void> => {
    if (loading.value.relations.fetching) return

    loading.value.relations.fetching = true

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<RelationsApiResponse>("/api/relations", {
          query: { limit: 1000 },
        })
      })
      relations.value = response.relations
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Fetch relations", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.relations.fetching = false
    }
  }

  const createRelation = async (
    relationData: CreateRelationInput
  ): Promise<RelationData> => {
    if (loading.value.relations.creating) {
      throw new Error("Relation creation already in progress")
    }

    // Input validation and sanitization
    const validatedData = {
      subjectId: relationData.subjectId,
      predicate: validatePredicate(relationData.predicate),
      objectId: relationData.objectId,
      strength: validateStrength(relationData.strength),
      metadata: relationData.metadata
        ? sanitizeMetadata(relationData.metadata)
        : undefined,
      createdByAssistantName: validateAssistantName(
        relationData.createdByAssistantName
      ),
      createdByAssistantType: relationData.createdByAssistantType,
    }

    loading.value.relations.creating = true

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ relation: RelationData }>("/api/relations", {
          method: "POST",
          body: validatedData,
        })
      })

      // Add to local store
      relations.value.push(response.relation)
      
      // Update relation counts for affected entities
      const subjectEntity = entities.value.find(e => e.id === response.relation.subjectId)
      const objectEntity = entities.value.find(e => e.id === response.relation.objectId)
      
      if (subjectEntity) {
        subjectEntity.relationsCount += 1
      }
      if (objectEntity && objectEntity.id !== subjectEntity?.id) {
        objectEntity.relationsCount += 1
      }
      
      return response.relation
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Create relation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.relations.creating = false
    }
  }

  const updateRelation = async (
    id: string,
    updates: {
      predicate?: string
      strength?: number
      metadata?: any
    }
  ): Promise<RelationData> => {
    if (loading.value.relations.updating.has(id)) {
      throw new Error("Relation update already in progress")
    }

    // Input validation and sanitization
    const validatedUpdates: any = {}
    if (updates.predicate !== undefined) {
      validatedUpdates.predicate = validatePredicate(updates.predicate)
    }
    if (updates.strength !== undefined) {
      validatedUpdates.strength = validateStrength(updates.strength)
    }
    if (updates.metadata !== undefined) {
      validatedUpdates.metadata = updates.metadata
        ? sanitizeMetadata(updates.metadata)
        : null
    }

    loading.value.relations.updating.add(id)

    try {
      const api = useApi()
      const response = await withRetry(async () => {
        return await api<{ relation: RelationData }>(
          `/api/relations/${id}`,
          {
            method: "PUT",
            body: validatedUpdates,
          }
        )
      })

      // Update in local store
      const index = relations.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        relations.value[index] = response.relation
      }

      return response.relation
    } catch (err) {
      const message = getUserFriendlyErrorMessage("Update relation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.relations.updating.delete(id)
    }
  }

  const deleteRelation = async (id: string): Promise<void> => {
    if (loading.value.relations.deleting.has(id)) {
      throw new Error("Relation deletion already in progress")
    }

    // Find the relation before deleting to update counts
    const relationToDelete = relations.value.find(r => r.id === id)
    
    loading.value.relations.deleting.add(id)

    try {
      const api = useApi()
      await withRetry(async () => {
        return await api(`/api/relations/${id}`, {
          method: "DELETE" as any,
        })
      })

      // Update relation counts for affected entities before removing the relation
      if (relationToDelete) {
        const subjectEntity = entities.value.find(e => e.id === relationToDelete.subjectId)
        const objectEntity = entities.value.find(e => e.id === relationToDelete.objectId)
        
        if (subjectEntity) {
          subjectEntity.relationsCount -= 1
        }
        if (objectEntity && objectEntity.id !== subjectEntity?.id) {
          objectEntity.relationsCount -= 1
        }
      }

      // Remove from local store
      relations.value = relations.value.filter((r) => r.id !== id)

    } catch (err) {
      const message = getUserFriendlyErrorMessage("Delete relation", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.relations.deleting.delete(id)
    }
  }

  // Enhanced bulk operations
  const eraseAllMemories = async (): Promise<void> => {
    if (loading.value.bulkOperations) {
      throw new Error("Bulk operation already in progress")
    }

    loading.value.bulkOperations = true

    try {
      const api = useApi()
      await withRetry(async () => {
        return await api("/api/memories", {
          method: "DELETE" as any,
        })
      })

      // Clear local store
      entities.value = []
      observations.value = []
      relations.value = []

    } catch (err) {
      const message = getUserFriendlyErrorMessage("Erase all memories", err)
      addError(message)
      throw new Error(message)
    } finally {
      loading.value.bulkOperations = false
    }
  }

  // Optimized utility methods using computed maps
  const getEntityById = (id: string): EntityWithCounts | undefined => {
    return entitiesById.value.get(id)
  }

  const getObservationsForEntity = (entityId: string): ObservationData[] => {
    return observationsByEntity.value.get(entityId) || []
  }

  const getRelationsForEntity = (entityId: string): RelationData[] => {
    return relationsByEntity.value.get(entityId) || []
  }

  const getRelationsByPredicate = (predicate: string): RelationData[] => {
    return relationsByPredicate.value.get(predicate) || []
  }

  return {
    // State - use computed to provide reactive but immutable access
    entities: computed(() => entities.value),
    observations: computed(() => observations.value),
    relations: computed(() => relations.value),
    errors: computed(() => errors.value),
    loading: computed(() => loading.value),

    // Computed
    canCreateObservations,
    canCreateRelations,
    statistics,

    // Loading state helpers
    isEntityLoading,
    isObservationLoading,
    isRelationLoading,

    // Error management
    addError,
    clearErrors,

    // Actions
    initialize,

    // Entity operations
    fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity,

    // Observation operations
    fetchObservations,
    createObservation,
    updateObservation,
    deleteObservation,

    // Relation operations
    fetchRelations,
    createRelation,
    updateRelation,
    deleteRelation,

    // Bulk operations
    eraseAllMemories,

    // Utility methods (optimized with O(1) lookups)
    getEntityById,
    getObservationsForEntity,
    getRelationsForEntity,
    getRelationsByPredicate,
  }
})
