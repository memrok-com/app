export interface App {
  id: string
  title: string
  icon: string
  configType: 'mcp' | 'manual'
  configuration?: {
    server?: {
      command: string[]
      args?: string[]
      env?: Record<string, string>
    }
    stdio?: {
      command: string
      args?: string[]
    }
  }
}
