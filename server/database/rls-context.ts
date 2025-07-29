import { sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type * as schema from "./schema"

/**
 * Database utilities for Row Level Security (RLS) user context management
 *
 * These utilities ensure that all database operations are performed with the proper
 * user context set via PostgreSQL's current_setting() function, enabling RLS
 * policies to correctly isolate data by user.
 */

export type DatabaseWithSchema = PostgresJsDatabase<typeof schema>

/**
 * Sets the current user context for RLS policies
 * This must be called before any database operations that depend on RLS
 *
 * @param db - Drizzle database instance
 * @param userId - Zitadel user ID to set as the current user context
 */
export async function setUserContext(
  db: DatabaseWithSchema,
  userId: string
): Promise<void> {
  if (!userId || typeof userId !== "string") {
    throw new Error("User ID is required and must be a non-empty string")
  }

  try {
    // Try with a simple string literal instead of parameter binding
    await db.execute(
      sql.raw(`SET LOCAL app.current_user_id = '${userId.replace("'", "''")}'`)
    )
  } catch (error) {
    console.error("Failed to set user context:", error)
    console.error("User ID:", userId)
    console.error("User ID type:", typeof userId)
    throw new Error(
      `Failed to set user context for user ${userId}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  }
}

/**
 * Clears the current user context
 * Useful for cleanup or administrative operations
 *
 * @param db - Drizzle database instance
 */
export async function clearUserContext(db: DatabaseWithSchema): Promise<void> {
  await db.execute(sql`SET LOCAL app.current_user_id = ''`)
}

/**
 * Gets the currently set user context
 * Returns null if no context is set
 *
 * @param db - Drizzle database instance
 * @returns The current user ID or null
 */
export async function getCurrentUserContext(
  db: DatabaseWithSchema
): Promise<string | null> {
  try {
    const result = await db.execute(
      sql`SELECT current_setting('app.current_user_id', true) as user_id`
    )
    const userId = result[0]?.user_id as string
    return userId && userId !== "" ? userId : null
  } catch (error) {
    // current_setting() throws an error if the setting doesn't exist
    // We handle this gracefully by returning null
    return null
  }
}

/**
 * Executes a function with a specific user context, ensuring cleanup
 * This is the recommended way to perform database operations with RLS
 *
 * @param db - Drizzle database instance
 * @param userId - Zitadel user ID to set as context
 * @param operation - Function to execute with the user context
 * @returns The result of the operation
 */
export async function withUserContext<T>(
  db: DatabaseWithSchema,
  userId: string,
  operation: (db: DatabaseWithSchema) => Promise<T>
): Promise<T> {
  // Validate user ID
  if (!userId || typeof userId !== "string") {
    throw new Error("User ID is required and must be a non-empty string")
  }

  // Use a transaction to ensure SET LOCAL works properly
  return await db.transaction(async (tx) => {
    // Set user context within the transaction
    await tx.execute(
      sql.raw(`SET LOCAL app.current_user_id = '${userId.replace("'", "''")}'`)
    )

    // Execute the operation with the transaction
    return await operation(tx)

    // SET LOCAL is automatically cleared when transaction ends
  })
}

/**
 * Creates a database instance with user context pre-set
 * This is useful for long-running operations or when you need multiple
 * operations with the same user context
 *
 * WARNING: You must manually call clearUserContext() when done, or ensure
 * the database connection is properly closed/returned to pool
 *
 * @param db - Drizzle database instance
 * @param userId - Zitadel user ID to set as context
 * @returns Database instance with user context set
 */
export async function createUserContextDb(
  db: DatabaseWithSchema,
  userId: string
): Promise<DatabaseWithSchema> {
  await setUserContext(db, userId)
  return db
}

/**
 * Validates that a user context is set and matches the expected user
 * Throws an error if context is not set or doesn't match
 *
 * @param db - Drizzle database instance
 * @param expectedUserId - Expected user ID to validate against
 */
export async function validateUserContext(
  db: DatabaseWithSchema,
  expectedUserId: string
): Promise<void> {
  const currentUserId = await getCurrentUserContext(db)

  if (!currentUserId) {
    throw new Error(
      "No user context is set. Call setUserContext() before database operations."
    )
  }

  if (currentUserId !== expectedUserId) {
    throw new Error(
      `User context mismatch. Expected: ${expectedUserId}, Got: ${currentUserId}`
    )
  }
}

/**
 * Transaction wrapper that ensures user context is maintained
 * PostgreSQL SET LOCAL settings are automatically scoped to transactions
 *
 * @param db - Drizzle database instance
 * @param userId - Zitadel user ID to set as context
 * @param operation - Transaction function to execute
 * @returns The result of the transaction
 */
export async function withUserContextTransaction<T>(
  db: DatabaseWithSchema,
  userId: string,
  operation: (tx: DatabaseWithSchema) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set user context within the transaction
    await setUserContext(tx, userId)

    // Execute the operation
    return await operation(tx)

    // Note: SET LOCAL is automatically cleared when transaction ends
  })
}

/**
 * Error class for RLS context-related errors
 */
export class RLSContextError extends Error {
  constructor(message: string, public readonly userId?: string) {
    super(message)
    this.name = "RLSContextError"
  }
}

/**
 * Middleware helper for API handlers to ensure user context is set
 * This should be used in API routes to automatically set user context
 *
 * @param db - Drizzle database instance
 * @param userId - User ID extracted from authentication
 * @param handler - Database operation handler
 * @returns Promise with the handler result
 */
export async function withAuthenticatedUserContext<T>(
  db: DatabaseWithSchema,
  userId: string | undefined,
  handler: (db: DatabaseWithSchema) => Promise<T>
): Promise<T> {
  if (!userId) {
    throw new RLSContextError("Authentication required: No user ID provided")
  }

  return await withUserContext(db, userId, handler)
}
