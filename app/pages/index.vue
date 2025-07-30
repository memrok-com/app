<template>
  <UPage>
    <UPageHero
      class="bg-gradient-to-tr from-sky-100 via-indigo-100 to-purple-100 dark:from-sky-900 dark:via-indigo-900 dark:to-purple-900"
      :title="t('title')"
      :description="t('description')"
      orientation="horizontal"
      :ui="{
        title: 'text-balance',
        description: 'text-balance text-primary',
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
          size="3xl"
        />
      </template>
      <MemrokLogogram class="hidden lg:block max-h-64 xl:max-h-96" />
    </UPageHero>

    <UContainer>
      <UPageGrid class="sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        <UPageSection
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
          <EmptyState :message="t('recentActivity.empty')" />
          <UTimeline
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
                to="/assistants"
                icon="i-ph-head-circuit-fill"
                size="xl"
              />
            </template>

            <template #1-description>
              <UButton
                icon="i-ph-memory-fill"
                :label="t('hero.links.memories')"
                to="/memories"
                size="xl"
                variant="outline"
              />
            </template>
          </UTimeline> </UPageSection
      ></UPageGrid>
    </UContainer>
  </UPage>
</template>

<script setup lang="ts">
import type { TimelineItem } from "@nuxt/ui"
const { t } = useI18n({ useScope: "local" })
const { user } = useOidcAuth()

useHead({
  title: t("title"),
})

const activityItems = ref<TimelineItem[]>([])

const startItems = ref<TimelineItem[]>([
  {
    date: t("gettingStarted.step", { n: 1 }),
    icon: "i-ph-head-circuit-fill",
    title: t("gettingStarted.steps.0.title"),
    description: "description",
    slot: "0",
  },
  {
    date: t("gettingStarted.step", { n: 2 }),
    icon: "i-ph-memory-fill",
    title: t("gettingStarted.steps.1.title"),
    description: "description",
    slot: "1",
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
