import { z } from "zod"
import type { McpError } from "@modelcontextprotocol/sdk/types.js"
import { MCPErrorCode } from "./mcp-security"

// JSON-RPC 2.0 error codes
export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes should be in range -32000 to -32099
  VALIDATION_ERROR: -32001,
  RESOURCE_NOT_FOUND: -32002,
  PERMISSION_DENIED: -32003,
  RATE_LIMIT_EXCEEDED: -32004,
  DATABASE_ERROR: -32005,
} as const

// MCP Error class with proper JSON-RPC 2.0 formatting
export class MemrokMCPError extends Error implements McpError {
  public code: number
  public data?: unknown

  constructor(code: MCPErrorCode, message: string, data?: unknown) {
    super(message)
    this.name = "MemrokMCPError"
    this.code = this.mapErrorCodeToJsonRpc(code)
    this.data = data
  }

  private mapErrorCodeToJsonRpc(code: MCPErrorCode): number {
    switch (code) {
      // Validation errors
      case MCPErrorCode.INVALID_INPUT:
      case MCPErrorCode.INVALID_UUID:
      case MCPErrorCode.INVALID_ENTITY_TYPE:
      case MCPErrorCode.INVALID_METADATA:
      case MCPErrorCode.REQUEST_TOO_LARGE:
        return JSON_RPC_ERROR_CODES.VALIDATION_ERROR
        
      // Rate limiting
      case MCPErrorCode.RATE_LIMIT_EXCEEDED:
        return JSON_RPC_ERROR_CODES.RATE_LIMIT_EXCEEDED
        
      // Resource errors
      case MCPErrorCode.ENTITY_NOT_FOUND:
      case MCPErrorCode.RELATION_NOT_FOUND:
      case MCPErrorCode.OBSERVATION_NOT_FOUND:
        return JSON_RPC_ERROR_CODES.RESOURCE_NOT_FOUND
        
      // Permission errors
      case MCPErrorCode.UNAUTHORIZED:
      case MCPErrorCode.FORBIDDEN:
        return JSON_RPC_ERROR_CODES.PERMISSION_DENIED
        
      // Server errors
      case MCPErrorCode.DATABASE_ERROR:
        return JSON_RPC_ERROR_CODES.DATABASE_ERROR
        
      case MCPErrorCode.INTERNAL_ERROR:
      case MCPErrorCode.CONTEXT_ERROR:
      default:
        return JSON_RPC_ERROR_CODES.INTERNAL_ERROR
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    }
  }
}

// Helper to convert any error to MCP error format
export function toMCPError(error: unknown): MemrokMCPError {
  if (error instanceof MemrokMCPError) {
    return error
  }

  if (error instanceof z.ZodError) {
    return new MemrokMCPError(
      MCPErrorCode.INVALID_INPUT,
      "Validation failed",
      {
        validationErrors: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      }
    )
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("User context is required")) {
      return new MemrokMCPError(
        MCPErrorCode.CONTEXT_ERROR,
        "Authentication context missing",
        { originalError: error.message }
      )
    }

    if (error.message.includes("not found")) {
      return new MemrokMCPError(
        MCPErrorCode.ENTITY_NOT_FOUND,
        error.message
      )
    }

    if (error.message.includes("database") || error.message.includes("sql")) {
      return new MemrokMCPError(
        MCPErrorCode.DATABASE_ERROR,
        "Database operation failed",
        { originalError: error.message }
      )
    }

    // Generic error
    return new MemrokMCPError(
      MCPErrorCode.INTERNAL_ERROR,
      error.message || "An unexpected error occurred"
    )
  }

  // Unknown error type
  return new MemrokMCPError(
    MCPErrorCode.INTERNAL_ERROR,
    "An unexpected error occurred",
    { error: String(error) }
  )
}

// Success response helper for consistent formatting
export interface MCPSuccessResponse<T = unknown> {
  success: true
  data: T
  metadata?: {
    timestamp: string
    requestId?: string
  }
}

export function createMCPSuccessResponse<T>(
  data: T,
  requestId?: string
): MCPSuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

// Error response helper for tool responses
export interface MCPErrorResponse {
  success: false
  error: {
    code: MCPErrorCode
    message: string
    details?: unknown
  }
  metadata?: {
    timestamp: string
    requestId?: string
  }
}

export function createMCPErrorResponse(
  error: MemrokMCPError,
  requestId?: string
): MCPErrorResponse {
  return {
    success: false,
    error: {
      code: (typeof error.data === 'object' && error.data !== null && 'code' in error.data 
        ? Object.entries(MCPErrorCode).find(([_, v]) => v === (error.data as Record<string, unknown>).code)?.[0] as MCPErrorCode 
        : undefined) || MCPErrorCode.INTERNAL_ERROR,
      message: error.message,
      details: error.data,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

// Type guard for MCP errors
export function isMCPError(error: unknown): error is MemrokMCPError {
  return error instanceof MemrokMCPError
}

// Validation error helper
export function createValidationError(
  field: string,
  message: string
): MemrokMCPError {
  return new MemrokMCPError(
    MCPErrorCode.INVALID_INPUT,
    `Validation failed: ${message}`,
    { field, message }
  )
}

// Resource not found helper
export function createNotFoundError(
  resourceType: "entity" | "relation" | "observation",
  id: string
): MemrokMCPError {
  const errorCode = {
    entity: MCPErrorCode.ENTITY_NOT_FOUND,
    relation: MCPErrorCode.RELATION_NOT_FOUND,
    observation: MCPErrorCode.OBSERVATION_NOT_FOUND,
  }[resourceType]

  return new MemrokMCPError(
    errorCode,
    `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
    { id }
  )
}