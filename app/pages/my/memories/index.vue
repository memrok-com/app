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
            <MemoriesObservationsCreate />
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
            <MemoriesRelationsCreate />
            <template #footer>
              <code class="font-light text-7xl">
                {{ relations.toLocaleString() }}
              </code>
            </template>
          </UPageCard>
        </UPageGrid>
        <Memories
          :entities="entitiesStore.entities"
          :key="entities"
        />
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


// Initialize stores
const entitiesStore = useEntitiesStore()
const relationsStore = useRelationsStore()
const observationsStore = useObservationsStore()

// Compute counts from stores
const entities = computed(() => entitiesStore.entityCount)
const relations = computed(() => relationsStore.relationCount)
const observations = computed(() => observationsStore.observationCount)

// Load initial data on client side after authentication is available
onMounted(async () => {
  try {
    await Promise.all([
      entitiesStore.initialize(),
      relationsStore.fetchRelations(),
      observationsStore.fetchObservations()
    ])
  } catch (error) {
    console.error('Failed to initialize stores:', error)
  }
})

// Event handlers - stores handle all data management automatically
const onEntityCreated = () => {
  // Stores automatically refresh after creation
}

const onMemoriesErased = () => {
  // Memory store already cleared all state
}
</script>

<i18n lang="yaml">
en:
  title: Memories
  description: What assistants know about you and your life.
  entities:
    title: Entities
    description: What things have meaning for you.
  observations:
    title: Observations
    description: What is noteworthy about those things.
  relations:
    title: Relations
    description: What interconnects those things.
  table:
    empty: No memories recorded yet.
  danger:
    title: Danger Zone
    erase: Permanently erase all memories.
</i18n>
