import { MemrokMCPServer } from "./server"
import { randomUUID } from "crypto"
import { rateLimitMiddleware, validateRequestSize } from "../../utils/rate-limiter"
import { logAuditEvent } from "../../utils/mcp-security"
import { toMCPError } from "../../utils/mcp-errors"
import { extractUser } from "../../utils/auth-middleware"

// Store active MCP server instances by session
const sessions = new Map<string, MemrokMCPServer>()

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

    let requestData: any
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
      console.log(`[MCP] Creating new server instance for session ${sessionId}`)
      mcpServer = new MemrokMCPServer()
      sessions.set(sessionId, mcpServer)
      
      // Clean up old sessions periodically
      setTimeout(() => {
        console.log(`[MCP] Cleaning up session ${sessionId}`)
        sessions.delete(sessionId!)
      }, 24 * 60 * 60 * 1000) // 24 hours
    }

    // Set user context BEFORE handling requests
    mcpServer.setContext(assistantName, assistantType, user.id)
    console.log(`[MCP] Set context - User: ${user.id}, Assistant: ${assistantName}, Method: ${requestData.method}`)

    // Handle different MCP methods
    let response: any

    switch (requestData.method) {
      case "initialize":
        console.log("[MCP] Handling initialize request")
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
        console.log("[MCP] Handling initialized notification")
        // This is a notification, no response needed
        setResponseStatus(event, 204)
        return ""

      case "tools/list":
        console.log("[MCP] Handling tools/list request")
        try {
          // Get tools from the MCP server
          const toolsResult = await mcpServer.listTools()
          console.log(`[MCP] Found ${toolsResult.tools?.length || 0} tools`)
          
          response = createSuccessResponse(requestData.id, {
            tools: toolsResult.tools || []
          })
        } catch (error) {
          console.error("[MCP] Error listing tools:", error)
          response = createErrorResponse(requestData.id, -32603, "Internal error listing tools", String(error))
        }
        break

      case "tools/call":
        console.log(`[MCP] Handling tools/call request for tool: ${requestData.params?.name}`)
        auditEntry.toolName = requestData.params?.name
        
        try {
          const toolResult = await mcpServer.callTool(requestData.params?.name, requestData.params?.arguments || {})
          console.log(`[MCP] Tool call successful: ${requestData.params?.name}`)
          
          response = createSuccessResponse(requestData.id, {
            content: toolResult.content,
            isError: toolResult.isError
          })
        } catch (error) {
          console.error(`[MCP] Error calling tool ${requestData.params?.name}:`, error)
          response = createErrorResponse(requestData.id, -32603, "Internal error calling tool", String(error))
        }
        break

      case "resources/list":
        console.log("[MCP] Handling resources/list request")
        response = createSuccessResponse(requestData.id, { resources: [] })
        break

      case "prompts/list":
        console.log("[MCP] Handling prompts/list request")  
        response = createSuccessResponse(requestData.id, { prompts: [] })
        break

      default:
        console.log(`[MCP] Unknown method: ${requestData.method}`)
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

    console.log(`[MCP] Returning response for ${requestData.method}:`, JSON.stringify(response, null, 2))
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

    console.error("MCP request error:", error)
    console.error("Converted MCP error:", mcpError)
    
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
