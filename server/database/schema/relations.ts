import { pgTable, uuid, text, timestamp, jsonb, real, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { entities } from './entities'
import { assistants } from './assistants'

export const relations = pgTable('relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Zitadel user ID - owner of this relation
  subjectId: uuid('subject_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  predicate: text('predicate').notNull(), // e.g., 'works_on', 'knows', 'uses', etc.
  objectId: uuid('object_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  strength: real('strength').default(1.0), // Optional: relationship strength/confidence
  metadata: jsonb('metadata'), // Additional relationship data
  
  // Track who created - either user or assistant
  createdByUser: text('created_by_user'), // Zitadel user ID
  createdByAssistant: uuid('created_by_assistant').references(() => assistants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Enable RLS
  pgPolicy('relations_user_isolation_policy', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: sql`${table.userId} = current_setting('app.current_user_id')`,
    withCheck: sql`${table.userId} = current_setting('app.current_user_id')`,
  }),
]).enableRLS()