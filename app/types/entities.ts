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
  metadata: unknown
  createdByUser: string | null
  createdByAssistant: string | null
  createdAt: string // Serialized date from API
  updatedByUser: string | null
  updatedByAssistant: string | null
  updatedAt: string // Serialized date from API

  // Additional fields from joins and counts
  createdByAssistantName: string | null
  createdByAssistantType: string | null
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
