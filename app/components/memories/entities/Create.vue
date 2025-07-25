<template>
  <UModal
    v-model:open="isOpen"
    :title="t('memories.entities.create.title')"
    :description="t('memories.entities.create.description')"
  >
    <!-- The button that opens the modal -->
    <UButton
      v-bind="buttonProps"
      @click="isOpen = true"
    />

    <template #body>
      <!-- Form content -->
      <UForm
        id="entity-form"
        :schema="schema"
        :state="form"
        @submit="onSubmit"
        :validate-on="['change', 'input']"
      >
        <UFormField
          name="name"
          :label="t('memories.entities.create.fields.name')"
          required
        >
          <UInput
            v-model="form.name"
            autofocus
          />
        </UFormField>

        <UFormField
          name="type"
          :label="t('memories.entities.create.fields.type')"
          :help="t('memories.entities.create.fields.typeHelp')"
          class="mt-4"
          required
        >
          <UInputMenu
            v-model="form.type"
            v-model:open="typeMenuOpen"
            :items="typeItems"
            :placeholder="t('memories.entities.create.fields.typePlaceholder')"
            create-item
            @create="onCreateType"
            @focus="typeMenuOpen = true"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="metadata"
          :label="t('memories.entities.create.fields.metadata')"
          class="mt-4"
        >
          <UTextarea
            v-model="metadataText"
            :rows="4"
            :placeholder="
              t('memories.entities.create.fields.metadataPlaceholder')
            "
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end gap-3 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.cancel')"
          @click="handleModalClose"
        />
        <UButton
          type="submit"
          form="entity-form"
          :loading="loading"
          :label="t('common.create')"
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
  // Default button props if not provided
  icon?: string
  label?: string
  block?: boolean
  variant?: ButtonProps["variant"]
  color?: ButtonProps["color"]
  size?: ButtonProps["size"]
}

const props = withDefaults(defineProps<Props>(), {
  icon: "i-ph-plus",
  label: undefined, // Will use translation if not provided
  block: true,
  variant: "solid",
  color: "primary",
  size: "md",
})

const emit = defineEmits<{
  created: [entity: any]
}>()

const { t } = useI18n()
const { user } = useOidcAuth()

// Compute button props, using defaults from props and allowing overrides
const buttonProps = computed(() => ({
  ...props,
  label: props.label || t("memories.navigation.entities.create"),
  // Remove non-button props
  onCreated: undefined,
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
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
})

// Data ref for types
const typesData = ref<{ types: any[] } | null>(null)

// Entity type items for UInputMenu
const typeItems = computed(() => {
  // Default types
  const defaultTypes = [
    "person",
    "place",
    "event",
    "concept",
    "project",
    "organization",
    "tool",
    "document",
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

// Handle modal closing
const handleModalClose = () => {
  // Reset form when closing
  form.name = ""
  form.type = ""
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
      title: t("common.success"),
      description: t("memories.entities.create.success"),
      color: "success",
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: t("common.error"),
      description:
        error.data?.statusMessage || t("memories.entities.create.error"),
      color: "error",
    })
  } finally {
    loading.value = false
  }
}
</script>
