<template>
  <UModal :title="t('title')">
    <UTooltip
      :disabled="showTitle"
      :text="t('title')"
    >
      <UButton
        :block="block"
        :color="color"
        icon="i-ph-plus"
        :label="showTitle ? t('title') : undefined"
        :size="size"
        :square="!showTitle"
        :variant="variant"
      />
    </UTooltip>
    <template #body="{ close }">
      <ApiKeysForm @close="close" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from '#ui/types'

withDefaults(
  defineProps<{
    block?: ButtonProps['block']
    color?: ButtonProps['color']
    showTitle?: boolean
    size?: ButtonProps['size']
    variant?: ButtonProps['variant']
  }>(),
  {
    block: false,
    color: 'primary',
    showTitle: true,
    size: 'md',
    variant: 'solid',
  }
)

const { t } = useI18n({ useScope: 'local' })
</script>

<i18n lang="yaml">
en:
  title: Create API Key
</i18n>
