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
      <MemoriesRelationsForm
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
    title: Insert Relation
    description: Add a new relation to your memories.
  update:
    title: Update Relation
    description: Modify this relation in your memories.
</i18n>
