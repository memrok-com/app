import type {
  ObservationsApiResponse,
  ObservationData,
  CreateObservationResponse,
} from "~/types/observations"

export const useObservationsStore = defineStore("observations", () => {
  // State
  const observations = ref<ObservationData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filters state
  const filters = reactive({
    search: "",
    entityId: "",
    fromDate: "",
    toDate: "",
    createdByAssistantName: "",
    limit: 50,
    offset: 0,
  })

  // Pagination state
  const pagination = reactive({
    total: 0,
    limit: 50,
    offset: 0,
  })

  // Getters
  const observationCount = computed(() => observations.value.length)
  const totalObservationCount = computed(() => pagination.total)

  const observationById = computed(
    () => (id: string) =>
      observations.value.find((o: ObservationData) => o.id === id)
  )

  const observationsByEntity = computed(
    () => (entityId: string) =>
      observations.value.filter((o: ObservationData) => o.entityId === entityId)
  )

  // Business rule: Can only create observations if there's at least 1 entity
  const canCreateObservations = computed(() => {
    const entitiesStore = useEntitiesStore()
    return entitiesStore.entityCount >= 1
  })

  // Actions
  async function fetchObservations() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<ObservationsApiResponse>("/api/observations", {
        query: {
          limit: filters.limit,
          offset: filters.offset,
          entityId: filters.entityId || undefined,
          search: filters.search || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          createdByAssistantName: filters.createdByAssistantName || undefined,
        },
      })

      observations.value = data.observations
      pagination.total = data.pagination.total
      pagination.limit = data.pagination.limit
      pagination.offset = data.pagination.offset
    } catch (err: any) {
      error.value = err.data?.statusMessage || "Failed to fetch observations"
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createObservation(observationData: {
    entityId: string
    content: string
    source?: string
    metadata?: any
  }) {
    const response = await $fetch<CreateObservationResponse>(
      "/api/observations",
      {
        method: "POST",
        body: observationData,
      }
    )

    // Refresh observations list
    await fetchObservations()

    // Also update entity counts in the entities store if it's initialized
    const entitiesStore = useEntitiesStore()
    if (entitiesStore.entities.length > 0) {
      await entitiesStore.fetchEntities()
    }

    return response
  }

  async function updateObservation(
    id: string,
    updates: Partial<{
      content: string
      source: string
      metadata: any
    }>
  ) {
    const response = (await $fetch(`/api/observations/${id}`, {
      method: "PATCH" as any,
      body: updates,
    })) as any

    // Update observation in local state
    const index = observations.value.findIndex(
      (o: ObservationData) => o.id === id
    )
    if (index > -1 && response.observation) {
      observations.value[index] = {
        ...observations.value[index],
        ...response.observation,
      }
    }

    return response
  }

  async function deleteObservation(id: string) {
    await $fetch(`/api/observations/${id}`, {
      method: "DELETE" as any,
    })

    // Remove from local state
    observations.value = observations.value.filter(
      (o: ObservationData) => o.id !== id
    )
    pagination.total = Math.max(0, pagination.total - 1)

    // Also update entity counts in the entities store if it's initialized
    const entitiesStore = useEntitiesStore()
    if (entitiesStore.entities.length > 0) {
      await entitiesStore.fetchEntities()
    }
  }

  // Reset filters
  function resetFilters() {
    filters.search = ""
    filters.entityId = ""
    filters.fromDate = ""
    filters.toDate = ""
    filters.createdByAssistantName = ""
    filters.limit = 50
    filters.offset = 0
  }

  // Set page
  function setPage(page: number) {
    filters.offset = (page - 1) * filters.limit
  }

  // Set entity filter
  function setEntityFilter(entityId: string) {
    filters.entityId = entityId
    filters.offset = 0 // Reset to first page
  }

  return {
    // State
    observations: readonly(observations),
    loading: readonly(loading),
    error: readonly(error),
    filters,
    pagination: readonly(pagination),

    // Getters
    observationCount,
    totalObservationCount,
    observationById,
    observationsByEntity,
    canCreateObservations,

    // Actions
    fetchObservations,
    createObservation,
    updateObservation,
    deleteObservation,
    resetFilters,
    setPage,
    setEntityFilter,
  }
})
