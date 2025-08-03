<template>
  <UTooltip :text="isConfirmingRevoke ? t('confirmRevoke') : t('revoke')">
    <UButton
      :aria-label="isConfirmingRevoke ? t('confirmRevoke') : t('revoke')"
      :color="isConfirmingRevoke ? 'error' : 'neutral'"
      :disabled="isRevoking || !apiKey"
      :icon="
        isConfirmingRevoke ? 'i-ph-warning-fill' : 'i-ph-trash-simple-fill'
      "
      :loading="isRevoking"
      :size="size"
      square
      :variant="isConfirmingRevoke ? 'solid' : variant"
      @click="handleRevokeClick"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import type { ButtonProps } from '#ui/types'

interface Props {
  keyId: string
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'ghost',
})

const { t } = useI18n({ useScope: 'local' })
const store = useApiKeysStore()
const toast = useToast()

// Get the API key from store
const apiKey = computed(() => {
  return store.keys.find((k) => k.id === props.keyId)
})

// Loading state for this specific key
const isRevoking = computed(() => {
  return store.isDeleting(props.keyId)
})

// Revoke confirmation state
const isConfirmingRevoke = ref(false)
let confirmationTimeout: NodeJS.Timeout | null = null

// Reset confirmation state after 3 seconds
const resetConfirmation = () => {
  isConfirmingRevoke.value = false
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout)
    confirmationTimeout = null
  }
}

// Handle keyboard events for escape key
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isConfirmingRevoke.value) {
      resetConfirmation()
    }
  }
  document.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    resetConfirmation()
  })
})

const handleRevokeClick = () => {
  if (isConfirmingRevoke.value) {
    // Second click - execute revoke
    handleRevoke()
  } else {
    // First click - enter confirmation state
    isConfirmingRevoke.value = true
    confirmationTimeout = setTimeout(() => {
      resetConfirmation()
    }, 3000)
  }
}

const handleRevoke = async () => {
  if (isRevoking.value || !apiKey.value) return

  // Reset confirmation state
  resetConfirmation()

  try {
    const displayName = apiKey.value.name

    await store.revokeKey(props.keyId)

    // Show success toast
    toast.add({
      color: 'success',
      id: `revoke-api-key-${props.keyId}`,
      icon: 'i-ph-check-circle-fill',
      title: t('revoked.title'),
      description: t('revoked.description', { name: displayName }),
      duration: 3000,
    })
  } catch {
    toast.add({
      title: t('error.revoke'),
      description: t('error.revokeDescription'),
      icon: 'i-ph-warning-fill',
      color: 'error',
    })
  }
}
</script>

<i18n lang="yaml">
en:
  revoke: Revoke API key
  confirmRevoke: Confirm revoking API key
  revoked:
    title: API Key Revoked
    description: ‘{name}’ has been revoked successfully
  error:
    revoke: Revoke Failed
    revokeDescription: Failed to revoke API key
</i18n>
