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
        id="entity-form"
        :schema="schema"
        :state="form"
        :validate-on="['change', 'input']"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('form.fields.name.label')"
          name="name"
          required
        >
          <UInput
            autofocus
            v-model="form.name"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.type.label')"
          :help="t('form.fields.type.help')"
          name="type"
          required
        >
          <UInputMenu
            create-item
            :items="typeItems"
            :placeholder="t('form.fields.type.placeholder')"
            @create="onCreateType"
            @focus="typeMenuOpen = true"
            v-model="form.type"
            v-model:open="typeMenuOpen"
          />
        </UFormField>
        <UFormField
          :label="t('form.fields.metadata.label')"
          name="metadata"
        >
          <UTextarea
            :placeholder="t('form.fields.metadata.placeholder')"
            :rows="4"
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
          form="entity-form"
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
  icon?: ButtonProps["icon"]
  label?: ButtonProps["label"]
  size?: ButtonProps["size"]
  variant?: ButtonProps["variant"]
}

const props = withDefaults(defineProps<Props>(), {
  block: true,
  color: "primary",
  icon: "i-ph-plus",
  label: undefined, // Will use translation if not provided
  size: "md",
  variant: "solid",
})

const emit = defineEmits<{
  created: [entity: any]
}>()

const { t } = useI18n()

// Compute button props, using defaults from props and allowing overrides
const buttonProps = computed(() => ({
  block: props.block,
  color: props.color,
  icon: props.icon,
  label: props.label || t("title"),
  size: props.size,
  variant: props.variant,
}))

// Form state
const isOpen = ref(false)
const loading = ref(false)
const form = reactive({
  name: "",
  type: "",
  metadata: null as any,
})

const metadataText = ref("")

// Type menu open state
const typeMenuOpen = ref(false)

// Form type
type FormData = {
  name: string
  type: string
}

// Validation schema
const schema = z.object({
  name: z.string().min(1, t("form.fields.name.error")),
  type: z.string().min(1, t("form.fields.type.error")),
})

// Data ref for types
const typesData = ref<{ types: any[] } | null>(null)

// Entity type items for UInputMenu
const typeItems = computed(() => {
  // Default types
  const defaultTypes = [
    t("form.fields.type.defaults.person"),
    t("form.fields.type.defaults.group"),
    t("form.fields.type.defaults.place"),
    t("form.fields.type.defaults.event"),
  ]

  // Get existing types from API
  const existing = typesData.value?.types || []

  // Merge existing and default types
  const typeSet = new Set(defaultTypes)

  // Add existing types
  existing.forEach((t: any) => {
    typeSet.add(t.type)
  })

  return Array.from(typeSet).sort()
})

// Refresh function for types
const refreshTypes = async () => {
  try {
    typesData.value = await $fetch("/api/entities/types")
  } catch (error) {
    console.error("Failed to fetch entity types:", error)
  }
}

// Load types on component mount
onMounted(() => {
  refreshTypes()
})

// Handle creation of new type
const onCreateType = (newType: string) => {
  // Set the form type to the new type
  form.type = newType
  // Close the menu
  typeMenuOpen.value = false
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
    const response = await $fetch("/api/entities", {
      method: "POST",
      body: {
        name: event.data.name,
        type: event.data.type,
        metadata: form.metadata,
      },
    })

    // Reset form
    form.name = ""
    form.type = ""
    form.metadata = null
    metadataText.value = ""

    // Close modal normally (allow validation)
    isOpen.value = false

    // Refresh types
    await refreshTypes()

    // Emit created event
    emit("created", response.entity)

    // Show success notification
    const toast = useToast()
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: t("form.success.title"),
      description: t("form.success.description"),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: "error",
      icon: "i-ph-warning-fill",
      title: t("form.error.title"),
      description: error.data?.statusMessage || t("form.error.description"),
    })
  } finally {
    loading.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  title: Create Entity
  description: Create a new memory entity.
  form:
    fields:
      name:
        label: Name
        error: Name is required
      type:
        label: Type
        help: Select an existing type or enter a new one.
        placeholder: Select or create a type
        defaults:
          person: person
          group: group
          place: place
          event: event
        error: Type is required
      metadata:
        label: Metadata
        placeholder: Optional metadata in JSON format
    buttons:
      cancel: Cancel
      create: Create
    success:
      title: Entity Created
      description: Your entity has been successfully added.
    error:
      title: Error Creating Entity
      description: An error occurred while creating the entity.
</i18n>
