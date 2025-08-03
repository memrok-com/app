import { createKeyManagementHandler } from "../../utils/auth-middleware"
import { generateApiKey, hashApiKey } from "../../utils/api-key-service"
import { apiKeys } from "../../database/schema"
import { readBody, createError } from "h3"
import type { CreateApiKeyRequest, CreateApiKeyResponse } from "../../../app/types/api-keys"

/**
 * POST /api/keys
 * Create new API key
 */
export default createKeyManagementHandler(async (event, userDb, user) => {
  const body = await readBody(event) as CreateApiKeyRequest

  // Validate request
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "API key name is required",
    })
  }

  // Validate scopes if provided
  const validScopes = ['memories:read', 'memories:write', 'memories:delete']
  if (body.scopes) {
    const invalidScopes = body.scopes.filter(scope => !validScopes.includes(scope))
    if (invalidScopes.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid scopes: ${invalidScopes.join(', ')}`,
      })
    }
  }

  // Generate secure API key
  const { keyValue, prefix } = generateApiKey(process.env.NODE_ENV === 'production')
  const hashedKey = await hashApiKey(keyValue)

  // Create API key record
  const [newKey] = await userDb.execute(async (db) => {
    return await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        keyPrefix: prefix,
        hashedKey,
        scopes: body.scopes || ['memories:read', 'memories:write'],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: true,
        createdByUser: user.id,
      })
      .returning()
  })

  if (!newKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create API key",
    })
  }

  const response: CreateApiKeyResponse = {
    key: {
      id: newKey.id,
      name: newKey.name,
      description: newKey.description,
      prefix: newKey.keyPrefix,
      scopes: newKey.scopes as string[],
      lastUsedAt: null,
      createdAt: newKey.createdAt.toISOString(),
      expiresAt: newKey.expiresAt?.toISOString() || null,
      isActive: newKey.isActive,
      secret: keyValue, // Only returned on creation
    },
    warning: "Store this API key securely. It will not be shown again.",
  }

  return response
})