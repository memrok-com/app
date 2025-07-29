<template>
  <div class="flex gap-x-4 justify-center mx-auto w-fit">
    <UUser
      :avatar="{
        icon: 'i-ph-empty',
        ui: { root: 'bg-inherit' },
      }"
      :description="message || t('empty')"
    />
    <slot />
  </div>
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
