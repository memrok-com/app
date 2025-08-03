import { MemrokMCPServer } from "./server"
import { randomUUID } from "crypto"
import { rateLimitMiddleware, validateRequestSize } from "../../utils/rate-limiter"
import { logAuditEvent } from "../../utils/mcp-security"
import { toMCPError } from "../../utils/mcp-errors"
import { extractUser } from "../../utils/auth-middleware"

// Store active MCP server instances by session
const sessions = new Map<string, MemrokMCPServer>()

// Environment-based logging configuration
const isDevelopment = process.env.NODE_ENV === 'development'
const DEBUG_LOGGING = isDevelopment

// Logging helpers
const logInfo = (message: string, ...args: unknown[]) => {
  console.log(`[MCP] ${message}`, ...args)
}

const logDebug = (message: string, ...args: unknown[]) => {
  if (DEBUG_LOGGING) {
    console.log(`[MCP:DEBUG] ${message}`, ...args)
  }
}

const logError = (message: string, error?: unknown) => {
  console.error(`[MCP:ERROR] ${message}`, error)
}

// JSON-RPC 2.0 error responses
const createErrorResponse = (id: unknown, code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message, data }
})

const createSuccessResponse = (id: unknown, result: unknown) => ({
  jsonrpc: "2.0", 
  id,
  result
})

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
        statusMessage: "Authentication required. Use Bearer token or X-API-Key header."
      })
    }
    
    // Enhanced audit logging with auth method
    auditEntry.userId = user.id
    auditEntry.authMethod = user.authMethod
    if (user.apiKeyId) {
      auditEntry.apiKeyId = user.apiKeyId
    }

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

    // Parse request body
    const body = await readRawBody(event)
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: "Request body required"
      })
    }

    let requestData: Record<string, unknown>
    try {
      requestData = JSON.parse(body)
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid JSON in request body"
      })
    }

    // Validate JSON-RPC 2.0 format
    if (requestData.jsonrpc !== "2.0" || !requestData.method) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid JSON-RPC 2.0 request"
      })
    }

    // Extract assistant information from headers
    const assistantName = getHeader(event, "x-assistant-name") || getHeader(event, "x-assistant-id")
    const assistantType = getHeader(event, "x-assistant-type")
    
    auditEntry.assistantName = assistantName
    auditEntry.assistantType = assistantType
    auditEntry.operation = requestData.method

    // Get or create MCP server instance
    let mcpServer = sessions.get(sessionId)
    
    if (!mcpServer) {
      logInfo(`Creating new server instance for session ${sessionId}`)
      mcpServer = new MemrokMCPServer()
      sessions.set(sessionId, mcpServer)
      
      // Clean up old sessions periodically
      setTimeout(() => {
        logDebug(`Cleaning up session ${sessionId}`)
        sessions.delete(sessionId!)
      }, 24 * 60 * 60 * 1000) // 24 hours
    }

    // Set user context BEFORE handling requests
    mcpServer.setContext(assistantName, assistantType, user.id)
    logDebug(`Set context - User: ${user.id}, Assistant: ${assistantName}, Method: ${requestData.method}`)

    // Handle different MCP methods
    let response: Record<string, unknown>

    switch (requestData.method) {
      case "initialize":
        logDebug("Handling initialize request")
        response = createSuccessResponse(requestData.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "memrok",
            version: "1.0.0"
          }
        })
        break

      case "initialized":
        logDebug("Handling initialized notification")
        // This is a notification, no response needed
        setResponseStatus(event, 204)
        return ""

      case "tools/list":
        logDebug("Handling tools/list request")
        try {
          // Get tools from the MCP server
          const toolsResult = await mcpServer.listTools()
          logDebug(`Found ${toolsResult.tools?.length || 0} tools`)
          
          response = createSuccessResponse(requestData.id, {
            tools: toolsResult.tools || []
          })
        } catch (error) {
          logError("Error listing tools:", error)
          response = createErrorResponse(requestData.id, -32603, "Internal error listing tools", String(error))
        }
        break

      case "tools/call": {
        const toolName = (requestData.params as Record<string, unknown>)?.name as string
        logDebug(`Handling tools/call request for tool: ${toolName}`)
        auditEntry.toolName = toolName
        
        try {
          const toolResult = await mcpServer.callTool(toolName, (requestData.params as Record<string, unknown>)?.arguments as Record<string, unknown> || {})
          logDebug(`Tool call successful: ${toolName}`)
          
          response = createSuccessResponse(requestData.id, {
            content: toolResult.content
          })
        } catch (error) {
          logError(`Error calling tool ${toolName}:`, error)
          response = createErrorResponse(requestData.id, -32603, "Internal error calling tool", String(error))
        }
        break
      }

      case "resources/list":
        logDebug("Handling resources/list request")
        response = createSuccessResponse(requestData.id, { resources: [] })
        break

      case "prompts/list":
        logDebug("Handling prompts/list request")  
        response = createSuccessResponse(requestData.id, { prompts: [] })
        break

      default:
        logDebug(`Unknown method: ${requestData.method}`)
        response = createErrorResponse(requestData.id, -32601, `Method not found: ${requestData.method}`)
    }

    // Set response headers
    setHeader(event, "content-type", "application/json")
    
    // Log successful operation
    await logAuditEvent(event, {
      timestamp: new Date(),
      userId: auditEntry.userId as string,
      assistantName: auditEntry.assistantName as string | undefined,
      assistantType: auditEntry.assistantType as string | undefined,
      operation: auditEntry.operation as string,
      toolName: auditEntry.toolName as string | undefined,
      success: true,
      duration: Date.now() - startTime,
    })

    return response

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
      errorCode: typeof mcpError?.data === 'object' && mcpError?.data !== null && 'code' in mcpError.data ? mcpError.data.code as string : undefined,
      duration: Date.now() - startTime,
    })

    logError("MCP request error:", error)
    
    // Ensure we have a valid error object
    if (!mcpError) {
      throw createError({
        statusCode: 500,
        statusMessage: "Internal server error", 
        data: { originalError: String(error) },
      })
    }
    
    throw createError({
      statusCode: mcpError.code === -32001 ? 400 : 500, // Validation errors are 400
      statusMessage: mcpError.message,
      data: mcpError.data,
    })
  }
})
