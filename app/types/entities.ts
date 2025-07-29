/**
 * Shared entity types for use in both server and client code
 * These match the structure returned by the API endpoints
 *
 * Type Strategy:
 * - Server-side: Use Drizzle schema types directly (InferSelectModel, InferInsertModel)
 * - Client-side: Use these shared types that represent API responses
 * - API boundaries: These types define the contract between server and client
 */

// Entity with additional fields from getEntitiesWithCounts
// This is the type returned by the /api/entities endpoint
export type EntityWithCounts = {
  // Base entity fields from database schema
  id: string
  userId: string
  type: string
  name: string
  metadata: Record<string, unknown> | null
  createdByUser: string | null
  createdByAssistantName: string | null
  createdByAssistantType: string | null
  createdAt: string // Serialized date from API
  updatedByUser: string | null
  updatedByAssistantName: string | null
  updatedByAssistantType: string | null
  updatedAt: string // Serialized date from API

  // Additional fields and counts
  relationsCount: number
  observationsCount: number
  createdByAssistantInfo: {
    name: string
    type: string | null
  } | null
}

// API response type for GET /api/entities
export type EntitiesApiResponse = {
  entities: EntityWithCounts[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}
