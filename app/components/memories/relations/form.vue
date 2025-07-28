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
        :items="entityOptions"
        :placeholder="t('fields.subject.placeholder')"
        searchable
        v-model="selectedSubject"
      >
        <template #empty>
          <Empty :message="t('fields.subject.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.predicate.label')"
      name="predicate"
      required
    >
      <UInputMenu
        create-item
        :items="predicateItems"
        :placeholder="t('fields.predicate.placeholder')"
        searchable
        v-model="state.predicate"
        @create="onCreatePredicate"
      >
        <template #empty>
          <Empty :message="t('fields.predicate.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.object.label')"
      name="objectId"
      required
    >
      <UInputMenu
        :items="entityOptions"
        :placeholder="t('fields.object.placeholder')"
        searchable
        v-model="selectedObject"
      >
        <template #empty>
          <Empty :message="t('fields.object.empty')" />
        </template>
      </UInputMenu>
    </UFormField>

    <UFormField
      :label="t('fields.strength.label')"
      :description="t('fields.strength.description')"
      name="strength"
    >
      <USlider
        :min="0"
        :max="1"
        :step="0.1"
        tooltip
        v-model="state.strength"
      />
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
import type { RelationData } from "~/types/relations"

interface Props {
  mode?: "insert" | "update"
  relation?: RelationData
}

const props = withDefaults(defineProps<Props>(), {
  mode: "insert",
})

const emit = defineEmits<{
  close: []
  success: [relation: RelationData]
}>()

const memoryStore = useMemoryStore()
const { t } = useI18n({ useScope: "local" })
const toast = useToast()

// Form validation schema
const schema = z
  .object({
    subjectId: z.string().min(1, t("validation.subject.required")),
    predicate: z.string().min(1, t("validation.predicate.required")),
    objectId: z.string().min(1, t("validation.object.required")),
    strength: z.number().min(0).max(1).optional(),
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
  .refine((data) => data.subjectId !== data.objectId, {
    message: t("validation.sameEntity"),
    path: ["objectId"],
  })

// Form state
const state = reactive({
  subjectId: props.relation?.subjectId || "",
  predicate: props.relation?.predicate || "",
  objectId: props.relation?.objectId || "",
  strength: props.relation?.strength ?? 0.5,
  metadata: props.relation?.metadata
    ? JSON.stringify(props.relation.metadata, null, 2)
    : "",
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

// Selected entities for UInputMenu (needs object format)
const selectedSubject = computed({
  get: () => {
    const entity = memoryStore.entities.find((e) => e.id === state.subjectId)
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
    state.subjectId = newValue?.value || ""
  },
})

const selectedObject = computed({
  get: () => {
    const entity = memoryStore.entities.find((e) => e.id === state.objectId)
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
    state.objectId = newValue?.value || ""
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
      } catch (error) {
        throw new Error(t("validation.metadata.invalidJson"))
      }
    }

    const relationData = {
      subjectId: state.subjectId,
      predicate: state.predicate.trim(),
      objectId: state.objectId,
      strength: state.strength,
      ...(parsedMetadata && { metadata: parsedMetadata }),
    }

    let result: RelationData

    if (props.mode === "insert") {
      result = await memoryStore.createRelation(relationData)
      toast.add({
        title: t("forms.success.inserted.title"),
        description: t("forms.success.inserted.description"),
        color: "success",
        icon: "i-ph-check-circle",
      })
    } else if (props.relation) {
      result = await memoryStore.updateRelation(props.relation.id, {
        predicate: relationData.predicate,
        strength: relationData.strength,
        metadata: relationData.metadata,
      })
      toast.add({
        title: t("forms.success.updated.title"),
        description: t("forms.success.updated.description"),
        color: "success",
        icon: "i-ph-check-circle",
      })
    } else {
      throw new Error("Relation ID required for update mode")
    }

    emit("success", result)
    emit("close")
  } catch (error) {
    console.error("Relation form submission error:", error)
    submitError.value = t(`forms.error.${props.mode}`)
  } finally {
    isSubmitting.value = false
  }
}

// Watch for relation prop changes in update mode
watch(
  () => props.relation,
  (newRelation) => {
    if (newRelation && props.mode === "update") {
      state.subjectId = newRelation.subjectId
      state.predicate = newRelation.predicate
      state.objectId = newRelation.objectId
      state.strength = newRelation.strength ?? 0.5
      state.metadata = newRelation.metadata
        ? JSON.stringify(newRelation.metadata, null, 2)
        : ""
    }
  },
  { immediate: true }
)
</script>

<i18n lang="yaml">
en:
  fields:
    subject:
      label: Subject Entity
      placeholder: Select the subject of this relation
      empty: No entities available. Create entities first.
      validation:
        required: Subject entity is required
    predicate:
      label: Relationship Type
      placeholder: Select or create relationship type
      empty: No predicates available. Type to create.
      validation:
        required: Relationship type is required
    object:
      label: Object Entity
      placeholder: Select the object of this relation
      empty: No entities available. Create entities first.
      validation:
        required: Object entity is required
    strength:
      label: Relationship Strength
      description: How strong is this relationship? (0 = weak, 1 = strong)
    metadata:
      label: Metadata (JSON)
      description: Optional JSON metadata for this relation
      placeholder: JSON
      validation:
        invalidJson: Metadata must be valid JSON format
    entity:
      format: "{name} ({type})"
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
      description: The relationship has been successfully inserted.
    updated:
      title: Relation Updated
      description: The relationship has been successfully updated.
  error:
    insert: Failed to create relation. Please check your input and try again.
    update: Failed to update relation. Please check your input and try again.
</i18n>
