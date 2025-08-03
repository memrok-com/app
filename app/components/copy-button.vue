<template>
  <UButton
    :variant="variant"
    :size="size"
    :color="buttonColor"
    :icon="buttonIcon"
    :label="buttonLabel"
    :disabled="disabled"
    @click="copyToClipboard"
  />
</template>

<script setup lang="ts">
interface Props {
  content: string | object | (() => string | object)
  contentType?: 'text' | 'json'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'neutral' | 'success'
  label?: string
  copiedLabel?: string
  copiedTimeout?: number
  icon?: string
  copiedIcon?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'text',
  variant: 'solid',
  size: 'md',
  color: 'primary',
  label: 'Copy',
  copiedLabel: 'Copied!',
  copiedTimeout: 3000,
  icon: 'i-ph-copy',
  copiedIcon: 'i-ph-check',
  disabled: false,
})

const emit = defineEmits<{
  success: [content: string]
  error: [error: unknown]
}>()

const isCopied = ref(false)

const buttonColor = computed(() => 
  isCopied.value ? 'success' : props.color
)

const buttonIcon = computed(() => 
  isCopied.value ? props.copiedIcon : props.icon
)

const buttonLabel = computed(() => 
  isCopied.value ? props.copiedLabel : props.label
)

function formatContent(): string {
  let rawContent: string | object

  if (typeof props.content === 'function') {
    rawContent = props.content()
  } else {
    rawContent = props.content
  }

  switch (props.contentType) {
    case 'json':
      return typeof rawContent === 'string' 
        ? rawContent 
        : JSON.stringify(rawContent, null, 2)
    case 'text':
    default:
      return typeof rawContent === 'string' 
        ? rawContent 
        : String(rawContent)
  }
}

async function copyToClipboard() {
  try {
    const textToCopy = formatContent()
    await navigator.clipboard.writeText(textToCopy)
    
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, props.copiedTimeout)

    emit('success', textToCopy)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    emit('error', error)
  }
}
</script>