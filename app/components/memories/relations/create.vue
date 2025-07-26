<template>
  <UModal
    :title="t('title')"
    :description="t('description')"
    v-model:open="isOpen"
  >
    <UButton
      @click="isOpen = true"
      v-bind="buttonProps"
    />
    <template #body>
      <UForm
        id="relation-form"
        :schema="schema"
        :state="form"
        :validate-on="['change', 'input']"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('form.fields.subject.label')"
          name="subjectId"
          required
        >
          <USelectMenu
            :items="entityOptions"
            :loading="entitiesPending"
            :placeholder="t('form.fields.subject.placeholder')"
            :searchable="true"
            :searchable-placeholder="t('form.fields.subject.search')"
            value-key="value"
            v-model="form.subjectId"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.predicate.label')"
          name="predicate"
          :help="t('form.fields.predicate.help')"
          required
        >
          <UInputMenu
            create-item
            :items="predicateItems"
            :loading="predicatesPending"
            :placeholder="t('form.fields.predicate.placeholder')"
            @create="onCreatePredicate"
            @focus="predicateMenuOpen = true"
            v-model="form.predicate"
            v-model:open="predicateMenuOpen"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.object.label')"
          name="objectId"
          required
        >
          <USelectMenu
            :items="entityOptions"
            :placeholder="t('form.fields.object.placeholder')"
            :loading="entitiesPending"
            :searchable="true"
            :searchable-placeholder="t('form.fields.object.search')"
            value-key="value"
            v-model="form.objectId"
          />
        </UFormField>
        <UFormField
          :help="t('form.fields.strength.help')"
          :label="t('form.fields.strength.label')"
          name="strength"
        >
          <USlider
            color="neutral"
            :min="0"
            :max="1"
            :step="0.1"
            tooltip
            v-model="form.strength"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.metadata.label')"
          name="metadata"
        >
          <UTextarea
            :rows="4"
            :placeholder="t('form.fields.metadata.placeholder')"
            v-model="metadataText"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3 w-full">
        <UButton
          color="neutral"
          :label="t('form.buttons.cancel')"
          variant="ghost"
          @click="close"
        />
        <UButton
          form="relation-form"
          :label="t('form.buttons.create')"
          :loading="loading"
          type="submit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"
import type { FormSubmitEvent } from "#ui/types"
import { z } from "zod"

// Props that match UButton props
interface Props extends /* @vue-ignore */ Partial<ButtonProps> {
  block?: ButtonProps["block"]
  color?: ButtonProps["color"]
  disabled?: ButtonProps["disabled"]
  icon?: ButtonProps["icon"]
  label?: ButtonProps["label"]
  size?: ButtonProps["size"]
  variant?: ButtonProps["variant"]
}

const props = withDefaults(defineProps<Props>(), {
  block: true,
  color: "primary",
  disabled: false,
  icon: "i-ph-plus",
  label: undefined,
  size: "xl",
  variant: "solid",
})

const emit = defineEmits<{
  created: [relation: any]
}>()

const { t } = useI18n()

// Compute button props
const buttonProps = computed(() => ({
  block: props.block,
  color: props.color,
  disabled: props.disabled,
  icon: props.icon,
  label: props.label || t("title"),
  size: props.size,
  variant: props.variant,
}))

// Form state
const isOpen = ref(false)
const loading = ref(false)
const form = reactive({
  subjectId: "",
  predicate: "",
  objectId: "",
  strength: 1.0,
  metadata: null as any,
})
const metadataText = ref("")
// Predicate menu open state
const predicateMenuOpen = ref(false)

// Form type
type FormData = {
  subjectId: string
  predicate: string
  objectId: string
  strength: number
}

// Validation schema
const schema = z.object({
  subjectId: z.string().min(1, t("form.fields.subject.error")),
  predicate: z.string().min(1, t("form.fields.predicate.error")),
  objectId: z.string().min(1, t("form.fields.object.error")),
  strength: z.number().min(0).max(1),
})

// Data refs for entities and predicates
const entitiesData = ref<{ entities: any[] } | null>(null)
const predicatesData = ref<{ predicates: any[] } | null>(null)
const entitiesPending = ref(false)
const predicatesPending = ref(false)

// Fetch entities for selection
const entityOptions = computed(() => {
  if (!entitiesData.value?.entities) return []
  return entitiesData.value.entities.map((entity: any) => ({
    value: entity.id,
    label: `${entity.name} (${entity.type})`,
    name: entity.name,
    type: entity.type,
  }))
})

// Predicate items for UInputMenu
const predicateItems = computed(() => {
  if (!predicatesData.value?.predicates) return []
  // Return just the predicate names as items
  return predicatesData.value.predicates.map((p: any) => p.predicate).sort()
})

// Refresh functions
const refreshEntities = async () => {
  entitiesPending.value = true
  try {
    entitiesData.value = await $fetch("/api/entities")
  } catch (error) {
    console.error("Failed to fetch entities:", error)
  } finally {
    entitiesPending.value = false
  }
}

const refreshPredicates = async () => {
  predicatesPending.value = true
  try {
    predicatesData.value = await $fetch("/api/relations/predicates")
  } catch (error) {
    console.error("Failed to fetch predicates:", error)
  } finally {
    predicatesPending.value = false
  }
}

// Load data on component mount
onMounted(() => {
  refreshEntities()
  refreshPredicates()
})

// Expose methods for parent component
defineExpose({
  refreshEntities,
})

// Handle creation of new predicate
const onCreatePredicate = (newPredicate: string) => {
  // Set the form predicate to the new predicate
  form.predicate = newPredicate
  // Close the menu
  predicateMenuOpen.value = false
}

// Handle modal closing
const handleModalClose = () => {
  // Reset form when closing
  form.subjectId = ""
  form.predicate = ""
  form.objectId = ""
  form.strength = 1.0
  form.metadata = null
  metadataText.value = ""
  // Close modal
  isOpen.value = false
}

// Watch metadata text and parse JSON
watch(metadataText, (value) => {
  if (!value.trim()) {
    form.metadata = null
    return
  }

  try {
    form.metadata = JSON.parse(value)
  } catch {
    form.metadata = null
  }
})

// Submit handler
async function onSubmit(event: FormSubmitEvent<FormData>) {
  loading.value = true

  try {
    const response = await $fetch("/api/relations", {
      method: "POST",
      body: {
        subjectId: event.data.subjectId,
        objectId: event.data.objectId,
        predicate: event.data.predicate,
        strength: event.data.strength,
        metadata: form.metadata,
      },
    })

    // Reset form
    form.subjectId = ""
    form.predicate = ""
    form.objectId = ""
    form.strength = 1.0
    form.metadata = null
    metadataText.value = ""

    // Close modal normally (allow validation)
    isOpen.value = false

    // Refresh data to include new predicate
    await refreshPredicates()

    // Emit created event
    emit("created", response.relation)

    // Show success notification
    const toast = useToast()
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: t("success.title"),
      description: t("success.description"),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: "error",
      icon: "i-ph-warning-fill",
      title: t("error.title"),
      description: error.data?.statusMessage || t("error.description"),
    })
  } finally {
    loading.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  title: Create Relation
  description: Create a new relation between entities
  form:
    fields:
      subject:
        label: Subject Entity
        placeholder: Select or search for subject entity
        search: Search subject entities…
        error: Subject entity is required
      predicate:
        label: Predicate
        placeholder: Select or create predicate
        help: The type of relation between the subject and object
        error: Predicate is required
      object:
        label: Object Entity
        placeholder: Select or search for object entity
        search: Search object entities…
        error: Object entity is required
      strength:
        label: Strength
        help: Strength of the relation (0-1)
      metadata:
        label: Metadata (JSON)
        placeholder: Optional metadata in JSON format
    buttons:
      cancel: Cancel
      create: Create Relation
  success:
    title: Relation Created Successfully
    description: Your relation has been successfully added.
  error:
    title: Error Creating Relation
    description: An error occurred while creating the relation.
</i18n>
