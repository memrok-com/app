import { pgTable, uuid, text, timestamp, jsonb, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { entities } from './entities'
import { assistants } from './assistants'

export const observations = pgTable('observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Zitadel user ID - owner of this observation
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // The observation text
  source: text('source'), // Where this observation came from
  metadata: jsonb('metadata'), // Additional observation data
  
  // Track who created - either user or assistant
  createdByUser: text('created_by_user'), // Zitadel user ID
  createdByAssistant: uuid('created_by_assistant').references(() => assistants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Enable RLS
  pgPolicy('observations_user_isolation_policy', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: sql`${table.userId} = current_setting('app.current_user_id')`,
    withCheck: sql`${table.userId} = current_setting('app.current_user_id')`,
  }),
]).enableRLS()