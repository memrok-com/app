<template>
  <div class="space-y-4">
    <UTable
      :columns="columns"
      :data="paginatedEntities"
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
    <template #actions-cell="{ row }">
      <UButtonGroup>
        <MemoriesEntitiesModal
          color="neutral"
          :entity="row.original"
          :show-title="false"
          variant="subtle"
        />
        <MemoriesObservationsModal
          color="neutral"
          :entity-id="row.original.id"
          icon="i-ph-eyes-fill"
          :show-title="false"
          variant="subtle"
        />
        <MemoriesRelationsModal
          color="neutral"
          :subject-id="row.original.id"
          icon="i-ph-line-segment-fill"
          :show-title="false"
          variant="subtle"
        />
        <MemoriesDeleteSingle
          :id="row.original.id"
          type="entity"
          variant="subtle"
        />
      </UButtonGroup>
    </template>
    <template #expanded="{ row }">
      <div class="space-y-3">
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <MemoriesObservations :entity-id="row.original.id" />
        </UCard>
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <MemoriesRelations :entity-id="row.original.id" />
        </UCard>
      </div>
    </template>
    </UTable>

    <!-- Pagination Controls -->
    <div
      v-if="paginationInfo.totalItems > 0"
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Pagination Info -->
      <div class="flex items-center gap-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('pagination.showing', {
            start: paginationInfo.startItem,
            end: paginationInfo.endItem,
            total: paginationInfo.totalItems
          }) }}
        </p>
        
        <!-- Items per page selector -->
        <USelect
          v-model="selectedItemsPerPage"
          :items="[
            { label: t('pagination.itemsPerPage', { count: 25 }), value: 25 },
            { label: t('pagination.itemsPerPage', { count: 50 }), value: 50 },
            { label: t('pagination.itemsPerPage', { count: 100 }), value: 100 }
          ]"
          size="xs"
        />
      </div>

      <!-- Pagination Component -->
      <UPagination
        v-if="totalPages > 1"
        v-model:page="currentPageModel"
        :total="paginationInfo.totalItems"
        :items-per-page="paginationInfo.itemsPerPage"
        size="sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { format } from '@formkit/tempo'
import type { TableColumn } from '@nuxt/ui'
import type { CellContext } from '@tanstack/vue-table'
import type { EntityWithCounts } from '~/types/entities'

const UButton = resolveComponent('UButton')
const { t, n } = useI18n({ useScope: 'local' })
const memoryStore = useMemoryStore()

// Use storeToRefs to ensure proper reactivity with Pinia store
const { 
  paginatedEntities, 
  paginationInfo, 
  totalPages 
} = storeToRefs(memoryStore)

// Actions are not refs, so destructure directly from store
const { setCurrentPage, setItemsPerPage } = memoryStore

// Computed property to sync USelect with store
const selectedItemsPerPage = computed({
  get: () => paginationInfo.value.itemsPerPage,
  set: (value: number) => setItemsPerPage(value)
})

// Computed property to sync UPagination with store
const currentPageModel = computed({
  get: () => paginationInfo.value.currentPage,
  set: (value: number) => setCurrentPage(value)
})

const columns: TableColumn<EntityWithCounts>[] = [
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-ph-caret-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : '',
          ],
        },
        onClick: () => row.toggleExpanded(),
      }),
  },
  {
    accessorKey: 'name',
    header: t('columns.name'),
    meta: {
      class: {
        th: 'w-full',
        td: 'font-bold w-full',
      },
    },
  },
  {
    accessorKey: 'type',
    header: t('columns.type'),
  },
  {
    accessorKey: 'observationsCount',
    header: t('columns.observations'),
    meta: {
      class: {
        td: 'font-mono text-end',
        th: 'text-end',
      },
    },
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
      return n(row.original.observationsCount)
    },
  },
  {
    accessorKey: 'relationsCount',
    header: t('columns.relations'),
    meta: {
      class: {
        td: 'font-mono text-end',
        th: 'text-end',
      },
    },
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
      return n(row.original.relationsCount)
    },
  },
  {
    accessorKey: 'creator',
    header: t('columns.creator'),
  },
  {
    accessorKey: 'createdAt',
    header: t('columns.created'),
    cell: ({ row }: CellContext<EntityWithCounts, unknown>) => {
      return format(new Date(row.original.createdAt), {
        date: 'medium',
        time: 'short',
      })
    },
  },
  {
    id: 'actions',
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
  pagination:
    showing: "Showing {start}-{end} of {total} entities"
    itemsPerPage: "{count} per page"
</i18n>
