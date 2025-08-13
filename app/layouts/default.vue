<template>
  <div>
    <UHeader>
      <template #left>
        <ULink :to="`/${locale}/`">
          <MemrokLogo class="!h-6 !w-auto" />
        </ULink>
        <UBadge
          size="sm"
          variant="soft"
          >{{ version }}</UBadge
        >
      </template>
      <UNavigationMenu
        :items="navigationMenuItems"
        highlight
      />
      <template #right>
        <UDropdownMenu
          :content="{ align: 'end' }"
          :items="userMenuItems"
        >
          <UAvatar
            :alt="
              typeof user?.userInfo?.name === 'string'
                ? user.userInfo.name
                : undefined
            "
            class="cursor-pointer"
          />
          <template #loggedInAs>
            <UUser
              :avatar="{
                alt:
                  typeof user?.userInfo?.name === 'string'
                    ? user.userInfo.name
                    : undefined,
              }"
              :name="
                typeof user?.userInfo?.name === 'string'
                  ? user.userInfo.name
                  : undefined
              "
              :description="
                typeof user?.userInfo?.email === 'string'
                  ? user.userInfo.email
                  : undefined
              "
            />
          </template>
        </UDropdownMenu>
      </template>
      <template #body>
        <UNavigationMenu
          :items="navigationMenuItems"
          highlight
          orientation="vertical"
        />
      </template>
    </UHeader>
    <UMain>
      <NuxtPage />
    </UMain>
    <USeparator>
      <MemrokLogogram class="!h-6 !w-auto" />
    </USeparator>
    <UFooter>
      <template #left>
        <MemrokLogo class="!h-6 !w-auto" />

        <UBadge
          size="sm"
          variant="soft"
          >{{ version }}</UBadge
        >

        <UBadge
          color="success"
          icon="i-ph-shield-check-fill"
          :label="t('selfHosted')"
          size="sm"
          variant="soft"
        />
      </template>

      <ClientOnly>
        <UNavigationMenu
          class="sm:hidden"
          :items="footerNavigationMenuItems"
          orientation="vertical"
        />
        <UNavigationMenu
          class="hidden sm:block"
          :items="footerNavigationMenuItems"
        />
      </ClientOnly>

      <template #right>
        <div class="text-muted text-sm">
          {{ t('copyright', { year: year }) }}
        </div>
      </template>
    </UFooter>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '#ui/types'

const { locale, t } = useI18n({ useScope: 'local' })
const config = useRuntimeConfig()
const { user, logout } = useOidcAuth()
const version = config.public.MEMROK_VERSION
const year = config.public.MEMROK_BUILD_YEAR
const colorMode = useColorMode()
const route = useRoute()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  },
})

const navigationMenuItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t('apps'),
      to: `/${locale.value}/apps/`,
      active: route.path.includes('/apps'),
    },
    {
      label: t('memories'),
      to: `/${locale.value}/memories/`,
      active: route.path.includes('/memories'),
    },
  ],
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
      label: isDark.value ? t('lightMode') : t('darkMode'),
      onSelect: () => {
        isDark.value = !isDark.value
      },
    },
  ],
  [
    {
      icon: 'i-ph-user',
      label: t('account'),
      target: '_blank',
      to: config.public.MEMROK_AUTH_DOMAIN 
        ? `https://${config.public.MEMROK_AUTH_DOMAIN}/ui/console/users/me`
        : '#',
    },
    {
      class: 'cursor-pointer',
      icon: 'i-ph-sign-out',
      label: t('logout'),
      onSelect: () => {
        logout()
      },
    },
  ],
])

const footerNavigationMenuItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      icon: 'i-ph-users',
      label: t('userManagement'),
      target: '_blank',
      to: config.public.MEMROK_AUTH_DOMAIN 
        ? `https://${config.public.MEMROK_AUTH_DOMAIN}`
        : '#',
    },
    {
      icon: 'i-ph-diamonds-four-fill',
      label: 'www.memrok.com',
      target: '_blank',
      to: 'https://www.memrok.com',
    },
    {
      icon: 'i-ph-github-logo-fill',
      label: t('github'),
      target: '_blank',
      to: 'https://github.com/memrok-com/memrok',
    },
  ],
])
</script>

<i18n lang="yaml">
en:
  apps: Apps
  memories: Memories
  github: GitHub
  lightMode: Light Mode
  darkMode: Dark Mode
  account: Account
  logout: Logout
  selfHosted: Self-Hosted
  userManagement: User Management
  copyright: © {year} memrok.com
</i18n>
