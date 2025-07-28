<template>
  <UForm
    class="space-y-6"
    :schema="schema"
    :state="state"
    :validate-on="['change', 'input']"
    @submit="submit"
  >
    <UFormField
      :label="t('fields.name.label')"
      name="name"
      required
    >
      <UInput
        autofocus
        :placeholder="t('fields.name.placeholder')"
        v-model="state.name"
      />
    </UFormField>

    <UFormField
      :label="t('fields.type.label')"
      name="type"
      required
    >
      <UInputMenu
        create-item
        :items="typeItems"
        :placeholder="t('fields.type.placeholder')"
        searchable
        v-model="state.type"
        @create="onCreateType"
      >
        <template #empty>
          <Empty :message="t('fields.type.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.metadata.label')"
      :description="t('fields.metadata.description')"
      name="metadata"
    >
      <UTextarea
        :placeholder="t('fields.metadata.placeholder')"
        :rows="4"
        v-model="state.metadata"
      />
    </UFormField>

    <div class="flex justify-end gap-x-4 gap-y-3 pt-4">
      <UButton
        color="neutral"
        :label="t('buttons.cancel')"
        variant="ghost"
        @click="$emit('close')"
      />
      <UButton
        :icon="mode === 'insert' ? 'i-ph-plus' : 'i-ph-pencil-simple'"
        :label="t(`buttons.submit.${mode}`)"
        :loading="isSubmitting"
        type="submit"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from "zod"
import type { EntityWithCounts } from "~/types/entities"

interface Props {
  mode?: "insert" | "update"
  entity?: EntityWithCounts
}

const props = withDefaults(defineProps<Props>(), {
  mode: "insert",
})

const emit = defineEmits<{
  close: []
  success: [entity: EntityWithCounts]
}>()

const memoryStore = useMemoryStore()
const { t } = useI18n({ useScope: "local" })

// Form validation schema
const schema = z.object({
  name: z
    .string()
    .min(1, t("validation.name.required")),
  type: z
    .string()
    .min(1, t("validation.type.required")),
  metadata: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true
      try {
        JSON.parse(val)
        return true
      } catch {
        return false
      }
    }, t("validation.metadata.invalidJson")),
})

// Form state
const state = reactive({
  name: props.entity?.name || "",
  type: props.entity?.type || "",
  metadata: props.entity?.metadata
    ? JSON.stringify(props.entity.metadata, null, 2)
    : "",
})

// Loading state
const isSubmitting = ref(false)

// Type items for UInputMenu
const typeItems = ref<string[]>([])

// Initialize typeItems with existing types from store
watch(
  () => memoryStore.statistics.entityTypes,
  (existingTypes) => {
    typeItems.value = [...existingTypes]
  },
  { immediate: true }
)

// Handle creating new type
const onCreateType = (newType: string) => {
  if (!typeItems.value.includes(newType)) {
    typeItems.value.push(newType)
  }
  state.type = newType
}

// Form submission handler
const submit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    // Parse metadata if provided
    let parsedMetadata = undefined
    if (state.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(state.metadata)
      } catch (error) {
        throw new Error(t("validation.metadata.invalidJson"))
      }
    }

    const entityData = {
      name: state.name.trim(),
      type: state.type.trim(),
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    let result: EntityWithCounts

    if (props.mode === "insert") {
      result = await memoryStore.createEntity(entityData)
    } else if (props.entity) {
      result = await memoryStore.updateEntity(props.entity.id, entityData)
    } else {
      throw new Error("Entity ID required for update mode")
    }

    emit("success", result)
    emit("close")
  } catch (error) {
    console.error("Entity form submission error:", error)
    // Error handling is managed by the memory store
  } finally {
    isSubmitting.value = false
  }
}

// Watch for entity prop changes in update mode
watch(
  () => props.entity,
  (newEntity) => {
    if (newEntity && props.mode === "update") {
      state.name = newEntity.name
      state.type = newEntity.type
      state.metadata = newEntity.metadata
        ? JSON.stringify(newEntity.metadata, null, 2)
        : ""
    }
  },
  { immediate: true }
)
</script>

<i18n lang="yaml">
en:
  fields:
    name:
      label: Name
      placeholder: Enter entity name
    type:
      label: Type
      placeholder: Select or create entity type
      empty: No types available for selection
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this entity
      placeholder: JSON
  buttons:
    cancel: Cancel
    submit:
      insert: Insert Entity
      update: Update Entity
  validation:
    name:
      required: Name is required
    type:
      required: Type is required
    metadata:
      invalidJson: Metadata must be valid JSON format
</i18n>
