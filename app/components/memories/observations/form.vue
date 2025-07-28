<template>
  <UForm
    class="space-y-6"
    :state="state"
    :schema="schema"
    :validate-on="['change', 'input']"
    @submit="submit"
  >
    <UFormField
      :label="t('fields.entity.label')"
      name="entityId"
      required
    >
      <UInputMenu
        v-model="selectedEntity"
        :items="entityOptions"
        :placeholder="t('fields.entity.placeholder')"
        searchable
      >
        <template #empty>
          <Empty :message="t('fields.entity.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.content.label')"
      name="content"
      required
    >
      <UTextarea
        v-model="state.content"
        :placeholder="t('fields.content.placeholder')"
        :rows="4"
      />
    </UFormField>

    <UFormField
      :label="t('fields.source.label')"
      name="source"
    >
      <UInput
        v-model="state.source"
        :placeholder="t('fields.source.placeholder')"
      />
    </UFormField>

    <UFormField
      :label="t('fields.metadata.label')"
      :description="t('fields.metadata.description')"
      name="metadata"
    >
      <UTextarea
        v-model="state.metadata"
        :placeholder="t('fields.metadata.placeholder')"
        :rows="4"
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
import type { ObservationData } from "~/types/observations"

interface Props {
  mode?: "insert" | "update"
  observation?: ObservationData
}

const props = withDefaults(defineProps<Props>(), {
  mode: "insert",
})

const emit = defineEmits<{
  close: []
  success: [observation: ObservationData]
}>()

const memoryStore = useMemoryStore()
const { t } = useI18n({ useScope: "local" })

// Form validation schema
const schema = z.object({
  entityId: z.string().min(1, t("validation.entity.required")),
  content: z.string().min(1, t("validation.content.required")),
  source: z.string().optional(),
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
  entityId: props.observation?.entityId || "",
  content: props.observation?.content || "",
  source: props.observation?.source || "",
  metadata: props.observation?.metadata
    ? JSON.stringify(props.observation.metadata, null, 2)
    : "",
})

// Selected entity for UInputMenu (needs object format)
const selectedEntity = computed({
  get: () => {
    const entity = memoryStore.entities.find((e) => e.id === state.entityId)
    return entity
      ? {
          label: t("fields.entity.format", {
            name: entity.name,
            type: entity.type,
          }),
          value: entity.id,
        }
      : undefined
  },
  set: (newValue) => {
    state.entityId = newValue?.value || ""
  },
})

// Loading state
const isSubmitting = ref(false)

// Entity options for UInputMenu
const entityOptions = computed(() => {
  return memoryStore.entities.map((entity) => ({
    label: t("fields.entity.format", { name: entity.name, type: entity.type }),
    value: entity.id,
  }))
})

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

    const observationData = {
      entityId: state.entityId,
      content: state.content.trim(),
      ...(state.source.trim() && { source: state.source.trim() }),
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    let result: ObservationData

    if (props.mode === "insert") {
      result = await memoryStore.createObservation(observationData)
    } else if (props.observation) {
      result = await memoryStore.updateObservation(props.observation.id, {
        content: observationData.content,
        source: observationData.source,
        metadata: observationData.metadata,
      })
    } else {
      throw new Error("Observation ID required for update mode")
    }

    emit("success", result)
    emit("close")
  } catch (error) {
    console.error("Observation form submission error:", error)
    // Error handling is managed by the memory store
  } finally {
    isSubmitting.value = false
  }
}

// Watch for observation prop changes in update mode
watch(
  () => props.observation,
  (newObservation) => {
    if (newObservation && props.mode === "update") {
      state.entityId = newObservation.entityId
      state.content = newObservation.content
      state.source = newObservation.source || ""
      state.metadata = newObservation.metadata
        ? JSON.stringify(newObservation.metadata, null, 2)
        : ""
    }
  },
  { immediate: true }
)
</script>

<i18n lang="yaml">
en:
  fields:
    entity:
      label: Entity
      placeholder: Select entity for this observation
      empty: No entities available. Create an entity first.
      format: "{name} ({type})"
    content:
      label: Content
      placeholder: Describe what you observed about this entity
    source:
      label: Source
      placeholder: Optional source or reference
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this observation
      placeholder: JSON
  buttons:
    cancel: Cancel
    submit:
      insert: Insert Observation
      update: Update Observation
  validation:
    entity:
      required: Entity is required
    content:
      required: Content is required
    metadata:
      invalidJson: Metadata must be valid JSON format
</i18n>
