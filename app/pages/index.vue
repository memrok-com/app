<template>
  <UPage>
    <UPageHero
      class="bg-gradient-to-tr from-sky-100 via-indigo-100 to-purple-100 dark:from-sky-900 dark:via-indigo-900 dark:to-purple-900"
      :title="t('title')"
      :description="t('description')"
      orientation="horizontal"
      :ui="{
        title: 'text-balance',
        description: 'text-balance text-inherit',
        body: 'hidden md:visible',
      }"
    >
      <template #headline>
        <UUser
          :avatar="{
            icon: 'i-ph-hand-waving-fill',
            ui: { icon: 'text-warning', root: 'bg-inherit size-fit' },
          }"
          :name="t('greeting', { name: user?.userInfo?.given_name })"
          size="2xl"
        />
      </template>
      <MemrokLogogram class="hidden lg:block max-h-64 xl:max-h-96" />
    </UPageHero>

    <UContainer>
      <UPageGrid class="sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        <UPageSection
          v-auto-animate
          :title="t('recentActivity.title')"
          :description="t('recentActivity.description')"
        >
          <template #leading>
            <UIcon
              class="text-info"
              name="i-ph-footprints-fill"
              size="32"
            />
          </template>

          <UTimeline
            v-if="!initialized"
            class="mx-auto"
            :items="[{ date: '1' }, { date: '1' }, { date: '1' }]"
            :ui="{
              wrapper: 'space-y-1.5',
              indicator: 'animate-pulse',
              separator: 'animate-pulse',
            }"
          >
            <template #date>
              <USkeleton class="rounded h-[20px] w-[150px]" />
            </template>
            <template #title>
              <USkeleton class="rounded h-[20px] w-[250px]" />
            </template>
            <template #description>
              <USkeleton class="rounded h-[20px] w-[200px]" />
            </template>
          </UTimeline>

          <EmptyState
            v-else-if="activityItems.length === 0"
            :message="t('recentActivity.empty')"
          />
          <UTimeline
            v-else
            class="mx-auto"
            color="neutral"
            :items="activityItems"
          />
        </UPageSection>

        <UPageSection
          :title="t('gettingStarted.title')"
          :description="t('gettingStarted.description')"
        >
          <template #leading>
            <UIcon
              class="text-success"
              name="i-ph-rocket-launch-fill"
              size="32"
            />
          </template>

          <UTimeline
            class="mx-auto"
            color="neutral"
            :default-value="1"
            :items="startItems"
            :ui="{ description: 'mt-3' }"
          >
            <template #0-description>
              <UButton
                :label="t('hero.links.assistants')"
                :to="`/${locale}/assistants/`"
                icon="i-ph-head-circuit-fill"
                size="xl"
              />
            </template>

            <template #1-description>
              <UButton
                icon="i-ph-memory-fill"
                :label="t('hero.links.memories')"
                :to="`/${locale}/memories/`"
                size="xl"
                variant="outline"
              />
            </template>
          </UTimeline>
        </UPageSection>
      </UPageGrid>
    </UContainer>
  </UPage>
</template>

<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import { format } from '@formkit/tempo'
import type { Activity } from '~/stores/memory'

const { locale, t } = useI18n({ useScope: 'local' })
const { user } = useOidcAuth()
const memoryStore = useMemoryStore()
const { initialized, recentActivities } = storeToRefs(memoryStore)
useHead({
  title: t('title'),
})

// Initialize memory store when component mounts
onMounted(async () => {
  try {
    await memoryStore.initialize()
  } catch (error) {
    console.error('Failed to load memory data:', error)
  }
})

// Map activities to TimelineItems with i18n
const activityItems = computed<TimelineItem[]>(() => {
  const items = recentActivities.value.map((activity: Activity) => {
    // Format date using tempo with locale
    const date = format(new Date(activity.timestamp), {
      date: 'medium',
      time: 'short',
    })

    // Build localized title and description
    let title = ''
    let description = ''
    let icon = ''

    switch (activity.type) {
      case 'entity_created':
        icon = 'i-ph-squares-four-fill'
        title = t('recentActivity.entity', {
          type: activity.entityType,
          name: activity.entityName,
        })
        description = t('recentActivity.createdBy', {
          creator:
            activity.creatorType === 'user'
              ? t('recentActivity.you')
              : activity.creator,
        })
        break
      case 'entity_updated':
        icon = 'i-ph-squares-four-fill'
        title = t('recentActivity.entity', {
          type: activity.entityType,
          name: activity.entityName,
        })
        description = t('recentActivity.updatedBy', {
          creator:
            activity.creatorType === 'user'
              ? t('recentActivity.you')
              : activity.creator,
        })
        break
      case 'observation_created':
        icon = 'i-ph-eyes-fill'
        title = t('recentActivity.observation', {
          entity: activity.entityName || t('recentActivity.unknownEntity'),
        })
        description = t('recentActivity.createdBy', {
          creator:
            activity.creatorType === 'user'
              ? t('recentActivity.you')
              : activity.creator,
        })
        break
      case 'relation_created':
        icon = 'i-ph-line-segment-fill'
        title = t('recentActivity.relation', {
          from: activity.entityName || t('recentActivity.unknownEntity'),
          predicate: activity.predicate,
          to: activity.relatedEntityName || t('recentActivity.unknownEntity'),
        })
        description = t('recentActivity.createdBy', {
          creator:
            activity.creatorType === 'user'
              ? t('recentActivity.you')
              : activity.creator,
        })
        break
    }

    return {
      date,
      title,
      description,
      icon,
      class:
        activity.creatorType === 'user' ? 'text-neutral-500' : 'text-info-500',
    }
  })
  return items
})

const startItems = ref<TimelineItem[]>([
  {
    date: t('gettingStarted.step', { n: 1 }),
    icon: 'i-ph-head-circuit-fill',
    title: t('gettingStarted.steps.0.title'),
    description: 'description',
    slot: '0',
  },
  {
    date: t('gettingStarted.step', { n: 2 }),
    icon: 'i-ph-memory-fill',
    title: t('gettingStarted.steps.1.title'),
    description: 'description',
    slot: '1',
  },
])
</script>

<i18n lang="yaml">
en:
  greeting: Hey, {name}!
  title: Welcome to Your Secure AI Memory
  description: Your data. On your infrastructure. Under your control.
  hero:
    links:
      assistants: Connect Assistants
      memories: Manage Memories
  recentActivity:
    title: Recent Activity
    description: Glance at recent changes to your AI memories.
    empty: No activities available
    entity: '{name} ({type})'
    observation: Observation for {entity}
    relation: '{from} {predicate} {to}'
    createdBy: Created by {creator}
    updatedBy: Updated by {creator}
    you: You
    unknownEntity: entity
    unknownCreator: unknown
  gettingStarted:
    title: Getting Started
    description: Connect assistants. Manage memories. It’s that simple.
    step: Step {n}
    steps:
      0:
        title: Give your assistants access to memrok
      1:
        title: Control what assistants know about you and your life
</i18n>
