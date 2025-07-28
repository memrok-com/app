<template>
  <UTable
    :columns="columns"
    :data="memoryStore.entities"
    sticky
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
      tr: 'data-[expanded=true]:bg-accented',
    }"
  >
    <template #empty>
      <Empty
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
const { t, n } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

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
    cell: ({ row }: any) => {
      return n(row.original.observationsCount)
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
    cell: ({ row }: any) => {
      return n(row.original.relationsCount)
    },
  },
  {
    accessorKey: "creator",
    header: t("columns.creator"),
  },
  {
    accessorKey: "createdAt",
    header: t("columns.created"),
    cell: ({ row }: any) => {
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
  empty: No memories available yet
  columns:
    name: Name
    type: Type
    observations: Observations
    relations: Relations
    created: Created
    creator: Creator
    you: You
</i18n>
