import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { entities } from './entities'
import { assistants } from './assistants'

export const observations = pgTable('observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // The observation text
  observedAt: timestamp('observed_at').notNull(), // When the observation occurred
  source: text('source'), // Where this observation came from
  metadata: jsonb('metadata'), // Additional observation data
  
  // Track who created - either user or assistant
  createdByUser: text('created_by_user'), // Zitadel user ID
  createdByAssistant: uuid('created_by_assistant').references(() => assistants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})