import { pgTable, uuid, text, timestamp, jsonb, pgPolicy, boolean, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Zitadel user ID - owner of this API key
  
  // Key identification
  name: text('name').notNull(), // User-friendly name
  description: text('description'), // Optional description
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for identification (e.g., "mk_live_")
  
  // Security
  hashedKey: text('hashed_key').notNull(), // Argon2id hashed API key
  scopes: jsonb('scopes').$type<string[]>().default([]).notNull(), // ['memories:read', 'memories:write']
  
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  
  // Usage tracking
  lastUsedAt: timestamp('last_used_at'),
  lastUsedIp: text('last_used_ip'),
  usageCount: text('usage_count').default('0').notNull(), // Using text to avoid bigint issues
  
  // Lifecycle
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  
  // Audit
  createdByUser: text('created_by_user').notNull(), // Who created this key
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Enable RLS
  pgPolicy('api_keys_user_isolation_policy', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: sql`${table.userId} = current_setting('app.current_user_id')`,
    withCheck: sql`${table.userId} = current_setting('app.current_user_id')`,
  }),
  // Indexes for performance
  index('api_keys_user_id_idx').on(table.userId),
  index('api_keys_prefix_idx').on(table.keyPrefix),
  index('api_keys_user_active_idx').on(table.userId, table.isActive),
]).enableRLS()