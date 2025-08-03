<template>
  <div>
    <!-- API Keys Table -->
    <UTable
      :columns="columns"
      :data="(keys as any)"
      :loading="loading"
    >
      <template #empty>
        <EmptyState :message="t('empty')" />
      </template>

      <template #scopes-cell="{ row }">
        <div class="flex items-center gap-1 flex-wrap">
          <UBadge
            v-for="scope in row.original.scopes"
            :key="scope"
            size="xs"
            variant="subtle"
            color="neutral"
          >
            {{ scope }}
          </UBadge>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <UButtonGroup>
          <ApiKeysDeleteSingle
            :key-id="row.original.id"
            size="sm"
            variant="ghost"
          />
        </UButtonGroup>
      </template>
    </UTable>

  </div>
</template>

<script setup lang="ts">
import { format } from '@formkit/tempo'

const { t } = useI18n({ useScope: 'local' })
const store = useApiKeysStore()

// Destructure reactive store properties
const { keys, loading } = storeToRefs(store)

// Table columns
const columns = [
  {
    accessorKey: 'name',
    header: t('columns.name'),
    meta: {
      class: {
        th: 'w-full',
        td: 'w-full',
      },
    },
  },
  {
    accessorKey: 'prefix',
    header: t('columns.prefix'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell: ({ row }: { row: { original: any } }) => `${row.original.prefix}...`,
    meta: {
      class: {
        td: 'font-mono text-sm',
      },
    },
  },
  {
    accessorKey: 'scopes',
    header: t('columns.scopes'),
  },
  {
    accessorKey: 'lastUsedAt',
    header: t('columns.lastUsed'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell: ({ row }: { row: { original: any } }) => {
      if (!row.original.lastUsedAt) return t('columns.neverUsed')
      return format(new Date(row.original.lastUsedAt), {
        date: 'medium',
        time: 'short',
      })
    },
  },
  {
    accessorKey: 'createdAt',
    header: t('columns.created'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell: ({ row }: { row: { original: any } }) => {
      return format(new Date(row.original.createdAt), {
        date: 'medium',
        time: 'short',
      })
    },
  },
  {
    id: 'actions',
    header: t('columns.actions'),
  },
]

// Load keys on mount
onMounted(() => {
  store.fetchKeys()
})
</script>

<i18n lang="yaml">
en:
  title: API Keys
  description: Manage API keys to give your apps access to memrok
  empty: No API keys yet.
  columns:
    name: Name
    prefix: Prefix
    scopes: Permissions
    lastUsed: Last Use
    created: Created
    actions: Actions
    neverUsed: Never used
</i18n>
