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
          <EmptyState :message="t('fields.entity.empty')" />
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
      icon="i-ph-warning-fill"
      :title="submitError"
      variant="subtle"
    />

    <div class="flex justify-end gap-x-4 gap-y-3 pt-4">
      <UButton
        class="!rounded-md"
        color="neutral"
        :label="t('buttons.cancel')"
        variant="ghost"
        @click="$emit('close')"
      />
      <UButton
        class="!rounded-md"
        :icon="observation ? 'i-ph-pencil-simple-fill' : 'i-ph-plus'"
        :label="
          t(observation ? 'buttons.submit.update' : 'buttons.submit.insert')
        "
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
  observation?: ObservationData | undefined
  entityId?: string
}

const props = withDefaults(defineProps<Props>(), {
  observation: undefined,
  entityId: undefined,
})

const emit = defineEmits<{
  close: []
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
  entityId: props.observation?.entityId || props.entityId || "",
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
      } catch {
        throw new Error(t("fields.metadata.validation.invalidJson"))
      }
    }

    const observationData = {
      entityId: state.entityId,
      content: state.content.trim(),
      ...(state.source.trim() && { source: state.source.trim() }),
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    if (props.observation) {
      await memoryStore.updateObservation(props.observation.id, {
        content: observationData.content,
        source: observationData.source,
        metadata: observationData.metadata,
      })
      toast.add({
        title: t("success.updated.title"),
        description: t("success.updated.description"),
        color: "success",
        icon: "i-ph-check-circle-fill",
      })
    } else {
      await memoryStore.createObservation(observationData)
      toast.add({
        title: t("success.inserted.title"),
        description: t("success.inserted.description"),
        color: "success",
        icon: "i-ph-check-circle-fill",
      })
    }

    emit("close")
  } catch (error) {
    console.error("Observation form submission error:", error)
    submitError.value = t(props.observation ? "error.update" : "error.insert")
  } finally {
    isSubmitting.value = false
  }
}
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
