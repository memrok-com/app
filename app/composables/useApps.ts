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
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction) {
      return {
        mcpServers: {
          memrok: {
            command: 'npx',
            args: ['@memrok/mcp-server', '--user-id', userId],
          },
        },
      }
    }

    // For development, use the project path from runtime config
    const projectPath = runtimeConfig.public.MEMROK_PROJECT_PATH
    const stdioPath = projectPath.replace(/\\/g, '/') + '/server/api/mcp/stdio-server.ts'
    
    return {
      mcpServers: {
        memrok: {
          command: 'bun',
          args: [stdioPath, '--user-id', userId],
          // DATABASE_URL must be set in your local environment, not in config
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
