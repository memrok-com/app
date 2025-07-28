<template>
  <UModal
    :title="t(`${mode}.title`)"
    :description="t(`${mode}.description`)"
  >
    <UButton
      :block="block"
      :color="color"
      :icon="mode == 'insert' ? 'i-ph-plus' : 'i-ph-pencil-simple'"
      :label="showTitle ? t(`${mode}.title`) : undefined"
      :size="size"
      :square="!showTitle"
      :variant="variant"
    />
    <template #body="{ close }">
      <MemoriesEntitiesForm
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
    mode: "insert",
    showTitle: true,
  }
)

const { t } = useI18n({ useScope: "local" })
</script>

<i18n lang="yaml">
en:
  insert:
    title: Insert Entity
    description: Add a new entity to your memories.
  update:
    title: Update Entity
    description: Modify this entity in your memories.
</i18n>
