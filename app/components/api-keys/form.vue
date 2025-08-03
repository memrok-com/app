<template>
  <!-- Show key display after successful creation -->
  <div v-if="createdKey">
    <ApiKeysKeyDisplay
      :api-key-id="createdKey.id"
      :api-key-secret="createdKey.secret"
      :inline="true"
      @close="emit('close')"
    />
  </div>

  <!-- Show form for key creation -->
  <UForm
    v-else
    ref="form"
    :schema="schema"
    :state="formData"
    :validate-on="['change', 'input']"
    @submit="onSubmit"
  >
    <div class="space-y-4">
      <UFormField
        name="name"
        :label="t('form.name.label')"
        :description="t('form.name.description')"
        required
      >
        <UInput
          v-model="formData.name"
          autofocus
          :placeholder="t('form.name.placeholder')"
          autocomplete="off"
        />
      </UFormField>

      <UFormField
        name="description"
        :label="t('form.description.label')"
        :description="t('form.description.description')"
      >
        <UTextarea
          v-model="formData.description"
          :placeholder="t('form.description.placeholder')"
          :rows="2"
        />
      </UFormField>

      <UFormField
        name="scopes"
        :label="t('form.scopes.label')"
        :description="t('form.scopes.description')"
        required
      >
        <UCheckboxGroup
          v-model="formData.scopes"
          :items="availableScopes"
        />
      </UFormField>

      <UFormField
        name="expiresAt"
        :label="t('form.expiresAt.label')"
        :description="t('form.expiresAt.description')"
      >
        <UInput
          v-model="formData.expiresAt"
          type="date"
          :min="minDate"
        />
      </UFormField>
    </div>
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
        variant="ghost"
        :label="t('buttons.cancel')"
        @click="emit('close')"
      />
      <UButton
        class="!rounded-md"
        icon="i-ph-plus"
        :label="t('buttons.create')"
        :loading="isSubmitting"
        type="submit"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { CreateApiKeyRequest } from '~/types/api-keys'

const { t } = useI18n({ useScope: 'local' })
const store = useApiKeysStore()
const toast = useToast()

const emit = defineEmits<{
  close: []
}>()

// Form management
const form = ref()

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: z.string().optional(),
})

const formData = reactive<CreateApiKeyRequest>({
  name: '',
  description: '',
  scopes: ['memories:read', 'memories:write'],
  expiresAt: undefined,
})

const availableScopes = [
  {
    value: 'memories:read',
    label: t('scopes.read.label'),
  },
  {
    value: 'memories:write',
    label: t('scopes.write.label'),
  },
  {
    value: 'memories:delete',
    label: t('scopes.delete.label'),
  },
]

const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const createdKey = ref<{ id: string; secret: string } | null>(null)

// Form submission handler
async function onSubmit() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  submitError.value = null

  try {
    const result = await store.createKey(formData)

    // Show the key in this modal instead of closing
    createdKey.value = {
      id: result.key.id,
      secret: result.key.secret,
    }

    toast.add({
      title: t('success.title'),
      description: t('success.description', { name: formData.name }),
      color: 'success',
      icon: 'i-ph-check-circle-fill',
    })
  } catch {
    submitError.value = t('error.create')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  form:
    name:
      label: Name
      description: A descriptive name for this API key
      placeholder: 'e.g., Claude Desktop, Development, Production'
    description:
      label: Description
      description: Optional details about what this key is used for
      placeholder: 'e.g., Personal Claude Desktop integration'
    scopes:
      label: Permissions
      description: Select what this API key can access
    expiresAt:
      label: Expiration Date
      description: Optional expiration date for enhanced security
  scopes:
    read:
      label: Read Memories
      description: View entities, relations, and observations
    write:
      label: Write Memories
      description: Create and modify entities, relations, and observations
    delete:
      label: Delete Memories
      description: Delete memories and perform bulk operations
  buttons:
    cancel: Cancel
    create: Create API Key
  success:
    title: API Key Created
    description: 'API key "{name}" has been created successfully.'
  error:
    create: Failed to create API key. Please check your input and try again.
</i18n>
