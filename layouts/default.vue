<template>
  <UHeader>
    <template #left>
      <ULink :to="`/${locale}/`">
        <Logo class="max-h-6" />
      </ULink>
      <UBadge size="sm" variant="soft">{{ version }}</UBadge>
    </template>
    <UNavigationMenu
    highlight
    highlight-color="primary"
    orientation="horizontal"
    :items="items"
  />
    <template #right>
      <UColorModeButton class="cursor-pointer" />
    </template>
  </UHeader>
  <NuxtPage />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { locale, t } = useI18n()
const version = process.env.MEMROK_VERSION || 'v0.1.0'

const items = computed<NavigationMenuItem[][]>(() => [
  [
    {
      icon: 'i-ph-memory-fill',
       label: t('navigation.memory'),
       to: `/${locale.value}/memory`,
       },
       {
       icon: 'i-ph-head-circuit-fill',
       label: t('navigation.assistants'),
       to: `/${locale.value}/assistants`,
       },
    {
      icon: 'i-ph-gear-fill',
      label: t('navigation.settings'),
      to: `/${locale.value}/settings`,
    },
  ],
  [
    {
      icon: 'i-ph-github-logo-fill',
      label: t('navigation.github'),
      target: '_blank',
      to: 'https://github.com/MichaelSchmidle/memrok',
    },
  ]
])
</script>