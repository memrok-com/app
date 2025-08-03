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
    {
      id: 'claude-code',
      title: 'Claude Code',
      icon: '/logo-claude-desktop.svg',
      configType: 'command',
    },
    // TODO: Add more AI assistants as they become available
    // Examples: cursor, vscode, windsurf, cline, etc.
  ])

  const { user: _user } = useOidcAuth()

  // Detect if running on Windows
  const isWindows = () => {
    if (import.meta.client) {
      return navigator.platform.toLowerCase().includes('win')
    }
    return false
  }

  const generateMcpConfig = (apiKey: string, assistantName: string = 'unknown') => {
    const runtimeConfig = useRuntimeConfig()
    
    // Get the app domain from environment or use default
    let appDomain = runtimeConfig.public.MEMROK_APP_DOMAIN || 'https://app.memrok.com'
    
    // For development with mkcert certificates, use localhost to avoid SSL verification issues
    if (appDomain.includes('dev.memrok.com')) {
      appDomain = 'http://localhost:3000'
    }
    
    // Ensure domain has protocol
    if (!appDomain.startsWith('http://') && !appDomain.startsWith('https://')) {
      appDomain = `https://${appDomain}`
    }
    
    // Windows requires cmd /c npx for proper execution
    const mcpServerConfig = isWindows()
      ? {
          command: 'cmd',
          args: [
            '/c',
            'npx',
            '-y',
            'mcp-remote',
            `${appDomain}/api/mcp`,
            '--header',
            `Authorization: Bearer ${apiKey}`,
            '--header',
            `X-Assistant-Name: ${assistantName}`,
          ],
        }
      : {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            `${appDomain}/api/mcp`,
            '--header',
            `Authorization: Bearer ${apiKey}`,
            '--header',
            `X-Assistant-Name: ${assistantName}`,
          ],
        }
    
    // Use different server name for dev vs prod
    const serverName = appDomain.includes('localhost') ? 'memrok-dev' : 'memrok'
    
    return {
      mcpServers: {
        [serverName]: mcpServerConfig,
      },
    }
  }

  // Generate terminal command for Claude Code
  const generateTerminalCommand = (apiKey: string, assistantName: string = 'unknown') => {
    const runtimeConfig = useRuntimeConfig()
    
    // Get the app domain from environment or use default
    let appDomain = runtimeConfig.public.MEMROK_APP_DOMAIN || 'https://app.memrok.com'
    
    // For development with mkcert certificates, use localhost to avoid SSL verification issues
    if (appDomain.includes('dev.memrok.com')) {
      appDomain = 'http://localhost:3000'
    }
    
    // Ensure domain has protocol
    if (!appDomain.startsWith('http://') && !appDomain.startsWith('https://')) {
      appDomain = `https://${appDomain}`
    }
    
    // Use different server name for dev vs prod
    const serverName = appDomain.includes('localhost') ? 'memrok-dev' : 'memrok'
    
    // Use the simpler HTTP transport method like other tools instead of mcp-remote
    return `claude mcp add --transport http ${serverName} "${appDomain}/api/mcp" --header "Authorization: Bearer ${apiKey}" --header "X-Assistant-Name: ${assistantName}"`
  }

  // Get config template with placeholder for API key
  const getMcpConfigTemplate = (appId: string) => {
    const app = apps.value.find(a => a.id === appId)
    if (!app) return null
    
    // Return command for Claude Code, config for others
    if (app.configType === 'command') {
      return generateTerminalCommand('YOUR_API_KEY', app.id)
    }
    
    return generateMcpConfig('YOUR_API_KEY', app.id)
  }

  const getClientBySlot = (slot: string): App | undefined => {
    return apps.value.find((app) => app.id === slot)
  }

  return {
    apps: readonly(apps),
    generateMcpConfig,
    generateTerminalCommand,
    getMcpConfigTemplate,
    getClientBySlot,
  }
}
