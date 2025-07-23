import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { assistants } from './assistants'

export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // e.g., 'person', 'project', 'concept', etc.
  name: text('name').notNull(),
  metadata: jsonb('metadata'), // Flexible JSON storage for entity-specific data
  
  // Track who created/updated - either user or assistant
  createdByUser: text('created_by_user'), // Zitadel user ID
  createdByAssistant: uuid('created_by_assistant').references(() => assistants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  updatedByUser: text('updated_by_user'), // Zitadel user ID
  updatedByAssistant: uuid('updated_by_assistant').references(() => assistants.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})