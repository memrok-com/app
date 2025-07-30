<template>
  <UPage>
    <UPageHero
      class="bg-gradient-to-tr from-sky-100 via-indigo-100 to-purple-100 dark:from-sky-900 dark:via-indigo-900 dark:to-purple-900"
      :ui="{
        title: 'text-balance',
        description: 'text-balance',
      }"
    >
      <template #title>
        {{ t("title") }}
      </template>
      <template #description>
        {{ t("description") }}
      </template>
      <template #links>
        <UButton to="/memories" icon="i-ph-squares-four-fill" size="lg">
          {{ t("hero.viewMemories") }}
        </UButton>
        <UButton to="/assistants" variant="outline" icon="i-ph-robot" size="lg">
          {{ t("hero.setupAssistants") }}
        </UButton>
      </template>
    </UPageHero>

    <!-- Main content body -->
    <UPageBody>
      <!-- Loading skeleton while initializing -->
      <div v-if="loading.initializing" class="max-w-4xl mx-auto px-4 py-12">
        <USkeleton class="h-8 w-48 mb-4" />
        <USkeleton class="h-24 w-full mb-2" />
        <USkeleton class="h-24 w-full mb-2" />
        <USkeleton class="h-24 w-full" />
      </div>

      <!-- Content sections based on user state -->
      <div v-else class="max-w-4xl mx-auto px-4 py-12">
        <!-- Recent Activity Timeline (when user has >2 memories) -->
        <section v-if="hasRecentActivity">
          <UPageCard>
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-semibold">{{ t("recentActivity.title") }}</h2>
              <UButton
                to="/memories"
                variant="ghost"
                icon="i-ph-arrow-right"
                trailing
              >
                {{ t("recentActivity.viewAll") }}
              </UButton>
            </div>

            <UTimeline
              v-if="recentEntities.length > 0"
              :items="timelineItems"
              :ui="{ item: { base: 'pb-6' } }"
            />
            <p v-else class="text-gray-500 dark:text-gray-400 text-center py-8">
              {{ t("recentActivity.empty") }}
            </p>
          </UPageCard>
        </section>

        <!-- Getting Started Guide (when user has ≤2 memories) -->
        <section v-else-if="isNewUser">
          <UPageCard>
            <h2 class="text-2xl font-semibold mb-6">{{ t("gettingStarted.title") }}</h2>
            
            <div class="space-y-6">
              <!-- Step 1: Create Your First Entity -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span class="text-indigo-600 dark:text-indigo-400 font-semibold">1</span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-lg mb-1">{{ t("gettingStarted.steps.1.title") }}</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-3">{{ t("gettingStarted.steps.1.description") }}</p>
                  <UButton
                    to="/memories"
                    variant="soft"
                    icon="i-ph-plus-circle"
                    size="sm"
                  >
                    {{ t("gettingStarted.steps.1.action") }}
                  </UButton>
                </div>
              </div>

              <!-- Step 2: Add Observations -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span class="text-indigo-600 dark:text-indigo-400 font-semibold">2</span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-lg mb-1">{{ t("gettingStarted.steps.2.title") }}</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-3">{{ t("gettingStarted.steps.2.description") }}</p>
                  <UButton
                    :to="canCreateObservations ? '/memories' : undefined"
                    :disabled="!canCreateObservations"
                    variant="soft"
                    icon="i-ph-note"
                    size="sm"
                  >
                    {{ t("gettingStarted.steps.2.action") }}
                  </UButton>
                </div>
              </div>

              <!-- Step 3: Create Relations -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span class="text-indigo-600 dark:text-indigo-400 font-semibold">3</span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-lg mb-1">{{ t("gettingStarted.steps.3.title") }}</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-3">{{ t("gettingStarted.steps.3.description") }}</p>
                  <UButton
                    :to="canCreateRelations ? '/memories' : undefined"
                    :disabled="!canCreateRelations"
                    variant="soft"
                    icon="i-ph-flow-arrow"
                    size="sm"
                  >
                    {{ t("gettingStarted.steps.3.action") }}
                  </UButton>
                </div>
              </div>

              <!-- Step 4: Connect AI Assistants -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span class="text-indigo-600 dark:text-indigo-400 font-semibold">4</span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-lg mb-1">{{ t("gettingStarted.steps.4.title") }}</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-3">{{ t("gettingStarted.steps.4.description") }}</p>
                  <UButton
                    to="/assistants"
                    variant="soft"
                    icon="i-ph-robot"
                    size="sm"
                  >
                    {{ t("gettingStarted.steps.4.action") }}
                  </UButton>
                </div>
              </div>
            </div>
          </UPageCard>
        </section>
      </div>
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { formatDistanceToNow } from "@formkit/tempo"

const { t } = useI18n({ useScope: "local" })

useHead({
  title: t("title"),
})

// Memory store setup with proper reactivity
const memoryStore = useMemoryStore()
const { entities, statistics, loading, errors, canCreateObservations, canCreateRelations } = storeToRefs(memoryStore)

// Initialize store
onMounted(async () => {
  try {
    await memoryStore.initialize()
  } catch (error) {
    console.error("Failed to initialize memory store:", error)
    // Error handling is done within the store via errors.value
  }
})

// Computed properties for conditional rendering
const isNewUser = computed(() => statistics.value.totalEntities <= 2)
const hasRecentActivity = computed(() => statistics.value.totalEntities > 2)

// Get recent entities sorted by creation date
const recentEntities = computed(() =>
  entities.value
    .slice() // Create copy to avoid mutating original
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
)

// Format entities for timeline display
const timelineItems = computed(() =>
  recentEntities.value.map((entity) => ({
    label: formatDistanceToNow(new Date(entity.createdAt), { addSuffix: true }),
    icon: getEntityIcon(entity.type),
    color: "indigo" as const,
    title: entity.name,
    description: t("recentActivity.entityInfo", {
      type: entity.type,
      observations: entity.observationsCount,
      relations: entity.relationsCount,
    }),
  }))
)

// Helper function to get appropriate icon based on entity type
function getEntityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    person: "i-ph-user",
    place: "i-ph-map-pin",
    thing: "i-ph-cube",
    event: "i-ph-calendar",
    concept: "i-ph-lightbulb",
    organization: "i-ph-buildings",
    // Default fallback
  }
  return iconMap[type.toLowerCase()] || "i-ph-tag"
}
</script>

<i18n lang="yaml">
en:
  title: Secure Memories for AI Assistants
  description: Your data. On your infrastructure. Under your control.
  hero:
    viewMemories: View Memories
    setupAssistants: Setup Assistants
  recentActivity:
    title: Recent Activity
    viewAll: View All Memories
    empty: No recent activity yet
    entityInfo: "{type} • {observations} observations • {relations} relations"
  gettingStarted:
    title: Getting Started with memrok
    steps:
      1:
        title: Create Your First Entity
        description: Add something meaningful to your memory store - a person, place, concept, or anything you want to remember.
        action: Create Entity
      2:
        title: Add Observations
        description: Record noteworthy details, facts, and insights about your entities to build rich contextual memories.
        action: Add Observation
      3:
        title: Create Relations
        description: Connect entities together to form a knowledge graph that captures how things relate to each other.
        action: Create Relation
      4:
        title: Connect AI Assistants
        description: Set up Claude Desktop, Cursor, or other MCP-compatible tools to access your memories.
        action: Setup Assistants
</i18n>
