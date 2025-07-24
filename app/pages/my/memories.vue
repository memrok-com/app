<template>
  <UContainer>
    <UPage>
      <UPageBody>
        <UPageHeader
          :title="t('navigation.memories')"
          :description="t('memories.description')"
        >
          <template #links>
            <UButton
              color="error"
              icon="i-ph-eraser-fill"
              :label="t('memories.navigation.erase')"
              size="sm"
              variant="ghost"
            />
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
            <MemoriesEntitiesCreate @created="refreshEntities" />
            <template #footer>
              <span class="font-extralight text-9xl text-muted">
                {{ entities.toLocaleString() }}
              </span>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-vector-three-fill"
            :title="t('memories.navigation.relations.title')"
            :description="t('memories.navigation.relations.description')"
            spotlight
            variant="subtle"
          >
            <MemoriesRelationsCreate @created="refreshRelations" />
            <template #footer>
              <span class="font-extralight text-9xl text-muted">
                {{ relations.toLocaleString() }}
              </span>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-eyes-fill"
            :title="t('memories.navigation.observations.title')"
            :description="t('memories.navigation.observations.description')"
            spotlight
            variant="subtle"
          >
            <MemoriesObservationsCreate @created="refreshObservations" />
            <template #footer>
              <span class="font-extralight text-9xl text-muted">
                {{ observations.toLocaleString() }}
              </span>
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

// Fetch counts from API
const { data: entitiesData, refresh: refreshEntities } = await useFetch(
  "/api/entities"
)
const { data: relationsData, refresh: refreshRelations } = await useFetch(
  "/api/relations"
)
const { data: observationsData, refresh: refreshObservations } = await useFetch(
  "/api/observations"
)

// Compute counts
const entities = computed(() => entitiesData.value?.entities?.length || 0)
const relations = computed(() => relationsData.value?.relations?.length || 0)
const observations = computed(
  () => observationsData.value?.observations?.length || 0
)
</script>
