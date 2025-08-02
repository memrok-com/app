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
                src: `/logo-${item.slot}.svg`,
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

              <div class="space-y-3">
                <p>
                  {{ t('config.description') }}
                </p>

                <UAlert
                  color="warning"
                  icon="i-ph-warning-fill"
                  :title="t('config.securityWarning.title')"
                  :description="t('config.securityWarning.description')"
                />

                <div class="relative">
                  <pre
                    class="bg-elevated px-4 py-3 overflow-auto rounded text-sm"
                    >{{ formatConfigForDisplay(mcpConfig) }}</pre
                  >
                  <UButton
                    class="absolute top-3 right-4"
                    :color="isCopied ? 'success' : 'neutral'"
                    :icon="isCopied ? 'i-ph-check' : 'i-ph-copy'"
                    :label="isCopied ? t('config.copied') : t('config.copy')"
                    size="xs"
                    variant="subtle"
                    @click="copyToClipboard(formatConfigForDisplay(mcpConfig))"
                  />
                </div>
              </div>
            </UPageSection>
          </template>
        </UTabs>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'local' })
const { apps, tabsItems, mcpConfig } = useApps()

const isCopied = ref(false)

const formatConfigForDisplay = (config: Record<string, unknown> | null) => {
  if (!config) return '{}'
  return JSON.stringify(config, null, 2)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
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
  config:
    description: Copy this configuration and add it to your client’s settings.
    copy: Copy
    copied: Copied!
    securityWarning:
      title: Security Warning
      description: This configuration contains your user ID. Never share it with others. We’re working on revokable API keys for better security.
</i18n>
