<template>
  <UForm
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

    <UAlert
      v-if="submitError"
      color="error"
      icon="i-ph-warning"
      :title="submitError"
      variant="subtle"
    />

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
const toast = useToast()

// Form validation schema
const schema = z.object({
  entityId: z.string().min(1, t("fields.entity.validation.required")),
  content: z.string().min(1, t("fields.content.validation.required")),
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
    }, t("fields.metadata.validation.invalidJson")),
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

// Error state for inline display
const submitError = ref<string | null>(null)

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
  submitError.value = null // Clear previous errors

  try {
    // Parse metadata if provided
    let parsedMetadata = undefined
    if (state.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(state.metadata)
      } catch (error) {
        throw new Error(t("fields.metadata.validation.invalidJson"))
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
      toast.add({
        title: t("success.inserted.title"),
        description: t("success.inserted.description"),
        color: "success",
        icon: "i-ph-check-circle",
      })
    } else if (props.observation) {
      result = await memoryStore.updateObservation(props.observation.id, {
        content: observationData.content,
        source: observationData.source,
        metadata: observationData.metadata,
      })
      toast.add({
        title: t("success.updated.title"),
        description: t("success.updated.description"),
        color: "success",
        icon: "i-ph-check-circle",
      })
    } else {
      throw new Error("Observation ID required for update mode")
    }

    emit("success", result)
    emit("close")
  } catch (error) {
    console.error("Observation form submission error:", error)
    submitError.value = t(`error.${props.mode}`)
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
      validation:
        required: Entity is required
    content:
      label: Content
      placeholder: Describe what you observed about this entity
      validation:
        required: Content is required
    source:
      label: Source
      placeholder: Optional source or reference
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this observation
      placeholder: JSON
      validation:
        invalidJson: Metadata must be valid JSON format
  buttons:
    cancel: Cancel
    submit:
      insert: Insert Observation
      update: Update Observation
  success:
    inserted:
      title: Observation Inserted
      description: Your observation has been successfully inserted.
    updated:
      title: Observation Updated
      description: Your observation has been successfully updated.
  error:
    insert: Failed to create observation. Please check your input and try again.
    update: Failed to update observation. Please check your input and try again.
</i18n>
