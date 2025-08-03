import { createKeyManagementHandler } from "../../utils/auth-middleware"
import { apiKeys } from "../../database/schema"
import { eq, and } from "drizzle-orm"
import { getQuery } from "h3"
import type { ApiKeysResponse } from "../../../app/types/api-keys"

/**
 * GET /api/keys
 * List user's API keys (excluding secret values)
 */
export default createKeyManagementHandler(async (event, userDb, _user) => {
  const query = getQuery(event)
  const {
    limit = 50,
    offset = 0,
    includeInactive = false,
  } = query

  const filters = {
    limit: Math.min(parseInt(limit as string) || 50, 100), // Max 100
    offset: parseInt(offset as string) || 0,
    includeInactive: includeInactive === 'true',
  }

  // Build query conditions
  const conditions = [eq(apiKeys.userId, _user.id)]
  if (!filters.includeInactive) {
    conditions.push(eq(apiKeys.isActive, true))
  }

  const keys = await userDb.execute(async (db) => {
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
      .where(and(...conditions))
      .orderBy(apiKeys.createdAt)
      .limit(filters.limit)
      .offset(filters.offset)
  })
  
  const response: ApiKeysResponse = {
    keys: keys.map(key => ({
      ...key,
      scopes: key.scopes as string[],
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString() || null,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
    })),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total: keys.length, // TODO: Could be enhanced with actual count query
    },
  }

  return response
})