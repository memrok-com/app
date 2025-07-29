<template>
  <UModal
    :title="t(relation ? 'update.title' : 'insert.title')"
    :description="t(relation ? 'update.description' : 'insert.description')"
  >
    <UTooltip
      :disabled="showTitle"
      :text="t(relation ? 'update.title' : 'insert.title')"
    >
      <UButton
        :block="block"
        :color="color"
        :disabled="!relation && statistics.totalEntities < 1"
        :icon="relation ? 'i-ph-pencil-simple' : 'i-ph-plus'"
        :label="
          showTitle ? t(relation ? 'update.title' : 'insert.title') : undefined
        "
        :size="size"
        :square="!showTitle"
        :variant="variant"
      />
    </UTooltip>

    <template #body="{ close }">
      <MemoriesRelationsForm
        :relation="relation"
        @close="close"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"
import type { RelationData } from "~/types/relations"

withDefaults(
  defineProps<{
    block?: ButtonProps["block"]
    color?: ButtonProps["color"]
    relation?: RelationData | undefined
    showTitle?: boolean
    size?: ButtonProps["size"]
    variant?: ButtonProps["variant"]
  }>(),
  {
    block: true,
    color: "primary",
    relation: undefined,
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
    title: Insert Relation
    description: Add a new relation to your memories.
    tooltip: Insert two entities first
  update:
    title: Update Relation
    description: Modify this relation in your memories.
</i18n>
