<template>
  <UPage>
    <UPageHero :title="$t('index.hero.title')" :description="$t('index.hero.description')" />
  </UPage>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: t('index.hero.title'),
})
</script>