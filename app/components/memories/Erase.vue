<template>
  <UModal
    v-model:open="isOpen"
    :title="t('memories.erase.title')"
    :description="t('memories.erase.description')"
  >
    <!-- The button that opens the modal -->
    <UButton
      v-bind="buttonProps"
      @click="isOpen = true"
    />

    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-ph-warning-fill"
          :title="t('common.warning')"
          :description="t('memories.erase.warning')"
        />

        <UForm :state="formState" @submit="onErase">
          <UFormField
            name="confirmText"
            :label="t('memories.erase.confirm')"
            required
          >
            <UInput
              v-model="formState.confirmText"
              :placeholder="t('memories.erase.confirmPlaceholder')"
              autofocus
            />
          </UFormField>
        </UForm>
      </div>
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
          color="error"
          :loading="loading"
          :disabled="formState.confirmText !== t('memories.erase.confirmPlaceholder')"
          :label="t('common.delete')"
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
  icon?: string
  label?: string
  block?: boolean
  variant?: ButtonProps["variant"]
  color?: ButtonProps["color"]
  size?: ButtonProps["size"]
}

const props = withDefaults(defineProps<Props>(), {
  icon: "i-ph-eraser-fill",
  label: undefined, // Will use translation if not provided
  block: false,
  variant: "ghost",
  color: "error",
  size: "sm",
})

const emit = defineEmits<{
  erased: []
}>()

const { t } = useI18n()
const { user } = useOidcAuth()

// Compute button props, using defaults from props and allowing overrides
const buttonProps = computed(() => ({
  ...props,
  label: props.label || t("memories.navigation.erase"),
  // Remove non-button props
  onErased: undefined,
}))

// Modal state
const isOpen = ref(false)
const loading = ref(false)

// Form state for UForm
const formState = reactive({
  confirmText: ""
})

// Handle modal closing
const handleModalClose = () => {
  // Reset form when closing
  formState.confirmText = ""
  // Close modal
  isOpen.value = false
}

// Erase handler
async function onErase() {
  if (formState.confirmText !== t('memories.erase.confirmPlaceholder')) {
    return
  }

  loading.value = true

  try {
    await $fetch("/api/memories/erase", {
      method: "DELETE",
      body: {
        userId: user.value?.userInfo?.sub,
      },
    })

    // Reset form
    formState.confirmText = ""

    // Close modal
    isOpen.value = false

    // Emit erased event
    emit("erased")

    // Show success notification
    const toast = useToast()
    toast.add({
      title: t("common.success"),
      description: t("memories.erase.success"),
      color: "success",
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: t("common.error"),
      description: error.data?.statusMessage || t("memories.erase.error"),
      color: "error",
    })
  } finally {
    loading.value = false
  }
}
</script>
