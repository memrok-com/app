import { randomBytes } from 'crypto'
import * as argon2 from 'argon2'
import type { DatabaseWithSchema } from '../database/rls-context'
import { apiKeys } from '../database/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Generate a secure API key
 */
export function generateApiKey(isProduction = true): { keyValue: string; prefix: string } {
  const prefix = isProduction ? 'mk_live_' : 'mk_test_'
  const randomPart = randomBytes(32).toString('base64url')
  const keyValue = `${prefix}${randomPart}`
  
  return {
    keyValue,
    prefix: keyValue.substring(0, 8), // First 8 chars for identification
  }
}

/**
 * Hash an API key using Argon2id
 */
export async function hashApiKey(keyValue: string): Promise<string> {
  return argon2.hash(keyValue, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  })
}

/**
 * Verify an API key against a hash (constant-time comparison)
 */
export async function verifyApiKey(keyValue: string, hashedKey: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedKey, keyValue)
  } catch {
    return false
  }
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(keyValue: string): boolean {
  return /^mk_(live|test)_[a-zA-Z0-9_-]{32,}$/.test(keyValue)
}

/**
 * Check if user has any API keys
 */
export async function userHasApiKeys(
  db: DatabaseWithSchema, 
  userId: string
): Promise<boolean> {
  const count = await db
    .select({ count: apiKeys.id })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.isActive, true)
      )
    )

  return count.length > 0
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  db: DatabaseWithSchema,
  userId: string,
  name: string,
  description?: string,
  scopes: string[] = ['memories:read', 'memories:write'],
  expiresInDays?: number
): Promise<{ id: string; key: string; prefix: string }> {
  const { keyValue, prefix } = generateApiKey(process.env.NODE_ENV === 'production')
  const hashedKey = await hashApiKey(keyValue)
  
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      description,
      keyPrefix: prefix,
      hashedKey,
      scopes,
      isActive: true,
      expiresAt,
      createdByUser: userId,
    })
    .returning()

  if (!newKey) {
    throw new Error('Failed to create API key')
  }

  return {
    id: newKey.id,
    key: keyValue, // Return the actual key only on creation
    prefix: newKey.keyPrefix,
  }
}

/**
 * List all active API keys for a user (without the actual key values)
 */
export async function listUserApiKeys(
  db: DatabaseWithSchema,
  userId: string
): Promise<Array<{
  id: string
  name: string
  description: string | null
  prefix: string
  scopes: string[]
  lastUsedAt: Date | null
  createdAt: Date
  expiresAt: Date | null
}>> {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      description: apiKeys.description,
      prefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.isActive, true)
      )
    )
    .orderBy(apiKeys.createdAt)
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  db: DatabaseWithSchema,
  userId: string,
  keyId: string,
  reason?: string
): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, userId),
        eq(apiKeys.isActive, true)
      )
    )
    .returning()

  return result.length > 0
}

/**
 * Find and validate API key from database
 */
export async function findApiKeyByValue(
  db: DatabaseWithSchema,
  keyValue: string
): Promise<{
  id: string
  userId: string
  scopes: string[]
} | null> {
  if (!isValidApiKeyFormat(keyValue)) {
    return null
  }

  const prefix = keyValue.substring(0, 8)
  
  // Find all keys with matching prefix (should be very few)
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        eq(apiKeys.isActive, true)
      )
    )

  // Check each candidate with constant-time comparison
  for (const candidate of candidates) {
    const isValid = await verifyApiKey(keyValue, candidate.hashedKey)
    if (isValid) {
      // Check expiration
      if (candidate.expiresAt && new Date() > candidate.expiresAt) {
        return null
      }

      // Update usage stats (async, don't wait)
      db.update(apiKeys)
        .set({
          lastUsedAt: new Date(),
          usageCount: String(parseInt(candidate.usageCount) + 1),
        })
        .where(eq(apiKeys.id, candidate.id))
        .execute()
        .catch(console.error)

      return {
        id: candidate.id,
        userId: candidate.userId,
        scopes: candidate.scopes as string[],
      }
    }
  }

  return null
}