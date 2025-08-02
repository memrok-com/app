import type { TabsItem } from '@nuxt/ui'
import type { App } from '~/types/apps'

/**
 * Composable for managing AI assistant applications and their MCP configurations.
 * Supports any MCP-compatible AI assistant (Claude Desktop, Cursor, VS Code, etc.)
 */
export const useApps = () => {
  const apps = ref<App[]>([
    {
      id: 'claude-desktop',
      title: 'Claude Desktop',
      icon: '/logo-claude.svg',
      configType: 'mcp',
    },
    // TODO: Add more AI assistants as they become available
    // Examples: cursor, vscode, windsurf, cline, etc.
  ])

  const { user } = useOidcAuth()

  const generateMcpConfig = (userId: string, assistantName: string = 'unknown') => {
    const runtimeConfig = useRuntimeConfig()
    
    // Get the app domain from environment or use default
    const appDomain = runtimeConfig.public.MEMROK_APP_DOMAIN || 'https://app.memrok.com'
    
    // TODO: Replace X-User-Id with API key authentication
    // Current approach exposes user IDs which cannot be revoked
    // Future implementation will use scoped, revocable API keys
    
    return {
      mcpServers: {
        memrok: {
          command: 'npx',
          args: [
            'mcp-remote',
            `${appDomain}/api/mcp`,
            '--header',
            `X-User-Id: ${userId}`,
            '--header',
            `X-Assistant-Name: ${assistantName}`,
          ],
          // Future: API key authentication
          // env: {
          //   MEMROK_API_KEY: 'mk_live_...' // Scoped, revocable API key
          // }
        },
      },
    }
  }

  const getMcpConfig = (appId: string) => {
    if (!user.value?.userInfo?.sub) return null
    const app = apps.value.find(a => a.id === appId)
    if (!app) return null
    
    // Extract assistant name from app ID (e.g., 'claude-desktop' -> 'claude-desktop')
    // In the future, this could be a separate field in the App type
    return generateMcpConfig(user.value.userInfo.sub as string, app.id)
  }
  
  const mcpConfig = computed(() => {
    if (!user.value?.userInfo?.sub) return null
    // Default config for backward compatibility
    return generateMcpConfig(user.value.userInfo.sub as string, 'claude-desktop')
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
    getMcpConfig,
    getClientBySlot,
  }
}
