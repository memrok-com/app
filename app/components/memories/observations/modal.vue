<template>
  <UModal
    :title="t(`${mode}.title`)"
    :description="t(`${mode}.description`)"
  >
    <UTooltip
      :disabled="mode === 'update' || memoryStore.statistics.totalEntities > 0"
      :text="t('insert.tooltip')"
    >
      <UButton
        :block="block"
        :color="color"
        :disabled="
          mode === 'insert' && memoryStore.statistics.totalEntities < 1
        "
        :icon="mode == 'insert' ? 'i-ph-plus' : 'i-ph-pencil-simple'"
        :label="showTitle ? t(`${mode}.title`) : undefined"
        :size="size"
        :square="!showTitle"
        :variant="variant"
      />
    </UTooltip>

    <template #body="{ close }">
      <MemoriesObservationsForm
        :mode="mode"
        @close="close"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"

withDefaults(
  defineProps<{
    block?: ButtonProps["block"]
    color?: ButtonProps["color"]
    mode?: "insert" | "update"
    showTitle?: boolean
    size?: ButtonProps["size"]
    variant?: ButtonProps["variant"]
  }>(),
  {
    block: true,
    color: "primary",
    mode: "insert",
    showTitle: true,
    size: "md",
    variant: "solid",
  }
)

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()
</script>

<i18n lang="yaml">
en:
  insert:
    title: Insert Observation
    description: Add a new observation to your memories.
    tooltip: Insert an entity first
  update:
    title: Update Observation
    description: Modify this observation in your memories.
</i18n>
