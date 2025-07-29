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
        :disabled="!relation && statistics.totalEntities < 2"
        :icon="icon || (relation ? 'i-ph-pencil-simple-fill' : 'i-ph-plus')"
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
        :subject-id="subjectId"
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
    icon?: string
    subjectId?: string
    relation?: RelationData | undefined
    showTitle?: boolean
    size?: ButtonProps["size"]
    variant?: ButtonProps["variant"]
  }>(),
  {
    block: true,
    color: "primary",
    icon: undefined,
    subjectId: undefined,
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
  update:
    title: Update Relation
    description: Modify this relation in your memories.
</i18n>
