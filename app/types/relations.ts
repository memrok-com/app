/**
 * Relation types for API responses
 */

import type { PaginationMeta, EntityReference } from "./shared"

export interface RelationData {
  id: string
  userId: string
  subjectId: string
  predicate: string
  objectId: string
  strength?: number | null
  metadata?: any
  createdByUser?: string | null
  createdByAssistantName?: string | null
  createdByAssistantType?: string | null
  createdAt: string
  subjectEntity?: EntityReference | null
  objectEntity?: EntityReference | null
}

export interface RelationsApiResponse {
  relations: RelationData[]
  pagination: PaginationMeta
}

export interface CreateRelationResponse {
  relation: RelationData
}

export interface PredicatesApiResponse {
  predicates: Array<{
    predicate: string
    count: number
    avgStrength: number
  }>
}
