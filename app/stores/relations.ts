import type {
  RelationsApiResponse,
  RelationData,
  CreateRelationResponse,
  PredicatesApiResponse,
} from "~/types/relations"

export const useRelationsStore = defineStore("relations", () => {
  // State
  const relations = ref<RelationData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filters state
  const filters = reactive({
    search: "",
    subjectId: "",
    objectId: "",
    predicate: "",
    minStrength: undefined as number | undefined,
    maxStrength: undefined as number | undefined,
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

  // Predicates for dropdown
  const predicates = ref<string[]>([])
  const predicatesLoading = ref(false)

  // Getters
  const relationCount = computed(() => relations.value.length)
  const totalRelationCount = computed(() => pagination.total)

  const relationById = computed(
    () => (id: string) => relations.value.find((r) => r.id === id)
  )

  const relationsByEntity = computed(
    () => (entityId: string) =>
      relations.value.filter(
        (r) => r.subjectId === entityId || r.objectId === entityId
      )
  )

  const relationsBySubject = computed(
    () => (subjectId: string) =>
      relations.value.filter((r) => r.subjectId === subjectId)
  )

  const relationsByObject = computed(
    () => (objectId: string) =>
      relations.value.filter((r) => r.objectId === objectId)
  )

  // Business rule: Can only create relations if there are at least 2 entities
  const canCreateRelations = computed(() => {
    const entitiesStore = useEntitiesStore()
    return entitiesStore.entityCount >= 2
  })

  // Actions
  async function fetchRelations() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<RelationsApiResponse>("/api/relations", {
        query: {
          limit: filters.limit,
          offset: filters.offset,
          subjectId: filters.subjectId || undefined,
          objectId: filters.objectId || undefined,
          predicate: filters.predicate || undefined,
          search: filters.search || undefined,
          minStrength: filters.minStrength,
          maxStrength: filters.maxStrength,
          createdByAssistantName: filters.createdByAssistantName || undefined,
        },
      })

      relations.value = data.relations
      pagination.total = data.pagination.total
      pagination.limit = data.pagination.limit
      pagination.offset = data.pagination.offset
    } catch (err: any) {
      error.value = err.data?.statusMessage || "Failed to fetch relations"
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchPredicates() {
    predicatesLoading.value = true

    try {
      const data = await $fetch<PredicatesApiResponse>(
        "/api/relations/predicates"
      )

      // Default predicates
      const defaultPredicates = [
        "knows",
        "works_on",
        "uses",
        "owns",
        "manages",
        "created",
        "belongs_to",
        "part_of",
        "located_at",
        "related_to",
      ]

      // Get existing predicates from API
      const existingPredicates = data?.predicates || []

      // Merge existing and default predicates
      const predicateSet = new Set(defaultPredicates)
      existingPredicates.forEach((p: any) => {
        predicateSet.add(p.predicate)
      })

      predicates.value = Array.from(predicateSet).sort()
    } catch (err) {
      console.error("Failed to fetch predicates:", err)
      // Fall back to default predicates on error
      predicates.value = [
        "knows",
        "works_on",
        "uses",
        "owns",
        "manages",
        "created",
        "belongs_to",
        "part_of",
        "located_at",
        "related_to",
      ]
    } finally {
      predicatesLoading.value = false
    }
  }

  async function createRelation(relationData: {
    subjectId: string
    predicate: string
    objectId: string
    strength?: number
    metadata?: any
  }) {
    const response = await $fetch<CreateRelationResponse>("/api/relations", {
      method: "POST",
      body: relationData,
    })

    // Refresh relations list and predicates
    await Promise.all([fetchRelations(), fetchPredicates()])

    // Also update entity counts in the entities store if it's initialized
    const entitiesStore = useEntitiesStore()
    if (entitiesStore.entities.length > 0) {
      await entitiesStore.fetchEntities()
    }

    return response
  }

  async function updateRelation(
    id: string,
    updates: Partial<{
      predicate: string
      strength: number
      metadata: any
    }>
  ) {
    const response = (await $fetch(`/api/relations/${id}`, {
      method: "PATCH" as any,
      body: updates,
    })) as any

    // Update relation in local state
    const index = relations.value.findIndex((r) => r.id === id)
    if (index > -1 && response.relation) {
      relations.value[index] = {
        ...relations.value[index],
        ...response.relation,
      }
    }

    return response
  }

  async function deleteRelation(id: string) {
    await $fetch(`/api/relations/${id}`, {
      method: "DELETE" as any,
    })

    // Remove from local state
    relations.value = relations.value.filter((r) => r.id !== id)
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
    filters.subjectId = ""
    filters.objectId = ""
    filters.predicate = ""
    filters.minStrength = undefined
    filters.maxStrength = undefined
    filters.createdByAssistantName = ""
    filters.limit = 50
    filters.offset = 0
  }

  // Set page
  function setPage(page: number) {
    filters.offset = (page - 1) * filters.limit
  }

  // Set entity filters
  function setSubjectFilter(subjectId: string) {
    filters.subjectId = subjectId
    filters.objectId = ""
    filters.offset = 0 // Reset to first page
  }

  function setObjectFilter(objectId: string) {
    filters.objectId = objectId
    filters.subjectId = ""
    filters.offset = 0 // Reset to first page
  }

  // Initialize store
  async function initialize() {
    await Promise.all([fetchRelations(), fetchPredicates()])
  }

  return {
    // State
    relations: readonly(relations),
    loading: readonly(loading),
    error: readonly(error),
    filters,
    pagination: readonly(pagination),
    predicates: readonly(predicates),
    predicatesLoading: readonly(predicatesLoading),

    // Getters
    relationCount,
    totalRelationCount,
    relationById,
    relationsByEntity,
    relationsBySubject,
    relationsByObject,
    canCreateRelations,

    // Actions
    fetchRelations,
    fetchPredicates,
    createRelation,
    updateRelation,
    deleteRelation,
    resetFilters,
    setPage,
    setSubjectFilter,
    setObjectFilter,
    initialize,
  }
})
