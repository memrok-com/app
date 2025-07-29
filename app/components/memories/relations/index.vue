<template>
  <UTable
    :columns="columns"
    :data="relations"
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
    }"
  >
    <template #empty>
      <EmptyState
        class="justify-center"
        :message="t('empty')"
      />
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
  </UTable>
</template>

<script setup lang="ts">
import { format } from "@formkit/tempo"
import type { CellContext } from "@tanstack/vue-table"
import type { RelationData } from "~/types/relations"

interface Props {
  entityId: string
}

const props = defineProps<Props>()

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

// Get relations for the specific entity
const relations = computed(() =>
  memoryStore.getRelationsForEntity(props.entityId)
)

const columns = [
  {
    accessorKey: "predicate",
    header: t("columns.type"),
  },
  {
    accessorKey: "subjectEntity",
    header: t("columns.source"),
    cell: ({ row }: CellContext<RelationData, unknown>) => {
      return row.original.subjectEntity?.name || t("columns.unknown")
    },
  },
  {
    accessorKey: "objectEntity",
    header: t("columns.target"),
    cell: ({ row }: CellContext<RelationData, unknown>) => {
      return row.original.objectEntity?.name || t("columns.unknown")
    },
  },
  {
    accessorKey: "creator",
    header: t("columns.creator"),
  },
  {
    accessorKey: "createdAt",
    header: t("columns.created"),
    cell: ({ row }: CellContext<RelationData, unknown>) => {
      return format(new Date(row.original.createdAt), {
        date: "medium",
        time: "short",
      })
    },
  },
]
</script>

<i18n lang="yaml">
en:
  empty: No relations available
  columns:
    type: Relationship Type
    source: Source Entity
    target: Target Entity
    creator: Creator
    created: Created
    you: You
    unknown: Unknown
</i18n>
