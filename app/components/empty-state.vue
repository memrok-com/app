<template>
  <UUser
    :avatar="{
      icon: 'i-ph-empty',
      ui: { root: 'bg-inherit' },
    }"
    :description="message || t('empty')"
  />
</template>

<script setup lang="ts">
defineProps<{
  message?: string
}>()

const { t } = useI18n({ useScope: "local" })
</script>

<i18n lang="yaml">
en:
  empty: No data available
</i18n>
