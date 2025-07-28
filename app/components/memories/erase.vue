<template>
  <UModal
    :title="t('title')"
    :description="t('description')"
  >
    <UButton
      color="error"
      icon="i-ph-eraser-fill"
      :label="t('title')"
      variant="soft"
    />

    <template #body="{ close }">
      <UForm
        :schema="schema"
        :state="state"
        :validate-on="['change', 'input']"
        @submit="submit"
      >
        <UAlert
          color="warning"
          icon="i-ph-warning"
          :title="t('warning.title')"
          :description="t('warning.description')"
          variant="subtle"
        />

        <UFormField
          :label="t('form.fields.confirmation.label')"
          :help="t('form.fields.confirmation.help')"
          name="confirmation"
          required
        >
          <UInput
            autofocus
            :placeholder="t('form.fields.confirmation.placeholder')"
            v-model="state.confirmation"
          />
        </UFormField>

        <UAlert
          v-if="submitError"
          color="error"
          icon="i-ph-warning"
          :title="submitError"
          variant="subtle"
        />

        <div class="flex gap-x-4 gap-y-3 justify-end">
          <UButton
            color="neutral"
            :label="t('form.buttons.cancel')"
            variant="ghost"
            @click="close"
          />

          <UTooltip
            :disabled="
              state.confirmation === t('form.fields.confirmation.placeholder')
            "
            :text="t('form.fields.confirmation.validation.exact')"
          >
            <UButton
              color="error"
              :disabled="
                state.confirmation !== t('form.fields.confirmation.placeholder')
              "
              icon="i-ph-eraser-fill"
              :label="t('title')"
              :loading="isSubmitting"
              type="submit"
            />
          </UTooltip>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from "zod"

const memoryStore = useMemoryStore()
const { t } = useI18n({ useScope: "local" })
const toast = useToast()

// Modal state
const open = ref(false)

// Form validation schema
const schema = z.object({
  confirmation: z
    .string()
    .refine(
      (val) => val === "ERASE",
      t("form.fields.confirmation.validation.exact")
    ),
})

// Form state
const state = reactive({
  confirmation: "",
})

// Loading state
const isSubmitting = ref(false)

// Error state for inline display
const submitError = ref<string | null>(null)

// Form submission handler
const submit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  submitError.value = null // Clear previous errors

  try {
    await memoryStore.eraseAllMemories()

    // Show success toast
    toast.add({
      title: t("form.success.title"),
      description: t("form.success.description"),
      color: "success",
      icon: "i-ph-check-circle",
    })

    // Reset form and close modal
    state.confirmation = ""
    open.value = false
  } catch (error) {
    // Set inline error
    submitError.value = t("form.error")

    console.error("Erase memories error:", error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<i18n lang="yaml">
en:
  title: Erase Memories
  description: Permanently erase all memories.
  warning:
    title: Warning
    description: Erasing all memories from memrok is permanent and cannot be undone.
  form:
    fields:
      confirmation:
        label: Confirmation
        help: Confirm by typing @:form.fields.confirmation.placeholder
        placeholder: ERASE
        validation:
          exact: Confirmation is required
    buttons:
      cancel: Cancel
    success:
      title: All Memories Erased
      description: Your memory database has been completely cleared.
    error: Failed to erase memories. Some memories could not be deleted. Please try again.
</i18n>
