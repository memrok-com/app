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
const { t } = useI18n({ useScope: "local" })

interface Props {
  message?: string
}

const props = defineProps<Props>()
</script>

<i18n lang="yaml">
en:
  empty: No data available
</i18n>
