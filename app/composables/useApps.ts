import type { TabsItem } from '@nuxt/ui'
import type { App } from '~/types/apps'

export const useApps = () => {
  const apps = ref<App[]>([
    {
      id: 'claude',
      title: 'Claude Desktop',
      icon: '/logo-claude.svg',
      configType: 'mcp',
    },
  ])

  const { user } = useOidcAuth()

  const generateMcpConfig = (userId: string) => {
    const runtimeConfig = useRuntimeConfig()
    const serverUrl = `https://${runtimeConfig.public.MEMROK_APP_DOMAIN}`
    const isProduction = process.env.NODE_ENV === 'production'

    return {
      mcpServers: {
        memrok: {
          command: isProduction ? 'npx' : 'bun',
          args: isProduction
            ? ['@memrok/mcp-server', '--user-id', userId]
            : ['server/api/mcp/stdio-server.ts', '--user-id', userId],
          env: {
            MEMROK_API_URL: serverUrl,
          },
        },
      },
    }
  }

  const mcpConfig = computed(() => {
    if (!user.value?.userInfo?.sub) return null
    return generateMcpConfig(user.value.userInfo.sub as string)
  })

  const tabsItems = computed<TabsItem[]>(() =>
    apps.value.map((app) => ({
      label: app.title,
      slot: app.id,
    }))
  )

  const getClientBySlot = (slot: string): App | undefined => {
    return apps.value.find((app) => app.id === slot)
  }

  return {
    apps: readonly(apps),
    tabsItems,
    mcpConfig: readonly(mcpConfig),
    getClientBySlot,
  }
}
