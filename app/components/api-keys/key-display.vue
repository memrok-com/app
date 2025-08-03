<template>
  <UForm :state="formState">
    <UAlert
      color="warning"
      icon="i-ph-warning-fill"
      :title="t('warning.title')"
      :description="t('warning.description')"
    />

    <UFormField
      name="apiKeySecret"
      :label="t('keyLabel')"
    >
      <UInput
        v-model="formState.apiKeySecret"
        readonly
        class="font-mono"
      />
    </UFormField>

    <div class="flex justify-end gap-x-4 gap-y-3">
      <UButton
        color="neutral"
        :label="t('close')"
        @click="close"
      />
      <CopyButton
        :content="props.apiKeySecret"
        :label="t('copy')"
        :copied-label="t('copied')"
      />
    </div>
  </UForm>
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


const formState = reactive({
  apiKeySecret: computed(() => props.apiKeySecret),
})


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
    description: This is the only time you’ll see this API key. Store it securely and don’t share it.
  keyLabel: Your API Key
  copy: Copy
  copied: Copied!
  close: I’ve copied the key · Close
</i18n>
