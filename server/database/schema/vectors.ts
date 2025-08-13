import { pgTable, uuid, text, timestamp, jsonb, integer, decimal } from 'drizzle-orm/pg-core'
import { entities } from './entities'
import { observations } from './observations'

/**
 * Vector embeddings table for semantic search
 * Stores vector embeddings with user-scoped RLS policies
 */
export const vectors = pgTable('vectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  
  // Reference to source content (either entity or observation)
  entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'cascade' }),
  observationId: uuid('observation_id').references(() => observations.id, { onDelete: 'cascade' }),
  
  // Vector data
  embedding: text('embedding').notNull(), // JSON string of number array
  vectorSize: integer('vector_size').notNull().default(1536),
  
  // Content metadata for search context
  content: text('content').notNull(),
  contentType: text('content_type').notNull(), // 'entity' | 'observation'
  entityName: text('entity_name'),
  entityType: text('entity_type'),
  source: text('source'),
  
  // Vector similarity ranking
  searchRank: decimal('search_rank', { precision: 10, scale: 6 }),
  
  // Creator attribution (matching memory-service pattern)
  createdByUser: text('created_by_user'),
  createdByAssistantName: text('created_by_assistant_name'),
  createdByAssistantType: text('created_by_assistant_type'),
  
  // Additional metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * Vector search cache table for performance optimization
 * Stores frequently accessed search results
 */
export const vectorSearchCache = pgTable('vector_search_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  
  // Search query hash for cache key
  queryHash: text('query_hash').notNull(),
  queryText: text('query_text').notNull(),
  
  // Cached results
  results: jsonb('results').notNull(), // Array of vector search results
  resultCount: integer('result_count').notNull().default(0),
  
  // Cache metadata
  searchParameters: jsonb('search_parameters'), // Filter, limit, threshold used
  
  // Cache expiry
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Export types for TypeScript inference
export type Vector = typeof vectors.$inferSelect
export type NewVector = typeof vectors.$inferInsert
export type VectorSearchCache = typeof vectorSearchCache.$inferSelect
export type NewVectorSearchCache = typeof vectorSearchCache.$inferInsert