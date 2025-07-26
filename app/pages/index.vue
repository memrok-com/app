<template>
  <UPage>
    <UPageHero
      class="bg-gradient-to-tr from-sky-100 via-indigo-100 to-purple-100 dark:from-sky-900 dark:via-indigo-900 dark:to-purple-900"
      :ui="{
        title: 'text-balance',
        description: 'text-balance',
      }"
    >
      <template #title>
        {{ t("title") }}
      </template>
      <template #description>
        {{ t("description") }}
      </template>
    </UPageHero>
  </UPage>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: "local" })

useHead({
  title: t("title"),
})
</script>

<i18n lang="yaml">
en:
  title: Secure Memories for All Your Assistants
  description: Your data. On your infrastructure. Under your control.
</i18n>
