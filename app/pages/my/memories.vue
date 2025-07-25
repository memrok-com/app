<template>
  <UContainer>
    <UPage>
      <UPageBody>
        <UPageHeader
          :title="t('navigation.memories')"
          :description="t('memories.description')"
        >
          <template #links>
            <MemoriesErase @erased="onMemoriesErased" />
          </template>
        </UPageHeader>
        <UPageGrid>
          <UPageCard
            icon="i-ph-squares-four-fill"
            :title="t('memories.navigation.entities.title')"
            :description="t('memories.navigation.entities.description')"
            spotlight
            variant="subtle"
          >
            <MemoriesEntitiesCreate @created="onEntityCreated" />
            <template #footer>
              <code class="font-light text-7xl text-muted">
                {{ entities.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-vector-three-fill"
            :title="t('memories.navigation.relations.title')"
            :description="t('memories.navigation.relations.description')"
            spotlight
            variant="subtle"
          >
            <MemoriesRelationsCreate ref="relationsCreateRef" @created="refreshRelations" />
            <template #footer>
              <code class="font-light text-7xl text-muted">
                {{ relations.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-eyes-fill"
            :title="t('memories.navigation.observations.title')"
            :description="t('memories.navigation.observations.description')"
            spotlight
            variant="subtle"
          >
            <MemoriesObservationsCreate ref="observationsCreateRef" @created="refreshObservations" />
            <template #footer>
              <code class="font-light text-7xl text-muted">
                {{ observations.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
        </UPageGrid>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: t("navigation.memories"),
})

const { user } = useOidcAuth()

// Template refs
const relationsCreateRef = ref()
const observationsCreateRef = ref()

// Fetch counts from API - RLS automatically filters by current user
const { data: entitiesData, refresh: refreshEntities } = await useFetch("/api/entities")
const { data: relationsData, refresh: refreshRelations } = await useFetch("/api/relations")
const { data: observationsData, refresh: refreshObservations } = await useFetch("/api/observations")

// Compute counts
const entities = computed(() => entitiesData.value?.entities?.length || 0)
const relations = computed(() => relationsData.value?.relations?.length || 0)
const observations = computed(
  () => observationsData.value?.observations?.length || 0
)

// Handle entity creation - refresh entity lists in other components
const onEntityCreated = () => {
  // Refresh entities count
  refreshEntities()
  
  // Refresh entity lists in relations and observations components
  if (relationsCreateRef.value?.refreshEntities) {
    relationsCreateRef.value.refreshEntities()
  }
  if (observationsCreateRef.value?.refreshEntities) {
    observationsCreateRef.value.refreshEntities()
  }
}

// Handle memories erased event
const onMemoriesErased = () => {
  // Refresh all counts after successful erase
  refreshEntities()
  refreshRelations()
  refreshObservations()
}
</script>
