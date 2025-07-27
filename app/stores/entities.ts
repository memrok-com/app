import type { EntitiesApiResponse, EntityWithCounts } from "~/types/entities"

export const useEntitiesStore = defineStore("entities", () => {
  // State
  const entities = ref<EntityWithCounts[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filters state
  const filters = reactive({
    search: "",
    type: "",
    createdByAssistant: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
    limit: 50,
    offset: 0,
  })

  // Pagination state
  const pagination = reactive({
    total: 0,
    limit: 50,
    offset: 0,
  })

  // Types for the entity type dropdown
  const types = ref<string[]>([])
  const typesLoading = ref(false)

  // Getters
  const entityCount = computed(() => entities.value.length)
  const totalEntityCount = computed(() => pagination.total)

  const entityById = computed(
    () => (id: string) => entities.value.find((e) => e.id === id)
  )

  const entitiesByType = computed(
    () => (type: string) => entities.value.filter((e) => e.type === type)
  )

  // Actions
  async function fetchEntities() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<EntitiesApiResponse>("/api/entities", {
        query: {
          limit: filters.limit,
          offset: filters.offset,
          type: filters.type || undefined,
          search: filters.search || undefined,
          createdByAssistant: filters.createdByAssistant || undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
      })

      entities.value = data.entities
      pagination.total = data.pagination.total
      pagination.limit = data.pagination.limit
      pagination.offset = data.pagination.offset
    } catch (err: any) {
      error.value = err.data?.statusMessage || "Failed to fetch entities"
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchEntityTypes() {
    typesLoading.value = true

    try {
      const data = await $fetch("/api/entities/types")

      // Default types
      const defaultTypes = ["person", "group", "place", "event"]

      // Get existing types from API
      const existingTypes = data?.types || []

      // Merge existing and default types
      const typeSet = new Set(defaultTypes)
      existingTypes.forEach((t: any) => {
        typeSet.add(t.type)
      })

      types.value = Array.from(typeSet).sort()
    } catch (err) {
      console.error("Failed to fetch entity types:", err)
      // Fall back to default types on error
      types.value = ["person", "group", "place", "event"]
    } finally {
      typesLoading.value = false
    }
  }

  async function createEntity(entityData: {
    name: string
    type: string
    metadata?: any
  }) {
    const response = await $fetch("/api/entities", {
      method: "POST",
      body: entityData,
    })

    // Refresh entities list and types
    await Promise.all([fetchEntities(), fetchEntityTypes()])

    return response
  }

  async function updateEntity(
    id: string,
    updates: Partial<{
      name: string
      type: string
      metadata: any
    }>
  ) {
    const response = (await $fetch(`/api/entities/${id}`, {
      method: "PATCH" as any,
      body: updates,
    })) as any

    // Update entity in local state
    const index = entities.value.findIndex((e) => e.id === id)
    if (index > -1 && response.entity) {
      // Merge the updated fields with existing entity data
      entities.value[index] = {
        ...entities.value[index],
        ...response.entity,
      }
    }

    return response
  }

  async function deleteEntity(id: string) {
    await $fetch(`/api/entities/${id}`, {
      method: "DELETE" as any,
    })

    // Remove from local state
    entities.value = entities.value.filter((e) => e.id !== id)
    pagination.total = Math.max(0, pagination.total - 1)
  }

  // Reset filters
  function resetFilters() {
    filters.search = ""
    filters.type = ""
    filters.createdByAssistant = ""
    filters.sortBy = "createdAt"
    filters.sortOrder = "desc"
    filters.limit = 50
    filters.offset = 0
  }

  // Set page
  function setPage(page: number) {
    filters.offset = (page - 1) * filters.limit
  }

  // Initialize store
  async function initialize() {
    await Promise.all([fetchEntities(), fetchEntityTypes()])
  }

  return {
    // State
    entities: readonly(entities),
    loading: readonly(loading),
    error: readonly(error),
    filters,
    pagination: readonly(pagination),
    types: readonly(types),
    typesLoading: readonly(typesLoading),

    // Getters
    entityCount,
    totalEntityCount,
    entityById,
    entitiesByType,

    // Actions
    fetchEntities,
    fetchEntityTypes,
    createEntity,
    updateEntity,
    deleteEntity,
    resetFilters,
    setPage,
    initialize,
  }
})
