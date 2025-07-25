import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'
import { UserScopedDatabase } from '../database/user-scoped-db'
import type { DatabaseWithSchema } from '../database/rls-context'

// Get database configuration from environment variables
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.MEMROK_DB_USER}:${process.env.MEMROK_DB_PASSWORD}@${process.env.MEMROK_DB_HOST || 'localhost'}:${process.env.MEMROK_DB_PORT || '5432'}/${process.env.MEMROK_DB_NAME || 'memrok'}`

// Create the connection
const queryClient = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 30,
  connect_timeout: 30,
})

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema }) as DatabaseWithSchema

// Export schema for convenience
export { schema }

// Export RLS utilities
export * from '../database/rls-context'
export { UserScopedDatabase } from '../database/user-scoped-db'

/**
 * Helper function to create a user-scoped database instance
 * This is the recommended way to perform database operations with RLS
 * 
 * @param userId - Zitadel user ID
 * @returns UserScopedDatabase instance
 */
export function createUserDb(userId: string): UserScopedDatabase {
  return UserScopedDatabase.create(db, userId)
}

/**
 * Helper function to create a user-scoped database instance with immediate context
 * Use this when you need the database context set immediately
 * 
 * @param userId - Zitadel user ID
 * @returns Promise<UserScopedDatabase> instance with context pre-set
 */
export async function createUserDbWithContext(userId: string): Promise<UserScopedDatabase> {
  return await UserScopedDatabase.createWithContext(db, userId)
}