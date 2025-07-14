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
      <div class="flex items-center gap-2">
        <ULink :to="`https://${authDomain}`">
          <UAvatar icon="i-ph-user" />
        </ULink>
        <UColorModeButton class="cursor-pointer" />
      </div>
    </template>
  </UHeader>
  <NuxtPage />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { locale, t } = useI18n()
const config = useRuntimeConfig()
const version = config.public.MEMROK_VERSION
const authDomain = config.public.MEMROK_AUTH_DOMAIN

const items = computed<NavigationMenuItem[][]>(() => [
  [
    {
      icon: 'i-ph-memory-fill',
       label: t('navigation.memory'),
       to: `/${locale.value}/my/memory`,
       },
       {
       icon: 'i-ph-head-circuit-fill',
       label: t('navigation.assistants'),
       to: `/${locale.value}/my/assistants`,
       },
    {
      icon: 'i-ph-gear-fill',
      label: t('navigation.settings'),
      to: `/${locale.value}/my/settings`,
    },
  ],
  [
    {
      icon: 'i-ph-github-logo-fill',
      label: t('navigation.github'),
      target: '_blank',
      to: 'https://github.com/memrok-com/memrok',
    },
  ]
])
</script>