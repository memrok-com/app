import { pgTable, uuid, text, timestamp, jsonb, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Zitadel user ID - owner of this entity
  type: text('type').notNull(), // e.g., 'person', 'project', 'concept', etc.
  name: text('name').notNull(),
  metadata: jsonb('metadata'), // Flexible JSON storage for entity-specific data
  
  // Track who created/updated - either user or assistant
  createdByUser: text('created_by_user'), // Zitadel user ID
  createdByAssistantName: text('created_by_assistant_name'), // Assistant display name
  createdByAssistantType: text('created_by_assistant_type'), // Assistant type (claude, cursor, etc)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  updatedByUser: text('updated_by_user'), // Zitadel user ID
  updatedByAssistantName: text('updated_by_assistant_name'), // Assistant display name
  updatedByAssistantType: text('updated_by_assistant_type'), // Assistant type (claude, cursor, etc)
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Enable RLS
  pgPolicy('entities_user_isolation_policy', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: sql`${table.userId} = current_setting('app.current_user_id')`,
    withCheck: sql`${table.userId} = current_setting('app.current_user_id')`,
  }),
]).enableRLS()