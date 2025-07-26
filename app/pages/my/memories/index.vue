<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :title="t('title')"
        :description="t('description')"
      >
      </UPageHeader>
      <UPageBody>
        <UPageGrid>
          <UPageCard
            icon="i-ph-squares-four-fill"
            :title="t('entities.title')"
            :description="t('entities.description')"
            spotlight
          >
            <MemoriesEntitiesCreate @created="onEntityCreated" />
            <template #footer>
              <code class="font-light text-7xl">
                {{ entities.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-eyes-fill"
            :title="t('observations.title')"
            :description="t('observations.description')"
            spotlight
          >
            <MemoriesObservationsCreate
              ref="observationsCreateRef"
              :disabled="entities < 1"
              @created="refreshObservations"
            />
            <template #footer>
              <code class="font-light text-7xl">
                {{ observations.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-ph-vector-three-fill"
            :title="t('relations.title')"
            :description="t('relations.description')"
            spotlight
          >
            <MemoriesRelationsCreate
              ref="relationsCreateRef"
              :disabled="entities < 2"
              @created="refreshRelations"
            />
            <template #footer>
              <code class="font-light text-7xl">
                {{ relations.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
        </UPageGrid>
        <UTable>
          <template #empty>
            <UPageFeature
              icon="i-ph-empty"
              :description="t('table.empty')"
              orientation="vertical"
            />
          </template>
        </UTable>
        <UPageCard :ui="{ container: 'p-0 sm:p-0' }">
          <UPageAccordion
            :items="[
              {
                label: t('danger.title'),
                icon: 'i-ph-lightning-fill',
              },
            ]"
            :ui="{
              body: 'px-4',
              trigger: 'px-4',
            }"
          >
            <template #body>
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div class="text-sm">
                  {{ t("danger.erase") }}
                </div>
                <div>
                  <MemoriesErase
                    size="md"
                    @erased="onMemoriesErased"
                  />
                </div>
              </div>
            </template>
          </UPageAccordion>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: "local" })

useHead({
  title: t("title"),
})

const { user } = useOidcAuth()

// Template refs
const relationsCreateRef = ref()
const observationsCreateRef = ref()

// Fetch counts from API - RLS automatically filters by current user
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

<i18n lang="yaml">
en:
  title: Memories
  description: What assistants know about you and your life.
  entities:
    title: Entities
    description: Things that matter to you.
  relations:
    title: Relations
    description: Connections between entities.
  observations:
    title: Observations
    description: Descriptions of entities.
  table:
    empty: No memories recorded yet.
  danger:
    title: Danger Zone
    erase: Permanently erase all memories.
</i18n>
