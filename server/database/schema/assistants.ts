import { pgTable, uuid, text, timestamp, jsonb, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const assistants = pgTable('assistants', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Zitadel user ID - owner of this assistant
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'claude', 'cursor', 'vscode', etc.
  externalId: text('external_id'), // ID from MCP protocol
  config: jsonb('config'), // Assistant-specific configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Enable RLS
  pgPolicy('assistants_user_isolation_policy', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: sql`${table.userId} = current_setting('app.current_user_id')`,
    withCheck: sql`${table.userId} = current_setting('app.current_user_id')`,
  }),
]).enableRLS()