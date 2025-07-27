/**
 * Memory Store - Coordinates cross-store operations and bulk actions
 */
export const useMemoryStore = defineStore('memory', () => {
  // State
  const isErasing = ref(false)
  const error = ref<string | null>(null)

  // Get references to other stores
  const entitiesStore = useEntitiesStore()
  const observationsStore = useObservationsStore()
  const relationsStore = useRelationsStore()

  // Actions
  async function eraseAllMemories() {
    isErasing.value = true
    error.value = null

    try {
      // Call the bulk delete API
      await $fetch('/api/memories', {
        method: 'DELETE' as any
      })

      // Immediately clear all store states for instant UI feedback
      // Note: We need to clear the underlying reactive arrays, not the readonly refs
      const entitiesArray = entitiesStore.entities as any
      const observationsArray = observationsStore.observations as any
      const relationsArray = relationsStore.relations as any
      const typesArray = entitiesStore.types as any
      const predicatesArray = relationsStore.predicates as any
      
      entitiesArray.splice(0)
      entitiesStore.pagination.total = 0
      entitiesStore.pagination.offset = 0
      
      observationsArray.splice(0)
      observationsStore.pagination.total = 0
      observationsStore.pagination.offset = 0
      
      relationsArray.splice(0)
      relationsStore.pagination.total = 0
      relationsStore.pagination.offset = 0

      // Clear types and predicates caches
      typesArray.splice(0)
      predicatesArray.splice(0)

    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to erase memories'
      throw err
    } finally {
      isErasing.value = false
    }
  }

  // Get overall statistics
  const totalMemories = computed(() => 
    entitiesStore.entityCount + 
    observationsStore.observationCount + 
    relationsStore.relationCount
  )

  const hasMemories = computed(() => totalMemories.value > 0)

  // Loading state that covers any store operation
  const isLoading = computed(() => 
    entitiesStore.loading || 
    observationsStore.loading || 
    relationsStore.loading ||
    isErasing.value
  )

  return {
    // State
    isErasing: readonly(isErasing),
    error: readonly(error),
    
    // Getters
    totalMemories,
    hasMemories,
    isLoading,
    
    // Actions
    eraseAllMemories
  }
})