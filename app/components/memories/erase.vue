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
        class="space-y-4"
        :state="formState"
        @submit="onErase"
      >
        <UAlert
          color="error"
          icon="i-ph-warning-fill"
          :title="t('warning.title')"
          :description="t('warning.description')"
          variant="soft"
        />
        <UFormField
          :help="t('form.fields.confirm.help')"
          :label="t('form.fields.confirm.label')"
          name="confirmText"
          required
        >
          <UInput
            v-model="formState.confirmText"
            :placeholder="t('form.fields.confirm.placeholder')"
            autofocus
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
          @click="close"
        />
        <UButton
          color="error"
          :loading="memoryStore.isErasing"
          :disabled="
            formState.confirmText !== t('form.fields.confirm.placeholder')
          "
          :label="t('form.buttons.erase')"
          @click="onErase"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types"

// Props that match UButton props
interface Props extends /* @vue-ignore */ Partial<ButtonProps> {
  // Default button props if not provided
  block?: ButtonProps["block"]
  color?: ButtonProps["color"]
  icon?: ButtonProps["icon"]
  label?: ButtonProps["label"]
  size?: ButtonProps["size"]
  variant?: ButtonProps["variant"]
}

const props = withDefaults(defineProps<Props>(), {
  block: false,
  color: "error",
  icon: "i-ph-eraser-fill",
  label: undefined, // Will use translation if not provided
  variant: "solid",
  size: "md",
})

const emit = defineEmits<{
  erased: []
}>()

const { t } = useI18n({ useScope: "local" })
const memoryStore = useMemoryStore()

// Compute button props, using defaults from props and allowing overrides
const buttonProps = computed(() => ({
  block: props.block,
  color: props.color,
  icon: props.icon,
  label: props.label || t("title"),
  size: props.size,
  variant: props.variant,
}))

// Modal state
const isOpen = ref(false)

// Form state for UForm
const formState = reactive({
  confirmText: "",
})

// Erase handler
async function onErase() {
  if (formState.confirmText !== t("form.fields.confirm.placeholder")) {
    return
  }

  try {
    await memoryStore.eraseAllMemories()

    // Reset form
    formState.confirmText = ""

    // Close modal
    isOpen.value = false

    // Emit erased event
    emit("erased")

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
  }
}
</script>

<i18n lang="yaml">
en:
  title: Erase Memories
  description: Permanently erase all your memories.
  warning:
    title: Warning
    description: This action cannot be undone. All your memories will be permanently deleted.
  form:
    fields:
      confirm:
        label: Confirm Erase
        help: Type "ERASE" to confirm.
        placeholder: ERASE
    buttons:
      cancel: Cancel
      erase: Erase
  success:
    title: Memories Erased
    description: Your memories have been successfully erased.
  error:
    title: Error Erasing Memories
    description: An error occurred while erasing your memories.
</i18n>
