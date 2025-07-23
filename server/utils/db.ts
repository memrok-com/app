import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

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
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export { schema }