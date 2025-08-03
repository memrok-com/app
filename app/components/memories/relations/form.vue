<template>
  <UForm
    :schema="schema"
    :state="state"
    :validate-on="['change', 'input']"
    @submit="submit"
  >
    <UFormField
      :label="t('fields.subject.label')"
      name="subjectId"
      required
    >
      <UInputMenu
        v-model="selectedSubject"
        :items="entityOptions"
        :placeholder="t('fields.subject.placeholder')"
        searchable
      >
        <template #empty>
          <EmptyState :message="t('fields.subject.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.predicate.label')"
      name="predicate"
      required
    >
      <template #help>
        <i18n-t keypath="fields.predicate.help">
          <template #work>
            <UBadge
              class="!rounded-md"
              color="neutral"
              :label="t('fields.predicate.helpExamples.work')"
              variant="soft"
            />
          </template>
          <template #love>
            <UBadge
              class="!rounded-md"
              color="neutral"
              :label="t('fields.predicate.helpExamples.love')"
              variant="soft"
            />
          </template>
          <template #travel>
            <UBadge
              class="!rounded-md"
              color="neutral"
              :label="t('fields.predicate.helpExamples.travel')"
              variant="soft"
            />
          </template>
        </i18n-t>
      </template>
      <UInputMenu
        v-model="state.predicate"
        create-item
        :items="predicateItems"
        :placeholder="t('fields.predicate.placeholder')"
        searchable
        @create="onCreatePredicate"
      >
        <template #empty>
          <EmptyState :message="t('fields.predicate.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.object.label')"
      name="objectId"
      required
    >
      <UInputMenu
        v-model="selectedObject"
        :items="entityOptions"
        :placeholder="t('fields.object.placeholder')"
        searchable
      >
        <template #empty>
          <EmptyState :message="t('fields.object.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.strength.label')"
      :description="t('fields.strength.description')"
      name="strength"
    >
      <USlider
        v-model="state.strength"
        :min="0"
        :max="1"
        :step="0.1"
        tooltip
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
        :icon="relation ? 'i-ph-pencil-simple-fill' : 'i-ph-plus'"
        :label="t(relation ? 'buttons.submit.update' : 'buttons.submit.insert')"
        :loading="isSubmitting"
        type="submit"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { RelationData } from '~/types/relations'

interface Props {
  subjectId?: string
  relation?: RelationData | undefined
}

const props = withDefaults(defineProps<Props>(), {
  subjectId: undefined,
  relation: undefined,
})

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const memoryStore = useMemoryStore()

// Form validation schema
const schema = z
  .object({
    subjectId: z.string().min(1, t('fields.subject.validation.required')),
    predicate: z.string().min(1, t('fields.predicate.validation.required')),
    objectId: z.string().min(1, t('fields.object.validation.required')),
    strength: z.number().min(0).max(1).optional(),
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
  .refine((data) => data.subjectId !== data.objectId, {
    message: t('validation.sameEntity'),
    path: ['objectId'],
  })

// Form state
const state = reactive({
  subjectId: props.relation?.subjectId || props.subjectId || '',
  predicate: props.relation?.predicate || '',
  objectId: props.relation?.objectId || '',
  strength: props.relation?.strength ?? 0.5,
  metadata: props.relation?.metadata
    ? JSON.stringify(props.relation.metadata, null, 2)
    : '',
})

// Loading state
const isSubmitting = ref(false)

// Error state for inline display
const submitError = ref<string | null>(null)

// Entity options for UInputMenu
const entityOptions = computed(() => {
  return memoryStore.entities.map((entity) => ({
    label: t('fields.entity.format', { name: entity.name, type: entity.type }),
    value: entity.id,
  }))
})

// Selected entities for UInputMenu (needs object format)
const selectedSubject = computed({
  get: () => {
    const entity = memoryStore.entities.find((e) => e.id === state.subjectId)
    return entity
      ? {
          label: t('fields.entity.format', {
            name: entity.name,
            type: entity.type,
          }),
          value: entity.id,
        }
      : undefined
  },
  set: (newValue) => {
    state.subjectId = newValue?.value || ''
  },
})

const selectedObject = computed({
  get: () => {
    const entity = memoryStore.entities.find((e) => e.id === state.objectId)
    return entity
      ? {
          label: t('fields.entity.format', {
            name: entity.name,
            type: entity.type,
          }),
          value: entity.id,
        }
      : undefined
  },
  set: (newValue) => {
    state.objectId = newValue?.value || ''
  },
})

// Predicate items for UInputMenu
const predicateItems = ref<string[]>([])

// Initialize predicateItems with existing predicates from store
watch(
  () => memoryStore.statistics.predicates,
  (existingPredicates) => {
    predicateItems.value = [...existingPredicates]
  },
  { immediate: true }
)

// Handle creating new predicate
const onCreatePredicate = (newPredicate: string) => {
  if (!predicateItems.value.includes(newPredicate)) {
    predicateItems.value.push(newPredicate)
  }
  state.predicate = newPredicate
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
        throw new Error(t('fields.metadata.validation.invalidJson'))
      }
    }

    const relationData = {
      subjectId: state.subjectId,
      predicate: state.predicate.trim(),
      objectId: state.objectId,
      strength: state.strength,
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    if (props.relation) {
      await memoryStore.updateRelation(props.relation.id, {
        predicate: relationData.predicate,
        strength: relationData.strength,
        metadata: relationData.metadata,
      })
      toast.add({
        title: t('success.updated.title'),
        description: t('success.updated.description'),
        color: 'success',
        icon: 'i-ph-check-circle-fill',
      })
    } else {
      await memoryStore.createRelation(relationData)
      toast.add({
        title: t('success.inserted.title'),
        description: t('success.inserted.description'),
        color: 'success',
        icon: 'i-ph-check-circle-fill',
      })
    }

    emit('close')
  } catch (error) {
    console.error('Relation form submission error:', error)
    submitError.value = t(props.relation ? 'error.update' : 'error.insert')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  fields:
    subject:
      label: Subject
      placeholder: Select the subject of this relation
      empty: No entities available. Create entities first.
      validation:
        required: Subject entity is required
    predicate:
      label: Relation
      placeholder: Select or create relation type
      help: 'Examples: {work} {love} {travel}'
      helpExamples:
        work: works at
        love: is in love with
        travel: has traveled to
      empty: No predicates available. Type to create.
      validation:
        required: Relation is required
    object:
      label: Object
      placeholder: Select the object of this relation
      empty: No entities available. Create entities first.
      validation:
        required: Object entity is required
    strength:
      label: Relationship Strength
      description: How strong is this relation? (0 = weak, 1 = strong)
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this relation
      placeholder: JSON
      validation:
        invalidJson: Metadata must be valid JSON format
    entity:
      format: '{name} ({type})'
  buttons:
    cancel: Cancel
    submit:
      insert: Insert Relation
      update: Update Relation
  validation:
    sameEntity: Subject and object must be different entities
  success:
    inserted:
      title: Relation Inserted
      description: The relation has been successfully inserted.
    updated:
      title: Relation Updated
      description: The relation has been successfully updated.
  error:
    insert: Failed to create relation. Please check your input and try again.
    update: Failed to update relation. Please check your input and try again.
</i18n>
