import { createKeyManagementHandler } from "../../utils/auth-middleware"
import { apiKeys } from "../../database/schema"
import { eq, and } from "drizzle-orm"
import { getRouterParam, createError } from "h3"
import type { DeleteApiKeyResponse } from "../../../app/types/api-keys"

/**
 * DELETE /api/keys/[id]
 * Delete/revoke API key
 */
export default createKeyManagementHandler(async (event, userDb, user) => {
  const keyId = getRouterParam(event, 'id')
  
  if (!keyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "API key ID is required",
    })
  }

  // First, check if the key exists and belongs to the user
  const [existingKey] = await userDb.execute(async (db) => {
    return await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
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

  if (!existingKey) {
    throw createError({
      statusCode: 404,
      statusMessage: "API key not found",
    })
  }


  // Soft delete by marking as revoked
  await userDb.execute(async (db) => {
    return await db
      .update(apiKeys)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'User requested deletion',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, user.id)
        )
      )
  })

  const response: DeleteApiKeyResponse = {
    success: true,
    message: `API key "${existingKey.name}" has been revoked successfully.`,
  }

  return response
})