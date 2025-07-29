<template>
  <UContainer>
    <UPage>
      <UPageHeader :ui="{ title: 'text-balance' }">
        <template #title>
          {{ t("title") }}
        </template>
      </UPageHeader>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: "local" })

useHead({
  title: t("title"),
})
</script>

<i18n lang="yaml">
en:
  title: "Assistants"
</i18n>
