<template>
  <UContainer>
    <UPage>
      <UPageHeader
        :title="t('title')"
        :description="t('description')"
        :ui="{ title: 'text-balance' }"
      />

      <UPageBody>
        <UTabs
          color="neutral"
          :items="tabsItems"
          variant="link"
          :ui="{ list: 'p-0' }"
        >
          <template #default="{ item }">
            <UUser
              :avatar="{
                icon: item.slot === 'api-keys' ? 'i-ph-key-fill' : undefined,
                src:
                  item.slot === 'api-keys'
                    ? undefined
                    : `/logo-${item.slot}.svg`,
                ui: { root: 'bg-inherit' },
              }"
              :name="item.label"
              orientation="vertical"
              :ui="{
                name: 'hidden sm:block text-inherit',
                root: 'items-center',
              }"
            />
          </template>

          <!-- App-specific configuration tabs -->
          <template
            v-for="app in apps"
            :key="app.id"
            #[app.id]
          >
            <UPageSection :title="app.title">
              <template #leading>
                <UAvatar
                  size="3xl"
                  :src="`/logo-${app.id}.svg`"
                  :ui="{ root: 'bg-inherit' }"
                />
              </template>

              <div class="space-y-4">
                <UAlert
                  color="info"
                  icon="i-ph-info"
                  :title="t('config.instructions.title')"
                  :description="t('config.instructions.description')"
                />

                <div class="relative">
                  <pre
                    class="bg-elevated px-4 py-3 overflow-auto rounded text-sm"
                    >{{ formatConfigTemplate(app.id) }}</pre
                  >
                  <UButton
                    class="absolute top-3 right-4"
                    :color="isCopied ? 'success' : 'neutral'"
                    :icon="isCopied ? 'i-ph-check' : 'i-ph-copy'"
                    :label="isCopied ? t('config.copied') : t('config.copy')"
                    size="xs"
                    variant="subtle"
                    @click="copyToClipboard(app.id)"
                  />
                </div>
              </div>
            </UPageSection>
          </template>

          <!-- API Keys tab -->
          <template #api-keys>
            <UPageSection :title="t('apiKeys.title')">
              <template #leading>
                <UAvatar
                  icon="i-ph-key-fill"
                  size="3xl"
                  :ui="{ root: 'bg-inherit' }"
                />
              </template>

              <template #links>
                <ApiKeysModal />
              </template>

              <ApiKeysList />
            </UPageSection>
          </template>
        </UTabs>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'local' })
const { apps, getMcpConfigTemplate } = useApps()

const isCopied = ref(false)

// Add API Keys tab to the tabs
const tabsItems = computed(() => [
  ...apps.value.map((app) => ({
    key: app.id,
    label: app.title,
    slot: app.id,
  })),
  {
    key: 'api-keys',
    label: t('apiKeys.title'),
    slot: 'api-keys',
  },
])

const formatConfigTemplate = (appId: string) => {
  const config = getMcpConfigTemplate(appId)
  return JSON.stringify(config, null, 2)
}

const copyToClipboard = async (appId: string) => {
  try {
    const config = getMcpConfigTemplate(appId)
    const configText = JSON.stringify(config, null, 2)
    await navigator.clipboard.writeText(configText)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

useHead({
  title: t('title'),
})
</script>

<i18n lang="yaml">
en:
  title: Apps
  description: How your AI assistants can connect to memrok.
  apiKeys:
    title: API Keys
  config:
    instructions:
      title: Setup Instructions
      description: 'First create an API key in the API Keys tab, then replace "YOUR_API_KEY" in this configuration with your actual key.'
    copy: Copy
    copied: Copied!
</i18n>
