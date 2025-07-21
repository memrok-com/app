<template>
  <UPage>
    <UPageHero
      :title="$t('index.hero.title')"
      :description="$t('index.hero.description')"
      class="bg-gradient-to-tr from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900"
    />
  </UPage>
</template>

<script setup lang="ts">
// Make this page public (accessible without authentication)
definePageMeta({
  auth: false
})

const { t } = useI18n()

useHead({
  title: t('index.hero.title'),
})
</script>