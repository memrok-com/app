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
      icon: '/logo-claude-desktop.svg',
      configType: 'mcp',
    },
    // TODO: Add more AI assistants as they become available
    // Examples: cursor, vscode, windsurf, cline, etc.
  ])

  const { user: _user } = useOidcAuth()

  const generateMcpConfig = (apiKey: string, assistantName: string = 'unknown') => {
    const runtimeConfig = useRuntimeConfig()
    
    // Get the app domain from environment or use default
    const appDomain = runtimeConfig.public.MEMROK_APP_DOMAIN || 'https://app.memrok.com'
    
    return {
      mcpServers: {
        memrok: {
          command: 'npx',
          args: [
            'mcp-remote',
            `${appDomain}/api/mcp`,
            '--header',
            `Authorization: Bearer ${apiKey}`,
            '--header',
            `X-Assistant-Name: ${assistantName}`,
          ],
        },
      },
    }
  }

  // Get config template with placeholder for API key
  const getMcpConfigTemplate = (appId: string) => {
    const app = apps.value.find(a => a.id === appId)
    if (!app) return null
    
    return generateMcpConfig('YOUR_API_KEY', app.id)
  }

  const getClientBySlot = (slot: string): App | undefined => {
    return apps.value.find((app) => app.id === slot)
  }

  return {
    apps: readonly(apps),
    generateMcpConfig,
    getMcpConfigTemplate,
    getClientBySlot,
  }
}
