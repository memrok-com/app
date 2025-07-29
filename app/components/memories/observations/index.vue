<template>
  <UTable
    :columns="columns"
    :data="observations"
    :ui="{
      separator: 'bg-(--ui-border-muted) dark:bg-(--ui-bg-muted)',
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
import type { CellContext } from '@tanstack/vue-table'
import type { ObservationData } from '~/types/observations'

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
]
</script>

<i18n lang="yaml">
en:
  empty: No observations available
  columns:
    content: Content
    creator: Creator
    created: Created
    you: You
</i18n>