/**
 * Shared types for API responses
 */

export interface PaginationMeta {
  limit: number
  offset: number
  total: number
}

export interface EntityReference {
  id: string
  name: string
  type: string
}
