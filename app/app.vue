<template>
  <UApp :locale="locales[locale]">
    <NuxtRouteAnnouncer />
    <UMain>
      <NuxtLoadingIndicator color="indigo-500 dark:indigo-400" />
      <NuxtLayout />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
import * as locales from "@nuxt/ui-pro/locale"

const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
  titleTemplate: "%s · memrok",
})
</script>
