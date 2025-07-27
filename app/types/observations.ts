/**
 * Observation types for API responses
 */

import type { PaginationMeta, EntityReference } from "./shared"

export interface ObservationData {
  id: string
  userId: string
  entityId: string
  content: string
  source?: string | null
  metadata?: any
  createdByUser?: string | null
  createdByAssistantName?: string | null
  createdByAssistantType?: string | null
  createdAt: string
  entity?: EntityReference | null
}

export interface ObservationsApiResponse {
  observations: ObservationData[]
  pagination: PaginationMeta
}

export interface CreateObservationResponse {
  observation: ObservationData
}

export interface ObservationStatsResponse {
  total: number
  recentActivity: number
  byEntityType: Array<{
    entityType: string
    count: number
  }>
}
