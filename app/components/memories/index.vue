<template>
  <UTable
    :data="props.entities"
    :columns="columns"
    :ui="{ separator: 'bg-(--ui-border-muted)' }"
  >
    <template #empty>
      <UPageFeature
        icon="i-ph-empty"
        :description="t('empty')"
        orientation="vertical"
      />
    </template>
  </UTable>
</template>

<script setup lang="ts">
import type { InferSelectModel } from 'drizzle-orm'
import type { entities } from '~/server/database/schema'

// Use Drizzle's type inference for the base entity type
type Entity = InferSelectModel<typeof entities>

// Extend with the additional fields returned by getEntitiesWithCounts
type EntityWithCounts = Entity & {
  createdByAssistantName: string | null
  createdByAssistantType: string | null
  relationsCount: number
  observationsCount: number
  createdByAssistantInfo: {
    name: string
    type: string
  } | null
}

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
    cell: ({ row }: { row: any }) => {
      const type = row.original.type
      return type.charAt(0).toUpperCase() + type.slice(1)
    },
  },
  {
    accessorKey: "createdAt",
    header: t("columns.created"),
    cell: ({ row }: { row: any }) => {
      const date = new Date(row.original.createdAt)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    },
  },
  {
    accessorKey: "creator",
    header: t("columns.creator"),
    cell: ({ row }: { row: any }) => {
      const entity = row.original
      if (entity.createdByAssistantName) {
        return `${entity.createdByAssistantName} (AI)`
      }
      return t("columns.you")
    },
  },
]
</script>

<i18n lang="yaml">
en:
  empty: No memories created yet.
  columns:
    name: Name
    type: Type
    created: Created
    creator: Creator
    you: You
</i18n>
