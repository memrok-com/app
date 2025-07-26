<template>
  <UTable
    :columns="columns"
    :data="entities"
    sticky
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
      tr: 'data-[expanded=true]:bg-accented',
    }"
  >
    <template #empty>
      <UPageFeature
        icon="i-ph-empty"
        :description="t('empty')"
        orientation="vertical"
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
import type { EntityWithCounts } from "~/types/entities"

const { t } = useI18n({ useScope: "local" })

const props = withDefaults(
  defineProps<{
    entities?: EntityWithCounts[]
  }>(),
  {
    entities: () => [],
  }
)

const columns = [
  {
    accessorKey: "name",
    header: t("columns.name"),
  },
  {
    accessorKey: "type",
    header: t("columns.type"),
  },
  {
    accessorKey: "observationsCount",
    header: t("columns.observations"),
    meta: {
      class: {
        td: "font-mono text-end",
        th: "text-end",
      },
    },
    cell: ({ row }: { row: any }) => {
      return row.original.observationsCount.toLocaleString()
    },
  },
  {
    accessorKey: "relationsCount",
    header: t("columns.relations"),
    meta: {
      class: {
        td: "font-mono text-end",
        th: "text-end",
      },
    },
    cell: ({ row }: { row: any }) => {
      return row.original.relationsCount.toLocaleString()
    },
  },
  {
    accessorKey: "creator",
    header: t("columns.creator"),
  },
  {
    accessorKey: "createdAt",
    header: t("columns.created"),
    cell: ({ row }: { row: any }) => {
      return format(new Date(row.original.createdAt), {
        date: "medium",
        time: "short",
      })
    },
  },
  {
    id: "expand",
  },
]
</script>

<i18n lang="yaml">
en:
  empty: No memories created yet.
  columns:
    name: Name
    type: Type
    observations: Observations
    relations: Relations
    created: Created
    creator: Creator
    you: You
</i18n>
