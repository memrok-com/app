import { createKeyManagementHandler } from "../../utils/auth-middleware"
import { apiKeys } from "../../database/schema"
import { eq, and } from "drizzle-orm"
import { getRouterParam, createError } from "h3"
import type { ApiKey } from "../../../app/types/api-keys"

/**
 * GET /api/keys/[id]
 * Get specific API key details (without secret)
 */
export default createKeyManagementHandler(async (event, userDb, user) => {
  const keyId = getRouterParam(event, 'id')
  
  if (!keyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "API key ID is required",
    })
  }

  const [key] = await userDb.execute(async (db) => {
    return await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        description: apiKeys.description,
        prefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, user.id)
        )
      )
      .limit(1)
  })

  if (!key) {
    throw createError({
      statusCode: 404,
      statusMessage: "API key not found",
    })
  }

  const response: ApiKey = {
    ...key,
    scopes: key.scopes as string[],
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() || null,
    lastUsedAt: key.lastUsedAt?.toISOString() || null,
  }

  return response
})