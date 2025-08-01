<template>
  <UTable
    :columns="columns"
    :data="relations"
    sticky
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
    }"
  >
    <template #empty>
      <EmptyState :message="t('empty')">
        <MemoriesRelationsModal
          :subject-id="entityId"
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
      <UButtonGroup>
        <MemoriesRelationsModal
          color="neutral"
          :relation="row.original"
          :show-title="false"
          variant="subtle"
        />
        <MemoriesDeleteSingle
          :id="row.original.id"
          type="relation"
          variant="subtle"
        />
      </UButtonGroup>
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
    cell: ({ row }: CellContext<RelationData, unknown>) => {
      return row.original.subjectEntity?.name || t("columns.unknown")
    },
    accessorKey: "subjectEntity",
    header: t("columns.subject"),
    meta: {
      class: {
        td: "font-bold",
      },
    },
  },
  {
    accessorKey: "predicate",
    header: t("columns.type"),
  },
  {
    cell: ({ row }: CellContext<RelationData, unknown>) => {
      return row.original.objectEntity?.name || t("columns.unknown")
    },
    accessorKey: "objectEntity",
    header: t("columns.object"),
    meta: {
      class: {
        th: "w-full",
        td: "w-full",
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
    cell: ({ row }: CellContext<RelationData, unknown>) => {
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
  empty: No relations available
  columns:
    subject: Subject
    type: Relation
    object: Object
    creator: Creator
    created: Created
    you: You
    unknown: Unknown
  actions:
    edit: Edit relation
    delete: Delete relation
</i18n>
