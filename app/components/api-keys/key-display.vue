<template>
  <!-- Modal version -->
  <UModal
    v-if="!inline"
    :model-value="true"
    :prevent-close="true"
  >
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-ph-check-circle" class="text-green-500" />
          <h3 class="text-lg font-semibold">{{ t('title') }}</h3>
        </div>
      </template>
      
      <div class="space-y-4">
        <UAlert
          color="warning"
          icon="i-ph-warning"
          :title="t('warning.title')"
          :description="t('warning.description')"
        />
        
        <div>
          <label class="block text-sm font-medium mb-2">
            {{ t('keyLabel') }}
          </label>
          <div class="relative">
            <UInput
              :model-value="apiKeySecret"
              readonly
              class="font-mono text-sm pr-20 select-all"
            />
            <UButton
              class="absolute right-2 top-1/2 -translate-y-1/2"
              :color="isCopied ? 'success' : 'neutral'"
              :icon="isCopied ? 'i-ph-check' : 'i-ph-copy'"
              size="xs"
              variant="ghost"
              @click="copyToClipboard"
            >
              {{ isCopied ? t('copied') : t('copy') }}
            </UButton>
          </div>
        </div>
        
        <div class="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 class="font-medium text-amber-800 dark:text-amber-200 mb-2">
            {{ t('instructions.title') }}
          </h4>
          <ol class="list-decimal list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
            <li>{{ t('instructions.step1') }}</li>
            <li>{{ t('instructions.step2') }}</li>
            <li>{{ t('instructions.step3') }}</li>
          </ol>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            @click="close"
          >
            {{ t('close') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>

  <!-- Inline version -->
  <div v-else>
    <div class="flex items-center gap-2 mb-4">
      <UIcon name="i-ph-check-circle" class="text-green-500" />
      <h3 class="text-lg font-semibold">{{ t('title') }}</h3>
    </div>
    
    <div class="space-y-4">
      <UAlert
        color="warning"
        icon="i-ph-warning"
        :title="t('warning.title')"
        :description="t('warning.description')"
      />
      
      <div>
        <label class="block text-sm font-medium mb-2">
          {{ t('keyLabel') }}
        </label>
        <div class="relative">
          <UInput
            :model-value="apiKeySecret"
            readonly
            class="font-mono text-sm pr-20 select-all"
          />
          <UButton
            class="absolute right-2 top-1/2 -translate-y-1/2"
            :color="isCopied ? 'success' : 'neutral'"
            :icon="isCopied ? 'i-ph-check' : 'i-ph-copy'"
            size="xs"
            variant="ghost"
            @click="copyToClipboard"
          >
            {{ isCopied ? t('copied') : t('copy') }}
          </UButton>
        </div>
      </div>
      
      <div class="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 class="font-medium text-amber-800 dark:text-amber-200 mb-2">
          {{ t('instructions.title') }}
        </h4>
        <ol class="list-decimal list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
          <li>{{ t('instructions.step1') }}</li>
          <li>{{ t('instructions.step2') }}</li>
          <li>{{ t('instructions.step3') }}</li>
        </ol>
      </div>
    </div>
    
    <div class="flex justify-end pt-4">
      <UButton
        color="primary"
        @click="close"
      >
        {{ t('close') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'local' })

const props = withDefaults(
  defineProps<{
    apiKeyId: string
    apiKeySecret: string
    inline?: boolean
  }>(),
  {
    inline: false,
  }
)

const emit = defineEmits<{
  close: []
}>()

const isCopied = ref(false)

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.apiKeySecret)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

function close() {
  emit('close')
}

// Auto-select the key text when component mounts
onMounted(() => {
  // Focus and select the input content
  nextTick(() => {
    const input = document.querySelector('input[readonly]') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
})
</script>

<i18n lang="yaml">
en:
  title: API Key Created Successfully
  warning:
    title: Important Security Notice
    description: This is the only time you'll see this API key. Store it securely and don't share it.
  keyLabel: Your API Key
  copy: Copy
  copied: Copied!
  close: I've Stored This Key Safely
  instructions:
    title: Next Steps
    step1: Copy this API key to a secure location
    step2: Go to the Apps page to get your MCP configuration
    step3: Add the configuration to your AI assistant settings
</i18n>