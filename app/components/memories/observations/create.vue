<template>
  <UModal
    v-model:open="isOpen"
    :title="t('title')"
    :description="t('description')"
  >
    <UButton
      v-bind="buttonProps"
      @click="isOpen = true"
    />
    <template #body>
      <UForm
        id="observation-form"
        :schema="schema"
        :state="form"
        :validate-on="['change', 'input']"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('form.fields.entity.label')"
          name="entityId"
          required
        >
          <USelectMenu
            :items="entityOptions"
            :loading="entitiesPending"
            :placeholder="t('form.fields.entity.placeholder')"
            :searchable="true"
            :searchable-placeholder="t('form.fields.entity.search')"
            value-key="value"
            v-model="form.entityId"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.content.label')"
          name="content"
          required
        >
          <UTextarea
            v-model="form.content"
            :rows="4"
          />
        </UFormField>
        <UFormField
          name="metadata"
          :label="t('form.fields.metadata.label')"
        >
          <UTextarea
            v-model="metadataText"
            :rows="4"
            :placeholder="t('form.fields.metadata.placeholder')"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('form.buttons.cancel')"
          @click="handleModalClose"
        />
        <UButton
          type="submit"
          form="observation-form"
          :loading="loading"
          :label="t('form.buttons.create')"
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
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
}

const props = withDefaults(defineProps<Props>(), {
  block: true,
  color: "primary",
  disabled: false,
  icon: "i-ph-plus",
  label: undefined,
  variant: "solid",
  size: "md",
})

const emit = defineEmits<{
  created: [observation: any]
}>()

const { t } = useI18n()
const { user } = useOidcAuth()

// Compute button props
const buttonProps = computed(() => ({
  block: props.block,
  color: props.color,
  disabled: props.disabled,
  icon: props.icon,
  label: props.label || t("form.buttons.create"),
  variant: props.variant,
  size: props.size,
}))

// Form state
const isOpen = ref(false)
const loading = ref(false)
const form = reactive({
  entityId: "",
  content: "",
  metadata: null as any,
})
const metadataText = ref("")

// Form type
type FormData = {
  entityId: string
  content: string
}

// Validation schema
const schema = z.object({
  entityId: z.string().min(1, t("form.fields.entity.error")),
  content: z.string().min(1, t("form.fields.content.error")),
})

// Data refs for entities
const entitiesData = ref<{ entities: any[] } | null>(null)
const entitiesPending = ref(false)

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

// Refresh function
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

// Load data on component mount
onMounted(() => {
  refreshEntities()
})

// Expose methods for parent component
defineExpose({
  refreshEntities,
})

// Handle modal closing
const handleModalClose = () => {
  // Reset form when closing
  form.entityId = ""
  form.content = ""
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
    const response = await $fetch("/api/observations", {
      method: "POST",
      body: {
        entityId: event.data.entityId,
        content: event.data.content,
        source: "User",
        metadata: form.metadata,
      },
    })

    // Reset form
    form.entityId = ""
    form.content = ""
    form.metadata = null
    metadataText.value = ""

    // Close modal normally (allow validation)
    isOpen.value = false

    // Refresh entities data
    await refreshEntities()

    // Emit created event
    emit("created", response.observation)

    // Show success notification
    const toast = useToast()
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: t("common.success"),
      description: t("success"),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: "error",
      icon: "i-ph-warning-fill",
      title: t("common.error"),
      description: error.data?.statusMessage || t("error"),
    })
  } finally {
    loading.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  title: Create Observation
  description: Add a new observation to your memory.
  form:
    fields:
      entity:
        label: Entity
        placeholder: Select an entity
        search: Search entities…
        error: Entity is required.
      content:
        label: Content
        error: Content is required.
      metadata:
        label: Metadata
        placeholder: Optional metadata in JSON format
    buttons:
      cancel: Cancel
      create: Create Observation
    success:
      title: Observation Created
      description: Your observation has been successfully added.
    error:
      title: Error Creating Observation
      description: An error occurred while creating the observation.
</i18n>
