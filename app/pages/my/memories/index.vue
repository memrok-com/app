<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :title="t('title')"
        :description="t('description')"
      />

      <UPageBody v-auto-animate>
        <UPageGrid>
          <UPageCard
            icon="i-ph-squares-four-fill"
            :title="t('entities.title')"
            :description="t('entities.description')"
            spotlight
          >
            <MemoriesEntitiesModal size="lg" />

            <template #footer>
              <code class="font-light text-7xl">
                {{ n(memoryStore.statistics.totalEntities) }}
              </code>
            </template>
          </UPageCard>

          <UPageCard
            icon="i-ph-eyes-fill"
            :title="t('observations.title')"
            :description="t('observations.description')"
            spotlight
          >
            <MemoriesObservationsModal size="lg" />

            <template #footer>
              <code class="font-light text-7xl">
                {{ n(memoryStore.statistics.totalObservations) }}
              </code>
            </template>
          </UPageCard>

          <UPageCard
            icon="i-ph-vector-three-fill"
            :title="t('relations.title')"
            :description="t('relations.description')"
            spotlight
          >
            <MemoriesRelationsModal size="lg" />

            <template #footer>
              <code class="font-light text-7xl">
                {{ n(memoryStore.statistics.totalRelations) }}
              </code>
            </template>
          </UPageCard>
        </UPageGrid>

        <Memories />

        <UPageCard
          :ui="{ container: 'p-0 sm:p-0' }"
          v-if="memoryStore.statistics.totalEntities"
        >
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

                <MemoriesErase />
              </div>
            </template>
          </UPageAccordion>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t, n } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

try {
  await memoryStore.initialize()
} catch (error) {
  console.error("Failed to initialize memory store:", error)
}

useHead({
  title: t("title"),
})
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
