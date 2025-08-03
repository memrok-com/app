<template>
  <UForm
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
        v-model="state.name"
        autofocus
        :placeholder="t('fields.name.placeholder')"
      />
    </UFormField>

    <UFormField
      :label="t('fields.type.label')"
      name="type"
      required
    >
      <UInputMenu
        v-model="state.type"
        create-item
        :items="typeItems"
        :placeholder="t('fields.type.placeholder')"
        searchable
        @create="onCreateType"
      >
        <template #empty>
          <EmptyState :message="t('fields.type.empty')" />
        </template>
      </UInputMenu>
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

    <div class="flex justify-end gap-x-4 gap-y-3">
      <UButton
        class="!rounded-md"
        color="neutral"
        :label="t('buttons.cancel')"
        variant="ghost"
        @click="$emit('close')"
      />
      <UButton
        class="!rounded-md"
        :icon="!entity ? 'i-ph-plus' : 'i-ph-pencil-simple-fill'"
        :label="t(entity ? 'buttons.submit.update' : 'buttons.submit.insert')"
        :loading="isSubmitting"
        type="submit"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { EntityWithCounts } from '~/types/entities'

interface Props {
  entity?: EntityWithCounts | undefined
}

const props = withDefaults(defineProps<Props>(), {
  entity: undefined,
})

const emit = defineEmits<{
  close: []
}>()

const memoryStore = useMemoryStore()
const { t } = useI18n({ useScope: 'local' })
const toast = useToast()

// Form validation schema
const schema = z.object({
  name: z.string().min(1, t('fields.name.validation.required')),
  type: z.string().min(1, t('fields.type.validation.required')),
  metadata: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true
      try {
        JSON.parse(val)
        return true
      } catch {
        return false
      }
    }, t('fields.metadata.validation.invalidJson')),
})

// Form state
const state = reactive({
  name: props.entity?.name || '',
  type: props.entity?.type || '',
  metadata: props.entity?.metadata
    ? JSON.stringify(props.entity.metadata, null, 2)
    : '',
})

// Loading state
const isSubmitting = ref(false)

// Error state for inline display
const submitError = ref<string | null>(null)

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
  submitError.value = null // Clear previous errors

  try {
    // Parse metadata if provided
    let parsedMetadata = undefined
    if (state.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(state.metadata)
      } catch {
        throw new Error(t('validation.metadata.invalidJson'))
      }
    }

    const entityData = {
      name: state.name.trim(),
      type: state.type.trim(),
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    let result: EntityWithCounts

    if (props.entity) {
      result = await memoryStore.updateEntity(props.entity.id, entityData)
      toast.add({
        title: t('success.updated.title'),
        description: t('success.updated.description', {
          name: result.name,
          type: result.type,
        }),
        color: 'success',
        icon: 'i-ph-check-circle-fill',
      })
    } else {
      result = await memoryStore.createEntity(entityData)
      toast.add({
        title: t('success.inserted.title'),
        description: t('success.inserted.description', {
          name: result.name,
          type: result.type,
        }),
        color: 'success',
        icon: 'i-ph-check-circle-fill',
      })
    }

    emit('close')
  } catch (error) {
    console.error('Entity form submission error:', error)
    submitError.value = t(props.entity ? 'error.update' : 'error.insert')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  fields:
    name:
      label: Name
      placeholder: Enter entity name
      validation:
        required: Name is required
    type:
      label: Type
      placeholder: Select or create entity type
      empty: No types available yet
      validation:
        required: Type is required
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this entity
      placeholder: JSON
      validation:
        invalidJson: Metadata must be valid JSON format
  buttons:
    cancel: Cancel
    submit:
      insert: Insert Entity
      update: Update Entity
  success:
    inserted:
      title: Entity Inserted
      description: '{name} ({type}) has been successfully inserted.'
    updated:
      title: Entity Updated
      description: '{name} ({type}) has been successfully updated.'
  error:
    insert: Failed to create entity. Please check your input and try again.
    update: Failed to update entity. Please check your input and try again.
</i18n>
