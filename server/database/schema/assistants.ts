import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const assistants = pgTable('assistants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'claude', 'cursor', 'vscode', etc.
  externalId: text('external_id'), // ID from MCP protocol
  config: jsonb('config'), // Assistant-specific configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})