<template>
  <UModal
    v-model:open="isOpen"
    :title="t('memories.observations.create.title')"
    :description="t('memories.observations.create.description')"
  >
    <!-- The button that opens the modal -->
    <UButton
      v-bind="buttonProps"
      @click="isOpen = true"
    />

    <template #body>
      <!-- Form content -->
      <UForm
        id="observation-form"
        :schema="schema"
        :state="form"
        @submit="onSubmit"
      >
        <UFormField
          name="entityId"
          :label="t('memories.observations.create.fields.entity')"
          required
        >
          <USelectMenu
            v-model="form.entityId"
            :items="entityOptions"
            :placeholder="
              t('memories.observations.create.fields.entityPlaceholder')
            "
            value-key="value"
            :loading="entitiesPending"
            :searchable="true"
            :searchable-placeholder="
              t('memories.observations.create.fields.searchEntity')
            "
          />
        </UFormField>

        <UFormField
          name="content"
          :label="t('memories.observations.create.fields.content')"
          class="mt-4"
          required
        >
          <UTextarea
            v-model="form.content"
            :rows="4"
          />
        </UFormField>

        <UFormField
          name="metadata"
          :label="t('memories.observations.create.fields.metadata')"
          class="mt-4"
        >
          <UTextarea
            v-model="metadataText"
            :rows="4"
            :placeholder="
              t('memories.observations.create.fields.metadataPlaceholder')
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
          form="observation-form"
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
  icon?: string
  label?: string
  block?: boolean
  variant?: ButtonProps["variant"]
  color?: ButtonProps["color"]
  size?: ButtonProps["size"]
}

const props = withDefaults(defineProps<Props>(), {
  icon: "i-ph-plus",
  label: undefined,
  block: true,
  variant: "solid",
  color: "primary",
  size: "md",
})

const emit = defineEmits<{
  created: [observation: any]
}>()

const { t } = useI18n()
const { user } = useOidcAuth()

// Compute button props
const buttonProps = computed(() => ({
  ...props,
  label: props.label || t("memories.navigation.observations.create"),
  onCreated: undefined,
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
  entityId: z.string().min(1, "Entity is required"),
  content: z.string().min(1, "Content is required"),
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
        createdByUser: user.value?.userInfo?.sub,
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
      title: t("common.success"),
      description: t("memories.observations.create.success"),
      color: "success",
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: t("common.error"),
      description:
        error.data?.statusMessage || t("memories.observations.create.error"),
      color: "error",
    })
  } finally {
    loading.value = false
  }
}
</script>
