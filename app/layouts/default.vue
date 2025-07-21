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
        <UDropdown v-if="user" :items="userMenuItems">
          <UAvatar 
            :src="user.picture" 
            :alt="user.name" 
            :icon="user.picture ? undefined : 'i-ph-user'"
            class="cursor-pointer"
          />
        </UDropdown>
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
const { user, loggedIn } = useOidcAuth()

const version = config.public.MEMROK_VERSION

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

const userMenuItems = computed(() => [
  [
    {
      label: user.value?.name || user.value?.email || 'User',
      icon: 'i-ph-user',
      disabled: true
    }
  ],
  [
    {
      label: 'Profile',
      icon: 'i-ph-user-circle',
      click: () => navigateTo(`https://${config.public.MEMROK_AUTH_DOMAIN}/ui/login`, { external: true })
    },
    {
      label: 'Logout',
      icon: 'i-ph-sign-out',
      click: () => logout()
    }
  ]
])

async function logout() {
  await navigateTo(`https://${config.public.MEMROK_AUTH_DOMAIN}/ui/login/logout`, { external: true })
}
</script>