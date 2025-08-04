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
            </UPageSection>

            <UAlert
              color="info"
              icon="i-ph-info-fill"
              :title="t('config.instructions.title')"
            >
              <template #description>
                <i18n-t keypath="config.instructions.description">
                  <template #key>
                    <code class="prose">{{
                      t('config.instructions.key')
                    }}</code>
                  </template>
                </i18n-t>
              </template>
            </UAlert>

            <div class="relative overflow-hidden">
              <pre class="prose">{{ formatConfigTemplate(app.id) }}</pre>
              <CopyButton
                class="absolute top-3 right-4"
                :content="() => getMcpConfigTemplate(app.id)"
                :content-type="
                  typeof getMcpConfigTemplate(app.id) === 'string'
                    ? 'text'
                    : 'json'
                "
                color="neutral"
                :label="t('config.copy')"
                :copied-label="t('config.copied')"
                size="xs"
              />
            </div>
          </template>

          <!-- API Keys tab -->
          <template #api-keys>
            <UPageSection
              icon="i-ph-key-fill"
              :title="t('apiKeys.title')"
            >
              <template #links>
                <ApiKeysModal />
              </template>

              <ApiKeys />
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
  // For Claude Code, return the raw string command
  if (typeof config === 'string') {
    return config
  }
  // For other apps, return formatted JSON
  return JSON.stringify(config, null, 2)
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
      description: Create an API key, then replace {key} in this configuration with your actual key.
      key: YOUR_API_KEY
    copy: Copy
    copied: Copied!
</i18n>
