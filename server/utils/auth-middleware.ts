/**
 * Authentication middleware for RLS context management
 *
 * This middleware automatically extracts user information from requests
 * and provides database instances with proper RLS context set.
 */

import type { EventHandlerRequest, H3Event } from "h3"
import {
  getHeader,
  getQuery,
  createError,
  defineEventHandler,
  getRequestURL,
  setHeader,
} from "h3"
import { getUserSession } from "nuxt-oidc-auth/runtime/server/utils/session.js"
import { createUserDb, useApplicationDb, type UserScopedDatabase } from "./db"
import { RLSContextError } from "../database/rls-context"
import { findApiKeyByValue, isValidApiKeyFormat } from "./api-key-service"

/**
 * User information extracted from authentication
 */
export interface AuthenticatedUser {
  id: string
  email?: string
  name?: string
  authMethod: 'oidc' | 'api_key' | 'header' | 'query'
  apiKeyId?: string // Present when authenticated via API key
  [key: string]: unknown
}

/**
 * Extract user information from authentication
 */
export async function extractUser(
  event: H3Event<EventHandlerRequest>
): Promise<AuthenticatedUser | null> {
  // 1. Try API key authentication first (highest priority)
  const apiKeyAuth = await extractApiKeyAuth(event)
  if (apiKeyAuth) {
    return apiKeyAuth
  }

  // 2. Try OIDC session authentication
  try {
    const session = await getUserSession(event)

    if (session && session.userInfo) {
      return {
        id: session.userInfo.sub as string,
        email: session.userInfo.email as string,
        name: session.userInfo.name as string,
        authMethod: 'oidc',
        ...session.userInfo,
      }
    }
  } catch {
    // Session doesn't exist or is invalid, try fallback methods
  }

  // 3. Fallback methods for development/testing

  // From custom header (for MCP protocol - legacy)
  const mcpUserId = getHeader(event, "x-memrok-user-id")
  if (mcpUserId) {
    return { 
      id: mcpUserId,
      authMethod: 'header'
    }
  }

  // From query parameters (for development/testing)
  const query = getQuery(event)
  if (query.userId && typeof query.userId === "string") {
    return { 
      id: query.userId,
      authMethod: 'query'
    }
  }

  return null
}

/**
 * Extract and validate API key from request
 */
async function extractApiKeyAuth(
  event: H3Event<EventHandlerRequest>
): Promise<AuthenticatedUser | null> {
  // Check Authorization header
  const authHeader = getHeader(event, "authorization")
  let keyValue: string | null = null

  if (authHeader && authHeader.startsWith("Bearer ")) {
    keyValue = authHeader.substring(7)
  }

  // Check X-API-Key header as fallback
  if (!keyValue) {
    keyValue = getHeader(event, "x-api-key") || null
  }

  if (!keyValue || !isValidApiKeyFormat(keyValue)) {
    return null
  }

  try {
    // Use application database (not user-scoped) for API key validation
    const db = useApplicationDb()
    const apiKeyData = await findApiKeyByValue(db.db, keyValue)

    if (!apiKeyData) {
      return null
    }

    return {
      id: apiKeyData.userId,
      authMethod: 'api_key',
      apiKeyId: apiKeyData.id,
    }
  } catch {
    // API key validation error
    return null
  }
}

/**
 * Require authentication and return user-scoped database
 * Throws error if user is not authenticated
 */
export async function requireAuth(
  event: H3Event<EventHandlerRequest>
): Promise<UserScopedDatabase> {
  const user = await extractUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    })
  }

  return createUserDb(user.id)
}

/**
 * Optionally get user-scoped database if authenticated
 * Returns null if not authenticated (no error thrown)
 */
export async function optionalAuth(
  event: H3Event<EventHandlerRequest>
): Promise<UserScopedDatabase | null> {
  const user = await extractUser(event)

  if (!user) {
    return null
  }

  return createUserDb(user.id)
}

/**
 * Higher-order function to create authenticated API handlers
 * Automatically injects user-scoped database into handler
 */
export function withAuth<T>(
  handler: (
    event: H3Event<EventHandlerRequest>,
    userDb: UserScopedDatabase,
    user: AuthenticatedUser
  ) => Promise<T>
) {
  return async (event: H3Event<EventHandlerRequest>): Promise<T> => {
    const user = await extractUser(event)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required",
      })
    }

    const userDb = createUserDb(user.id)

    try {
      return await handler(event, userDb, user)
    } catch (error) {
      // Handle RLS errors
      if (error instanceof RLSContextError) {
        throw createError({
          statusCode: 403,
          statusMessage: "Access denied: " + error.message,
          data: { userId: user.id },
        })
      }

      // Re-throw other errors
      throw error
    }
  }
}

/**
 * Higher-order function for optional authentication
 * Handler receives null if not authenticated
 */
export function withOptionalAuth<T>(
  handler: (
    event: H3Event<EventHandlerRequest>,
    userDb: UserScopedDatabase | null,
    user: AuthenticatedUser | null
  ) => Promise<T>
) {
  return async (event: H3Event<EventHandlerRequest>): Promise<T> => {
    const user = await extractUser(event)
    const userDb = user ? createUserDb(user.id) : null

    try {
      return await handler(event, userDb, user)
    } catch (error) {
      // Handle RLS errors
      if (error instanceof RLSContextError) {
        throw createError({
          statusCode: 403,
          statusMessage: "Access denied: " + error.message,
          data: { userId: user?.id },
        })
      }

      // Re-throw other errors
      throw error
    }
  }
}

/**
 * Validate that the user owns a specific resource
 * This adds an extra layer of security beyond RLS
 *
 * @param userDb - User-scoped database instance
 * @param resourceType - Type of resource (entity, relation, observation, assistant)
 * @param resourceId - ID of the resource to check
 * @param userId - Expected owner user ID
 */
export async function validateResourceOwnership(
  userDb: UserScopedDatabase,
  resourceType: "entity" | "relation" | "observation" | "assistant",
  resourceId: string,
  userId: string
): Promise<void> {
  let resource = null

  switch (resourceType) {
    case "entity":
      resource = await userDb.getEntity(resourceId)
      break
    case "relation":
      resource = await userDb.getRelation(resourceId)
      break
    case "observation":
      resource = await userDb.getObservation(resourceId)
      break
    case "assistant":
      // TODO: Assistant resource access not yet implemented
      resource = null
      break
    default:
      throw new Error(`Unknown resource type: ${resourceType}`)
  }

  if (!resource) {
    throw createError({
      statusCode: 404,
      statusMessage: `${resourceType} not found`,
    })
  }

  // RLS should have already filtered this, but double-check for security
  if (resource.userId !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: `Access denied to ${resourceType}`,
    })
  }
}

/**
 * Development/testing helper to set mock authentication
 * Only works in development environment
 */
export function setMockAuth(
  event: H3Event<EventHandlerRequest>,
  userId: string
): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock authentication not allowed in production")
  }

  // Set mock user ID in a way that extractUserId can find it
  setHeader(event, "x-memrok-user-id", userId)
}

/**
 * Extract user information from authentication (OIDC first, for key management)
 */
async function extractUserOidcFirst(
  event: H3Event<EventHandlerRequest>
): Promise<AuthenticatedUser | null> {
  // 1. Try OIDC session authentication first (for key management endpoints)
  try {
    const session = await getUserSession(event)

    if (session && session.userInfo) {
      return {
        id: session.userInfo.sub as string,
        email: session.userInfo.email as string,
        name: session.userInfo.name as string,
        authMethod: 'oidc',
        ...session.userInfo,
      }
    }
  } catch {
    // Session doesn't exist or is invalid, try other methods
  }

  // 2. Try API key authentication as fallback
  const apiKeyAuth = await extractApiKeyAuth(event)
  if (apiKeyAuth) {
    return apiKeyAuth
  }

  // 3. Fallback methods for development/testing
  const mcpUserId = getHeader(event, "x-memrok-user-id")
  if (mcpUserId) {
    return { 
      id: mcpUserId,
      authMethod: 'header'
    }
  }

  const query = getQuery(event)
  if (query.userId && typeof query.userId === "string") {
    return { 
      id: query.userId,
      authMethod: 'query'
    }
  }

  return null
}

/**
 * API route helper that combines common patterns
 * Handles authentication, error formatting, and response
 */
export function createAuthenticatedHandler<T>(
  handler: (
    event: H3Event<EventHandlerRequest>,
    userDb: UserScopedDatabase,
    user: AuthenticatedUser
  ) => Promise<T>
) {
  return defineEventHandler(async (event) => {
    try {
      return await withAuth(handler)(event)
    } catch (error) {
      // Log error for debugging
      console.error("API Error:", {
        url: getRequestURL(event),
        method: event.method,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Handle known error types
      if (error instanceof RLSContextError) {
        throw createError({
          statusCode: 403,
          statusMessage: error.message,
        })
      }

      // Re-throw H3 errors (they're already formatted)
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error
      }

      // Format unknown errors
      throw createError({
        statusCode: 500,
        statusMessage: "Internal server error",
        data: process.env.NODE_ENV === "development" ? error : undefined,
      })
    }
  })
}

/**
 * API route helper for key management endpoints that prioritizes OIDC authentication
 */
export function createKeyManagementHandler<T>(
  handler: (
    event: H3Event<EventHandlerRequest>,
    userDb: UserScopedDatabase,
    user: AuthenticatedUser
  ) => Promise<T>
) {
  return defineEventHandler(async (event) => {
    try {
      const user = await extractUserOidcFirst(event)

      if (!user) {
        throw createError({
          statusCode: 401,
          statusMessage: "Authentication required",
        })
      }

      const userDb = createUserDb(user.id)

      try {
        return await handler(event, userDb, user)
      } catch (error) {
        // Handle RLS errors
        if (error instanceof RLSContextError) {
          throw createError({
            statusCode: 403,
            statusMessage: "Access denied: " + error.message,
            data: { userId: user.id },
          })
        }

        // Re-throw other errors
        throw error
      }
    } catch (error) {
      // Log error for debugging
      console.error("Key Management API Error:", {
        url: getRequestURL(event),
        method: event.method,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Handle known error types
      if (error instanceof RLSContextError) {
        throw createError({
          statusCode: 403,
          statusMessage: error.message,
        })
      }

      // Re-throw H3 errors (they're already formatted)
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error
      }

      // Format unknown errors
      throw createError({
        statusCode: 500,
        statusMessage: "Internal server error",
        data: process.env.NODE_ENV === "development" ? error : undefined,
      })
    }
  })
}
