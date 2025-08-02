import type { UserScopedDatabase } from "../database/user-scoped-db"
import { 
  validateEntityInput, 
  validateRelationInput, 
  validateObservationInput,
  validateSearchInput,
  sanitizeMetadata
} from "../utils/mcp-security"
import { 
  createNotFoundError
} from "../utils/mcp-errors"
import { like, and, eq, sql } from "drizzle-orm"
import * as schema from "../database/schema"

// DTOs for consistent data shapes
export interface EntityDTO {
  id: string
  name: string
  type: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  createdBy: {
    user?: string
    assistant?: { name: string; type?: string }
  }
}

export interface RelationDTO {
  id: string
  subjectId: string
  objectId: string
  predicate: string
  strength?: number
  metadata?: Record<string, unknown>
  createdAt: Date
  subjectEntity?: EntityDTO
  objectEntity?: EntityDTO
}

export interface ObservationDTO {
  id: string
  entityId: string
  content: string
  source?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  entity?: EntityDTO
}

export interface SearchResults {
  entities: EntityDTO[]
  observations: ObservationDTO[]
  totalCount: number
}

export interface CreatorContext {
  createdByUser?: string
  createdByAssistantName?: string
  createdByAssistantType?: string
}

/**
 * Unified service layer for memory operations
 * Used by both MCP tools and REST API endpoints
 */
export class MemoryService {
  constructor(private userDb: UserScopedDatabase) {}

  // ==================== ENTITY OPERATIONS ====================

  async createEntity(
    data: {
      name: string
      type: string
      description?: string
      metadata?: Record<string, unknown>
    },
    creator: CreatorContext
  ): Promise<EntityDTO> {
    // Validate input
    const validated = validateEntityInput.parse(data)
    
    // Create entity
    const entity = await this.userDb.createEntity({
      name: validated.name,
      type: validated.type,
      metadata: validated.description 
        ? { ...sanitizeMetadata(data.metadata || {}), description: validated.description }
        : data.metadata ? sanitizeMetadata(data.metadata) : undefined,
      ...creator,
    })

    return this.toEntityDTO(entity as unknown as Record<string, unknown>)
  }

  async getEntity(entityId: string): Promise<EntityDTO | null> {
    const entity = await this.userDb.getEntity(entityId)
    return entity ? this.toEntityDTO(entity) : null
  }

  async getEntities(filters?: {
    type?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<EntityDTO[]> {
    const entities = await this.userDb.getEntities(filters)
    return entities.map((e) => this.toEntityDTO(e))
  }

  async updateEntity(
    entityId: string,
    data: {
      name?: string
      type?: string
      description?: string
      metadata?: Record<string, unknown>
    },
    updater: CreatorContext
  ): Promise<EntityDTO> {
    // Validate input
    const validated: Record<string, unknown> = {}
    if (data.name) validated.name = validateEntityInput.shape.name.parse(data.name)
    if (data.type) validated.type = validateEntityInput.shape.type.parse(data.type)
    if (data.description) validated.description = validateEntityInput.shape.description.parse(data.description)
    
    const metadata = data.description 
      ? { ...sanitizeMetadata(data.metadata || {}), description: validated.description }
      : data.metadata ? sanitizeMetadata(data.metadata) : undefined

    const updated = await this.userDb.updateEntity(entityId, {
      ...validated,
      metadata,
      updatedByUser: updater.createdByUser,
      updatedByAssistantName: updater.createdByAssistantName,
      updatedByAssistantType: updater.createdByAssistantType,
    })

    if (!updated) {
      throw createNotFoundError("entity", entityId)
    }

    return this.toEntityDTO(updated)
  }

  async deleteEntity(entityId: string): Promise<void> {
    const deleted = await this.userDb.deleteEntity(entityId)
    if (!deleted) {
      throw createNotFoundError("entity", entityId)
    }
  }

  // ==================== RELATION OPERATIONS ====================

  async createRelation(
    data: {
      subjectId: string
      objectId: string
      predicate: string
      strength?: number
      metadata?: Record<string, unknown>
    },
    creator: CreatorContext
  ): Promise<RelationDTO> {
    // Validate input
    const validated = validateRelationInput.parse(data)
    
    // Verify entities exist
    const [subject, object] = await Promise.all([
      this.userDb.getEntity(validated.subjectId),
      this.userDb.getEntity(validated.objectId),
    ])

    if (!subject) {
      throw createNotFoundError("entity", validated.subjectId)
    }
    if (!object) {
      throw createNotFoundError("entity", validated.objectId)
    }

    // Create relation
    const relation = await this.userDb.createRelation({
      subjectId: validated.subjectId,
      objectId: validated.objectId,
      predicate: validated.predicate,
      strength: data.strength,
      metadata: data.metadata ? sanitizeMetadata(data.metadata) : undefined,
      ...creator,
    })

    return this.toRelationDTO(
      relation as unknown as Record<string, unknown>, 
      subject as unknown as Record<string, unknown>, 
      object as unknown as Record<string, unknown>
    )
  }

  async getRelation(relationId: string): Promise<RelationDTO | null> {
    const relation = await this.userDb.getRelation(relationId)
    if (!relation) return null

    const [subject, object] = await Promise.all([
      this.userDb.getEntity(relation.subjectId),
      this.userDb.getEntity(relation.objectId),
    ])

    return this.toRelationDTO(relation, subject, object)
  }

  async getEntityRelations(
    entityId: string,
    direction: "from" | "to" | "both" = "both"
  ): Promise<RelationDTO[]> {
    // Verify entity exists
    const entity = await this.userDb.getEntity(entityId)
    if (!entity) {
      throw createNotFoundError("entity", entityId)
    }

    // Get relations based on direction
    let relations: Record<string, unknown>[] = []
    
    if (direction === "from" || direction === "both") {
      const fromRelations = await this.userDb.getRelations({ subjectId: entityId })
      relations.push(...fromRelations)
    }
    
    if (direction === "to" || direction === "both") {
      const toRelations = await this.userDb.getRelations({ objectId: entityId })
      relations.push(...toRelations)
    }

    // Remove duplicates if both directions
    if (direction === "both") {
      const uniqueIds = new Set<string>()
      relations = relations.filter((r) => {
        if (uniqueIds.has(r.id as string)) return false
        uniqueIds.add(r.id as string)
        return true
      })
    }

    // Get entity details for each relation
    const relationDTOs = await Promise.all(
      relations.map(async (relation) => {
        const [subject, object] = await Promise.all([
          this.userDb.getEntity(relation.subjectId as string),
          this.userDb.getEntity(relation.objectId as string),
        ])
        return this.toRelationDTO(
          relation, 
          subject as unknown as Record<string, unknown> | null, 
          object as unknown as Record<string, unknown> | null
        )
      })
    )

    return relationDTOs
  }

  async deleteRelation(relationId: string): Promise<void> {
    const deleted = await this.userDb.deleteRelation(relationId)
    if (!deleted) {
      throw createNotFoundError("relation", relationId)
    }
  }

  // ==================== OBSERVATION OPERATIONS ====================

  async createObservation(
    data: {
      entityId: string
      content: string
      source?: string
      metadata?: Record<string, unknown>
    },
    creator: CreatorContext
  ): Promise<ObservationDTO> {
    // Validate input
    const validated = validateObservationInput.parse(data)
    
    // Verify entity exists
    const entity = await this.userDb.getEntity(validated.entityId)
    if (!entity) {
      throw createNotFoundError("entity", validated.entityId)
    }

    // Create observation
    const observation = await this.userDb.createObservation({
      entityId: validated.entityId,
      content: validated.content,
      source: data.source,
      metadata: validated.metadata,
      ...creator,
    })

    return this.toObservationDTO(
      observation as unknown as Record<string, unknown>, 
      entity as unknown as Record<string, unknown>
    )
  }

  async getObservation(observationId: string): Promise<ObservationDTO | null> {
    const observation = await this.userDb.getObservation(observationId)
    if (!observation) return null

    const entity = await this.userDb.getEntity(observation.entityId)
    return this.toObservationDTO(observation, entity)
  }

  async getEntityObservations(entityId: string): Promise<ObservationDTO[]> {
    // Verify entity exists
    const entity = await this.userDb.getEntity(entityId)
    if (!entity) {
      throw createNotFoundError("entity", entityId)
    }

    const observations = await this.userDb.getObservations({ entityId })
    return observations.map((o) => this.toObservationDTO(o, entity))
  }

  async deleteObservation(observationId: string): Promise<void> {
    const deleted = await this.userDb.deleteObservation(observationId)
    if (!deleted) {
      throw createNotFoundError("observation", observationId)
    }
  }

  // ==================== SEARCH OPERATIONS ====================

  async searchMemories(params: {
    query: string
    entityTypes?: string[]
    limit?: number
  }): Promise<SearchResults> {
    // Validate input
    const validated = validateSearchInput.parse(params)
    
    // Handle wildcard searches - convert * to % for SQL LIKE, or use % for "all" searches
    let searchQuery: string
    if (validated.query === '*' || validated.query === '' || validated.query.toLowerCase() === 'all') {
      // For wildcard/all searches, match everything
      searchQuery = '%'
    } else {
      // For regular searches, wrap with wildcards
      searchQuery = `%${validated.query.toLowerCase()}%`
    }

    // Search entities with database filtering
    const entityResults = await this.userDb.execute(async (db) => {
      const query = db
        .select()
        .from(schema.entities)
        .where(
          and(
            like(sql`LOWER(${schema.entities.name})`, searchQuery),
            validated.entityTypes?.length
              ? sql`${schema.entities.type} = ANY(${validated.entityTypes})`
              : undefined
          )
        )
        .limit(validated.limit)

      return await query
    })

    // Search observations with database filtering
    const observationResults = await this.userDb.execute(async (db) => {
      const results = await db
        .select({
          observation: schema.observations,
          entity: schema.entities,
        })
        .from(schema.observations)
        .innerJoin(
          schema.entities,
          eq(schema.observations.entityId, schema.entities.id)
        )
        .where(like(sql`LOWER(${schema.observations.content})`, searchQuery))
        .limit(validated.limit)

      return results
    })

    // Convert to DTOs
    const entities = entityResults.map((e) => this.toEntityDTO(e))
    const observations = observationResults.map((r) =>
      this.toObservationDTO(r.observation, r.entity)
    )

    return {
      entities,
      observations,
      totalCount: entities.length + observations.length,
    }
  }

  // ==================== BATCH OPERATIONS ====================

  async batchCreateEntities(
    entities: Array<{
      name: string
      type: string
      description?: string
      metadata?: Record<string, unknown>
    }>,
    creator: CreatorContext
  ): Promise<EntityDTO[]> {
    // Validate all inputs first
    const validated = entities.map((e) => validateEntityInput.parse(e))

    // Create entities in transaction
    const created = await this.userDb.transaction(async (tx) => {
      const results = []
      for (const entity of validated) {
        const result = await tx
          .insert(schema.entities)
          .values({
            userId: this.userDb["userId"],
            name: entity.name,
            type: entity.type,
            metadata: entity.description
              ? { description: entity.description }
              : undefined,
            ...creator,
          })
          .returning()
        results.push(result[0])
      }
      return results
    })

    return created.map((e) => this.toEntityDTO(e as unknown as Record<string, unknown>))
  }

  // ==================== CONVERSION HELPERS ====================

  private toEntityDTO(entity: Record<string, unknown>): EntityDTO {
    const metadata = entity.metadata as Record<string, unknown> | undefined
    return {
      id: entity.id as string,
      name: entity.name as string,
      type: entity.type as string,
      description: metadata?.description as string | undefined,
      metadata,
      createdAt: entity.createdAt as Date,
      updatedAt: entity.updatedAt as Date,
      createdBy: {
        user: entity.createdByUser as string | undefined,
        assistant: entity.createdByAssistantName
          ? {
              name: entity.createdByAssistantName as string,
              type: entity.createdByAssistantType as string | undefined,
            }
          : undefined,
      },
    }
  }

  private toRelationDTO(
    relation: Record<string, unknown>,
    subjectEntity: Record<string, unknown> | null,
    objectEntity: Record<string, unknown> | null
  ): RelationDTO {
    return {
      id: relation.id as string,
      subjectId: relation.subjectId as string,
      objectId: relation.objectId as string,
      predicate: relation.predicate as string,
      strength: relation.strength as number | undefined,
      metadata: relation.metadata as Record<string, unknown> | undefined,
      createdAt: relation.createdAt as Date,
      subjectEntity: subjectEntity ? this.toEntityDTO(subjectEntity) : undefined,
      objectEntity: objectEntity ? this.toEntityDTO(objectEntity) : undefined,
    }
  }

  private toObservationDTO(
    observation: Record<string, unknown>,
    entity: Record<string, unknown> | null
  ): ObservationDTO {
    return {
      id: observation.id as string,
      entityId: observation.entityId as string,
      content: observation.content as string,
      source: observation.source as string | undefined,
      metadata: observation.metadata as Record<string, unknown> | undefined,
      createdAt: observation.createdAt as Date,
      entity: entity ? this.toEntityDTO(entity) : undefined,
    }
  }
}