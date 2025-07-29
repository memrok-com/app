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
    <template #expand-cell="{ row }">
      <UButton
        :icon="row.getIsExpanded() ? 'i-ph-caret-down' : 'i-ph-caret-right'"
        variant="ghost"
        size="xs"
        :disabled="
          !row.original.observationsCount && !row.original.relationsCount
        "
        @click="row.toggleExpanded()"
      />
    </template>
    <template #expanded="{ row }">
      <div class="p-4 bg-gray-50 dark:bg-gray-800/50">
        <UTabs
          :items="getTabItems(row.original)"
          class="w-full"
        >
          <template #observations>
            <MemoriesObservations :entity-id="row.original.id" />
          </template>
          <template #relations>
            <MemoriesRelations :entity-id="row.original.id" />
          </template>
        </UTabs>
      </div>
    </template>
  </UTable>
</template>

<script setup lang="ts">
import { format } from "@formkit/tempo"
import type { CellContext } from "@tanstack/vue-table"
import type { EntityWithCounts } from "~/types/entities"

const { t, n } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

// Use storeToRefs to ensure proper reactivity with Pinia store
const { entities } = storeToRefs(memoryStore)

// Generate tab items based on entity counts
const getTabItems = (entity: EntityWithCounts) => {
  const items = []

  if (entity.observationsCount > 0) {
    items.push({
      slot: "observations",
      label: t("tabs.observations", { count: entity.observationsCount }),
      icon: "i-ph-note",
    })
  }

  if (entity.relationsCount > 0) {
    items.push({
      slot: "relations",
      label: t("tabs.relations", { count: entity.relationsCount }),
      icon: "i-ph-graph",
    })
  }

  return items
}

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
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
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
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
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
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
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
  tabs:
    observations: "Observations ({count})"
    relations: "Relations ({count})"
</i18n>
