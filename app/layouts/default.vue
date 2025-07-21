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
        <UDropdownMenu
          :content="{ align: 'end' }"
          :items="userMenuItems"
        >
          <UAvatar
            :alt="user?.userInfo?.name"
            class="cursor-pointer"
          />
          <template #loggedInAs>
            <UUser
              :avatar="{ alt: user?.userInfo?.name }"
              :name="user?.userInfo?.name"
              :description="user?.userInfo?.email"
            />
          </template>
        </UDropdownMenu>
    </template>
  </UHeader>
  <NuxtPage />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale, t } = useI18n()
const config = useRuntimeConfig()
const { user, logout } = useOidcAuth()
const version = config.public.MEMROK_VERSION
const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  }
})

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

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      class: 'font-normal',
      slot: 'loggedInAs',
      type: 'label',
    },
  ],
  [
    {
      class: 'cursor-pointer',
      icon: isDark.value ? 'i-ph-sun' : 'i-ph-moon',
      label: isDark.value ? t('navigation.lightMode') : t('navigation.darkMode'),
      onSelect: () => {
        isDark.value = !isDark.value
      },
    },
  ],
  [
    {
      icon: 'i-ph-user',
      label: t('navigation.profile'),
      to: `https://${config.public.MEMROK_AUTH_DOMAIN}/ui/console/users/me`,
    },
    {
      class: 'cursor-pointer',
      icon: 'i-ph-sign-out',
      label: t('navigation.logout'),
      onSelect: () => {
        logout()
      },
    }
  ]
])
</script>