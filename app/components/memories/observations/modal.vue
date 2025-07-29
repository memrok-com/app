<template>
  <UModal
    :title="t(observation ? 'update.title' : 'insert.title')"
    :description="t(observation ? 'update.description' : 'insert.description')"
  >
    <UTooltip
      :disabled="showTitle"
      :text="t(observation ? 'update.title' : 'insert.title')"
    >
      <UButton
        :block="block"
        :color="color"
        :disabled="!observation && statistics.totalEntities < 1"
        :icon="icon || (observation ? 'i-ph-pencil-simple-fill' : 'i-ph-plus')"
        :label="
          showTitle
            ? t(observation ? 'update.title' : 'insert.title')
            : undefined
        "
        :size="size"
        :square="!showTitle"
        :variant="variant"
      />
    </UTooltip>

    <template #body="{ close }">
      <MemoriesObservationsForm
        :observation="observation"
        :entity-id="entityId"
        @close="close"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"
import type { ObservationData } from "~/types/observations"

withDefaults(
  defineProps<{
    block?: ButtonProps["block"]
    color?: ButtonProps["color"]
    icon?: string
    observation?: ObservationData | undefined
    entityId?: string
    showTitle?: boolean
    size?: ButtonProps["size"]
    variant?: ButtonProps["variant"]
  }>(),
  {
    block: true,
    color: "primary",
    icon: undefined,
    observation: undefined,
    entityId: undefined,
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
    title: Insert Observation
    description: Add a new observation to your memories.
  update:
    title: Update Observation
    description: Modify this observation in your memories.
</i18n>
