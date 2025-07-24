import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MemrokMCPServer } from './server'
import type { User } from '#auth-utils'
import { randomUUID } from 'crypto'

// Store active sessions
const sessions = new Map<string, { server: MemrokMCPServer, transport: StreamableHTTPServerTransport }>()

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = await requireUser(event)
  
  // Get or create session ID
  let sessionId = getCookie(event, 'mcp-session-id')
  
  if (!sessionId) {
    sessionId = randomUUID()
    setCookie(event, 'mcp-session-id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })
  }
  
  // Get or create session
  let session = sessions.get(sessionId)
  
  if (!session) {
    // Create new MCP server instance
    const mcpServer = new MemrokMCPServer()
    
    // Create HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId!,
    })
    
    // Connect server to transport
    await mcpServer.server.connect(transport)
    
    session = { server: mcpServer, transport }
    sessions.set(sessionId, session)
    
    // Clean up old sessions periodically
    setTimeout(() => {
      sessions.delete(sessionId!)
    }, 24 * 60 * 60 * 1000) // 24 hours
  }
  
  // Extract assistant ID from headers
  const assistantId = getHeader(event, 'x-assistant-id')
  
  // Set context for the MCP server
  session.server.setContext(assistantId || undefined, user.sub)
  
  // Handle the request
  try {
    // Get the raw body for streaming support
    const body = await readRawBody(event)
    
    // Create mock request/response objects for the transport
    const req = {
      method: event.method,
      headers: getHeaders(event),
      url: event.path,
    }
    
    const res = {
      writeHead: (status: number, headers: Record<string, string>) => {
        setResponseStatus(event, status)
        for (const [key, value] of Object.entries(headers)) {
          setHeader(event, key, value)
        }
      },
      write: (chunk: any) => {
        // For SSE, we need to handle this specially
        if (getHeader(event, 'accept') === 'text/event-stream') {
          event.context.sse = event.context.sse || []
          event.context.sse.push(chunk)
        } else {
          appendResponseHeader(event, 'content-type', 'application/json')
        }
      },
      end: (data?: any) => {
        if (data) {
          return data
        }
        if (event.context.sse) {
          return createEventStream(event, async (emitter) => {
            for (const chunk of event.context.sse) {
              await emitter.push(chunk.toString())
            }
          })
        }
      }
    }
    
    // Handle the request through the transport
    const result = await session.transport.handleRequest(
      req as any,
      res as any,
      body ? JSON.parse(body) : undefined
    )
    
    return result || res.end()
  } catch (error) {
    console.error('MCP request error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})