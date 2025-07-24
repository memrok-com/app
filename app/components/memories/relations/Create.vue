<template>
  <UModal
    v-model:open="isOpen"
    :title="t('memories.relations.create.title')"
    :description="t('memories.relations.create.description')"
  >
    <!-- The button that opens the modal -->
    <UButton
      v-bind="buttonProps"
      @click="isOpen = true"
    />

    <template #body>
      <!-- Form content -->
      <UForm
        id="relation-form"
        :schema="schema"
        :state="form"
        @submit="onSubmit"
        :validate-on="['change', 'input']"
      >
        <UFormField
          name="subjectId"
          :label="t('memories.relations.create.fields.subject')"
          required
        >
          <USelectMenu
            v-model="form.subjectId"
            :items="entityOptions"
            :placeholder="
              t('memories.relations.create.fields.subjectPlaceholder')
            "
            value-key="value"
            :loading="entitiesPending"
            :searchable="true"
            :searchable-placeholder="
              t('memories.relations.create.fields.searchEntity')
            "
          />
        </UFormField>

        <UFormField
          name="predicate"
          :label="t('memories.relations.create.fields.predicate')"
          :help="t('memories.relations.create.fields.predicateHelp')"
          class="mt-4"
          required
        >
          <UInputMenu
            v-model="form.predicate"
            v-model:open="predicateMenuOpen"
            :items="predicateItems"
            :placeholder="
              t('memories.relations.create.fields.predicatePlaceholder')
            "
            :loading="predicatesPending"
            create-item
            @create="onCreatePredicate"
            @focus="predicateMenuOpen = true"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="objectId"
          :label="t('memories.relations.create.fields.object')"
          class="mt-4"
          required
        >
          <USelectMenu
            v-model="form.objectId"
            :items="entityOptions"
            :placeholder="
              t('memories.relations.create.fields.objectPlaceholder')
            "
            value-key="value"
            :loading="entitiesPending"
            :searchable="true"
            :searchable-placeholder="
              t('memories.relations.create.fields.searchEntity')
            "
          />
        </UFormField>

        <UFormField
          name="strength"
          :label="t('memories.relations.create.fields.strength')"
          :help="t('memories.relations.create.fields.strengthHelp')"
          class="mt-4"
        >
          <div class="flex items-center gap-4">
            <USlider
              v-model="form.strength"
              :min="0"
              :max="1"
              :step="0.1"
              class="flex-1"
            />
            <span class="text-sm font-medium w-12 text-right">{{
              form.strength
            }}</span>
          </div>
        </UFormField>

        <UFormField
          name="metadata"
          :label="t('memories.relations.create.fields.metadata')"
          class="mt-4"
        >
          <UTextarea
            v-model="metadataText"
            :rows="4"
            :placeholder="
              t('memories.relations.create.fields.metadataPlaceholder')
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
          form="relation-form"
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
  created: [relation: any]
}>()

const { t } = useI18n()
const { user } = useOidcAuth()

// Compute button props
const buttonProps = computed(() => ({
  ...props,
  label: props.label || t("memories.navigation.relations.create"),
  onCreated: undefined,
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
  subjectId: z.string().min(1, "Subject entity is required"),
  predicate: z.string().min(1, "Predicate is required"),
  objectId: z.string().min(1, "Object entity is required"),
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

// Handle creation of new predicate
const onCreatePredicate = (newPredicate: string) => {
  // The new predicate will be automatically added to the form.predicate
  // We could add it to our local data, but it will be refreshed after form submission
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
        createdByUser: user.value?.userInfo?.sub,
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
      title: t("common.success"),
      description: t("memories.relations.create.success"),
      color: "success",
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: t("common.error"),
      description:
        error.data?.statusMessage || t("memories.relations.create.error"),
      color: "error",
    })
  } finally {
    loading.value = false
  }
}
</script>
