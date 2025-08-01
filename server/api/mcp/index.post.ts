import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { MemrokMCPServer } from "./server"
import { randomUUID } from "crypto"
import { rateLimitMiddleware, validateRequestSize } from "../../utils/rate-limiter"
import { logAuditEvent } from "../../utils/mcp-security"
import { toMCPError } from "../../utils/mcp-errors"

// Store active sessions
const sessions = new Map<
  string,
  { server: MemrokMCPServer; transport: StreamableHTTPServerTransport }
>()

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const auditEntry: Record<string, unknown> = {}

  try {
    // Validate request size
    await validateRequestSize(event)

    // Get authenticated user
    const user = await extractUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required"
      })
    }
    auditEntry.userId = user.id

    // Apply rate limiting
    await rateLimitMiddleware(event, user.id, { type: "request" })

    // Get or create session ID
    let sessionId = getCookie(event, "mcp-session-id")

    if (!sessionId) {
      sessionId = randomUUID()
      setCookie(event, "mcp-session-id", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
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

    // Extract assistant information from headers
    const assistantName = getHeader(event, "x-assistant-name") || getHeader(event, "x-assistant-id")
    const assistantType = getHeader(event, "x-assistant-type")
    
    auditEntry.assistantName = assistantName
    auditEntry.assistantType = assistantType

    // Set context for the MCP server
    session.server.setContext(assistantName, assistantType, user.id)

    // Parse request body to extract tool information for audit logging
    const body = await readRawBody(event)
    let requestData: Record<string, unknown> = {}
    if (body) {
      try {
        requestData = JSON.parse(body) as Record<string, unknown>
        auditEntry.operation = requestData.method || "unknown"
        if (requestData.params && typeof requestData.params === 'object' && requestData.params !== null) {
          const params = requestData.params as Record<string, unknown>
          if (params.name) {
            auditEntry.toolName = params.name
          }
        }
      } catch {
        // Invalid JSON - will be handled by transport
      }
    }

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
      write: (chunk: unknown) => {
        // For SSE, we need to handle this specially
        if (getHeader(event, "accept") === "text/event-stream") {
          const context = event.context as Record<string, unknown>
          context.sse = (context.sse as unknown[]) || []
          ;(context.sse as unknown[]).push(chunk)
        } else {
          setHeader(event, "content-type", "application/json")
        }
      },
      end: (data?: unknown) => {
        if (data) {
          return data
        }
        const context = event.context as Record<string, unknown>
        if (context.sse) {
          // SSE functionality would need proper implementation
          // For now, just return the data as JSON
          return JSON.stringify(context.sse)
        }
      },
    }

    // Handle the request through the transport
    const result = await session.transport.handleRequest(
      req as never,
      res as never,
      requestData
    )

    // Log successful operation
    await logAuditEvent(event, {
      timestamp: new Date(),
      userId: auditEntry.userId as string,
      assistantName: auditEntry.assistantName as string | undefined,
      assistantType: auditEntry.assistantType as string | undefined,
      operation: (auditEntry.operation as string) || "mcp_request",
      toolName: auditEntry.toolName as string | undefined,
      success: true,
      duration: Date.now() - startTime,
    })

    return result ?? res.end()
  } catch (error) {
    // Log failed operation
    const mcpError = toMCPError(error)
    await logAuditEvent(event, {
      timestamp: new Date(),
      userId: auditEntry.userId as string,
      assistantName: auditEntry.assistantName as string | undefined,
      assistantType: auditEntry.assistantType as string | undefined,
      operation: (auditEntry.operation as string) || "mcp_request",
      toolName: auditEntry.toolName as string | undefined,
      success: false,
      errorCode: typeof mcpError.data === 'object' && mcpError.data !== null && 'code' in mcpError.data ? mcpError.data.code as string : undefined,
      duration: Date.now() - startTime,
    })

    console.error("MCP request error:", error)
    throw createError({
      statusCode: mcpError.code === -32001 ? 400 : 500, // Validation errors are 400
      statusMessage: mcpError.message,
      data: mcpError.data,
    })
  }
})
