<template>
  <UTable
    :columns="columns"
    :data="observations"
    sticky
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
    }"
  >
    <template #empty>
      <EmptyState :message="t('empty')">
        <MemoriesObservationsModal
          :entity-id="entityId"
          size="sm"
        />
      </EmptyState>
    </template>
    <template #creator-cell="{ row }">
      <UUser
        :avatar="{
          icon: row.original.createdByAssistantName
            ? 'i-ph-robot'
            : 'i-ph-user',
        }"
        :name="row.original.createdByAssistantName || t('columns.you')"
        :ui="{
          name: 'font-normal text-inherit',
        }"
      />
    </template>
    <template #actions-cell="{ row }">
      <MemoriesObservationsModal
        color="neutral"
        :observation="row.original"
        :show-title="false"
        variant="ghost"
      />
      <MemoriesDeleteSingle
        :id="row.original.id"
        type="observation"
      />
    </template>
  </UTable>
</template>

<script setup lang="ts">
import { format } from "@formkit/tempo"
import type { CellContext } from "@tanstack/vue-table"
import type { ObservationData } from "~/types/observations"

interface Props {
  entityId: string
}

const props = defineProps<Props>()

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

// Get observations for the specific entity
const observations = computed(() =>
  memoryStore.getObservationsForEntity(props.entityId)
)

const columns = [
  {
    accessorKey: "content",
    header: t("columns.content"),
    meta: {
      class: {
        th: "w-full",
        td: "font-bold w-full",
      },
    },
  },
  {
    accessorKey: "creator",
    header: t("columns.creator"),
  },
  {
    accessorKey: "createdAt",
    header: t("columns.created"),
    cell: ({ row }: CellContext<ObservationData, unknown>) => {
      return format(new Date(row.original.createdAt), {
        date: "medium",
        time: "short",
      })
    },
  },
  {
    id: "actions",
  },
]
</script>

<i18n lang="yaml">
en:
  empty: No observations available
  columns:
    content: Observation
    creator: Creator
    created: Created
    you: You
  actions:
    edit: Edit observation
    delete: Delete observation
</i18n>
