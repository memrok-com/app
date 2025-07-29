<template>
  <UModal
    :title="t(entity ? 'update.title' : 'insert.title')"
    :description="t(entity ? 'update.description' : 'insert.description')"
  >
    <UTooltip
      :disabled="showTitle"
      :text="t(entity ? 'update.title' : 'insert.title')"
    >
      <UButton
        :block="block"
        :color="color"
        :disabled="!entity && statistics.totalEntities < 1"
        :icon="entity ? 'i-ph-pencil-simple' : 'i-ph-plus'"
        :label="
          showTitle ? t(entity ? 'update.title' : 'insert.title') : undefined
        "
        :size="size"
        :square="!showTitle"
        :variant="variant"
    /></UTooltip>
    <template #body="{ close }">
      <MemoriesEntitiesForm
        :entity="entity"
        @close="close"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"
import type { EntityWithCounts } from "~/types/entities"

withDefaults(
  defineProps<{
    block?: ButtonProps["block"]
    color?: ButtonProps["color"]
    entity?: EntityWithCounts | undefined
    showTitle?: boolean
    size?: ButtonProps["size"]
    variant?: ButtonProps["variant"]
  }>(),
  {
    block: true,
    color: "primary",
    entity: undefined,
    showTitle: true,
    size: "md",
    variant: "solid",
  }
)

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()
const { statistics } = storeToRefs(memoryStore)
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
