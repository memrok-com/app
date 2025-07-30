<template>
  <div>
    <UHeader>
      <template #left>
        <ULink :to="`/${locale}/`">
          <MemrokLogo class="max-h-6" />
        </ULink>
        <UBadge
          size="sm"
          variant="soft"
          >{{ version }}</UBadge
        >
      </template>
      <UNavigationMenu
        :items="items"
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
          :items="items"
          highlight
          orientation="vertical"
        />
      </template>
    </UHeader>
    <UMain>
      <NuxtPage />
    </UMain>
    <UFooter>
      <USeparator>
        <MemrokLogogram class="max-h-4" />
      </USeparator>
    </UFooter>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from "#ui/types"

const { locale, t } = useI18n({ useScope: "local" })
const config = useRuntimeConfig()
const { user, logout } = useOidcAuth()
const version = config.public.MEMROK_VERSION
const colorMode = useColorMode()
const route = useRoute()

const isDark = computed({
  get() {
    return colorMode.value === "dark"
  },
  set(_isDark) {
    colorMode.preference = _isDark ? "dark" : "light"
  },
})

const items = computed<NavigationMenuItem[][]>(() => [
  [
    {
      icon: "i-ph-head-circuit-fill",
      label: t("assistants"),
      to: `/${locale.value}/assistants/`,
      active: route.path.includes("/assistants"),
    },
    {
      icon: "i-ph-memory-fill",
      label: t("memories"),
      to: `/${locale.value}/memories/`,
      active: route.path.includes("/memories"),
    },
    {
      icon: "i-ph-github-logo-fill",
      label: t("github"),
      target: "_blank",
      to: "https://github.com/memrok-com/memrok",
    },
  ],
])

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      class: "font-normal",
      slot: "loggedInAs",
      type: "label",
    },
  ],
  [
    {
      class: "cursor-pointer",
      icon: isDark.value ? "i-ph-sun" : "i-ph-moon",
      label: isDark.value ? t("lightMode") : t("darkMode"),
      onSelect: () => {
        isDark.value = !isDark.value
      },
    },
  ],
  [
    {
      icon: "i-ph-user",
      label: t("account"),
      target: "_blank",
      to: `https://${config.public.MEMROK_AUTH_DOMAIN}/ui/console/users/me`,
    },
    {
      class: "cursor-pointer",
      icon: "i-ph-sign-out",
      label: t("logout"),
      onSelect: () => {
        logout()
      },
    },
  ],
])
</script>

<i18n lang="yaml">
en:
  assistants: Assistants
  memories: Memories
  github: GitHub
  lightMode: Light Mode
  darkMode: Dark Mode
  account: Account
  logout: Logout
</i18n>
