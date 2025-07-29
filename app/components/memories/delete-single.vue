<template>
  <UTooltip
    :text="
      isConfirmingDelete
        ? t('confirmDelete', { type: type })
        : t('delete', { type: type })
    "
  >
    <UButton
      :aria-label="
        isConfirmingDelete
          ? t('confirmDelete', { type: type })
          : t('delete', { type: type })
      "
      :color="isConfirmingDelete ? 'error' : 'neutral'"
      :disabled="isDeleting || !item"
      :icon="
        isConfirmingDelete ? 'i-ph-warning-fill' : 'i-ph-trash-simple-fill'
      "
      :loading="isDeleting"
      :size="size"
      square
      :variant="isConfirmingDelete ? 'solid' : 'ghost'"
      @click="handleDeleteClick"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"

interface Props {
  id: string
  size?: ButtonProps["size"]
  type: "entity" | "observation" | "relation"
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
})

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()
const toast = useToast()

// Get the item from store based on type and id
const item = computed(() => {
  switch (props.type) {
    case "entity":
      return memoryStore.getEntityById(props.id)
    case "observation":
      return memoryStore.observations.find((o) => o.id === props.id)
    case "relation":
      return memoryStore.relations.find((r) => r.id === props.id)
  }
})

// Loading state based on type
const isDeleting = computed(() => {
  switch (props.type) {
    case "entity":
      return memoryStore.loading.entities.deleting.has(props.id)
    case "observation":
      return memoryStore.loading.observations.deleting.has(props.id)
    case "relation":
      return memoryStore.loading.relations.deleting.has(props.id)
  }
})

// Delete confirmation state
const isConfirmingDelete = ref(false)
let confirmationTimeout: NodeJS.Timeout | null = null

// Reset confirmation state after 3 seconds
const resetConfirmation = () => {
  isConfirmingDelete.value = false
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout)
    confirmationTimeout = null
  }
}

// Handle keyboard events for escape key
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isConfirmingDelete.value) {
      resetConfirmation()
    }
  }
  document.addEventListener("keydown", handleKeydown)

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown)
    resetConfirmation()
  })
})

// Get display name for toast messages
const getDisplayName = () => {
  if (!item.value) return t("unknown")

  switch (props.type) {
    case "entity":
      return (item.value as any).name
    case "observation":
      const content = (item.value as any).content
      return content.length > 50 ? content.substring(0, 50) + "..." : content
    case "relation":
      const relation = item.value as any
      const subject = relation.subjectEntity?.name || t("unknown")
      const predicate = relation.predicate
      const object = relation.objectEntity?.name || t("unknown")
      return `${subject} ${predicate} ${object}`
  }
}

const handleDeleteClick = () => {
  if (isConfirmingDelete.value) {
    // Second click - execute delete
    handleDelete()
  } else {
    // First click - enter confirmation state
    isConfirmingDelete.value = true
    confirmationTimeout = setTimeout(() => {
      resetConfirmation()
    }, 3000)
  }
}

const handleDelete = async () => {
  if (isDeleting.value || !item.value) return

  // Reset confirmation state
  resetConfirmation()

  try {
    // Store original item for undo functionality
    const originalItem = { ...item.value }
    const displayName = getDisplayName()

    // Delete based on type
    switch (props.type) {
      case "entity":
        await memoryStore.deleteEntity(props.id)
        break
      case "observation":
        await memoryStore.deleteObservation(props.id)
        break
      case "relation":
        await memoryStore.deleteRelation(props.id)
        break
    }

    // Show undo toast
    toast.add({
      color: "success",
      id: `delete-${props.type}-${props.id}`,
      icon: "i-ph-check-circle-fill",
      title: t(`deleted.${props.type}.title`),
      description: t(`deleted.${props.type}.description`, {
        name: displayName,
      }),
      actions: [
        {
          icon: "i-ph-arrow-counter-clockwise",
          label: t("undo"),
          onClick: async () => {
            try {
              await recreateItem(originalItem)
              toast.add({
                title: t(`restored.${props.type}.title`),
                description: t(`restored.${props.type}.description`, {
                  name: displayName,
                }),
                icon: "i-ph-check-circle-fill",
                color: "success",
              })
            } catch {
              toast.add({
                title: t("error.restore"),
                description: t("error.restoreDescription"),
                icon: "i-ph-warning-fill",
                color: "error",
              })
            }
          },
        },
      ],
      duration: 5000,
    })
  } catch {
    toast.add({
      title: t("error.delete"),
      description: t("error.deleteDescription"),
      icon: "i-ph-warning-fill",
      color: "error",
    })
  }
}

// Recreate item based on type
const recreateItem = async (originalItem: any) => {
  switch (props.type) {
    case "entity":
      await memoryStore.createEntity({
        name: originalItem.name,
        type: originalItem.type,
        metadata: originalItem.metadata || undefined,
        createdByAssistantName:
          originalItem.createdByAssistantName || undefined,
        createdByAssistantType:
          originalItem.createdByAssistantType || undefined,
      })
      break
    case "observation":
      await memoryStore.createObservation({
        entityId: originalItem.entityId,
        content: originalItem.content,
        source: originalItem.source || undefined,
        metadata: originalItem.metadata || undefined,
        createdByAssistantName:
          originalItem.createdByAssistantName || undefined,
        createdByAssistantType:
          originalItem.createdByAssistantType || undefined,
      })
      break
    case "relation":
      await memoryStore.createRelation({
        subjectId: originalItem.subjectId,
        predicate: originalItem.predicate,
        objectId: originalItem.objectId,
        strength: originalItem.strength || undefined,
        metadata: originalItem.metadata || undefined,
        createdByAssistantName:
          originalItem.createdByAssistantName || undefined,
        createdByAssistantType:
          originalItem.createdByAssistantType || undefined,
      })
      break
  }
}
</script>

<i18n lang="yaml">
en:
  delete: Delete @:{type}
  confirmDelete: Confirm deleteting @:{type}
  entity: Entity
  observation: Observation
  relation: Relation
  undo: Undo
  unknown: Unknown
  deleted:
    entity:
      title: Entity Deleted
      description: "‘{name}’ has been deleted"
    observation:
      title: Observation Deleted
      description: "‘{name}’ has been deleted"
    relation:
      title: Relation Deleted
      description: "‘{name}’ has been deleted"
  restored:
    entity:
      title: Entity Restored
      description: "‘{name}’ has been restored"
    observation:
      title: Observation Restored
      description: "‘{name}’ has been restored"
    relation:
      title: Relation Restored
      description: "‘{name}’ has been restored"
  error:
    delete: Delete Failed
    deleteDescription: Failed to delete item
    restore: Restore Failed
    restoreDescription: Failed to restore item
</i18n>
