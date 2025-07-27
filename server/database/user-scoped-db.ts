import { eq, and, count, or, desc, asc } from "drizzle-orm"
import * as schema from "./schema"
import {
  withUserContext,
  withUserContextTransaction,
  setUserContext,
  type DatabaseWithSchema,
} from "./rls-context"

/**
 * User-scoped database operations that automatically handle RLS context
 *
 * This class provides a high-level interface for database operations that
 * automatically sets the appropriate user context for RLS policies.
 * All operations are scoped to a specific user.
 */
export class UserScopedDatabase {
  constructor(
    private readonly db: DatabaseWithSchema,
    private readonly userId: string
  ) {
    if (!userId || typeof userId !== "string") {
      throw new Error("User ID is required and must be a non-empty string")
    }
  }

  /**
   * Execute a custom operation with user context
   */
  async execute<T>(
    operation: (db: DatabaseWithSchema) => Promise<T>
  ): Promise<T> {
    return await withUserContext(this.db, this.userId, operation)
  }

  /**
   * Execute a transaction with user context
   */
  async transaction<T>(
    operation: (tx: DatabaseWithSchema) => Promise<T>
  ): Promise<T> {
    return await withUserContextTransaction(this.db, this.userId, operation)
  }


  // ==================== ENTITY OPERATIONS ====================

  /**
   * Create a new entity
   */
  async createEntity(data: {
    type: string
    name: string
    metadata?: any
    createdByUser?: string
    createdByAssistantName?: string
    createdByAssistantType?: string
  }) {
    return await this.execute(async (db) => {
      const [entity] = await db
        .insert(schema.entities)
        .values({
          userId: this.userId,
          type: data.type,
          name: data.name,
          metadata: data.metadata,
          createdByUser: data.createdByUser,
          createdByAssistantName: data.createdByAssistantName,
          createdByAssistantType: data.createdByAssistantType,
        })
        .returning()
      return entity
    })
  }

  /**
   * Get entities with optional filtering
   */
  async getEntities(filters?: {
    type?: string
    search?: string
    createdByUser?: string
    createdByAssistantName?: string
    limit?: number
    offset?: number
  }) {
    return await this.execute(async (db) => {
      // Build query with method chaining to maintain type inference
      const baseQuery = db.select().from(schema.entities)

      // Apply filters
      const conditions = []
      if (filters?.type) {
        conditions.push(eq(schema.entities.type, filters.type))
      }
      if (filters?.createdByUser) {
        conditions.push(
          eq(schema.entities.createdByUser, filters.createdByUser)
        )
      }
      if (filters?.createdByAssistantName) {
        conditions.push(
          eq(schema.entities.createdByAssistantName, filters.createdByAssistantName)
        )
      }

      // Build final query with chaining
      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

      // Apply pagination with chaining
      const finalQuery = filters?.offset
        ? query.offset(filters.offset).limit(filters?.limit || 100)
        : filters?.limit
        ? query.limit(filters.limit)
        : query

      return await finalQuery
    })
  }

  /**
   * Get entities with relation and observation counts
   */
  async getEntitiesWithCounts(filters?: {
    type?: string
    search?: string
    createdByUser?: string
    createdByAssistantName?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
  }) {
    return await this.execute(async (db) => {
      // Get entities with all fields (no joins needed)
      let query = db
        .select({
          id: schema.entities.id,
          userId: schema.entities.userId,
          type: schema.entities.type,
          name: schema.entities.name,
          metadata: schema.entities.metadata,
          createdByUser: schema.entities.createdByUser,
          createdByAssistantName: schema.entities.createdByAssistantName,
          createdByAssistantType: schema.entities.createdByAssistantType,
          createdAt: schema.entities.createdAt,
          updatedByUser: schema.entities.updatedByUser,
          updatedByAssistantName: schema.entities.updatedByAssistantName,
          updatedByAssistantType: schema.entities.updatedByAssistantType,
          updatedAt: schema.entities.updatedAt,
        })
        .from(schema.entities)

      // Apply filters
      const conditions = []
      if (filters?.type) {
        conditions.push(eq(schema.entities.type, filters.type))
      }
      if (filters?.createdByUser) {
        conditions.push(
          eq(schema.entities.createdByUser, filters.createdByUser)
        )
      }
      if (filters?.createdByAssistantName) {
        conditions.push(
          eq(schema.entities.createdByAssistantName, filters.createdByAssistantName)
        )
      }

      // Build query with proper chaining
      const filteredQuery =
        conditions.length > 0 ? query.where(and(...conditions)) : query

      // Apply sorting
      const sortBy = filters?.sortBy || "createdAt"
      const sortOrder = filters?.sortOrder || "desc"

      const sortedQuery =
        sortBy === "name"
          ? filteredQuery.orderBy(
              sortOrder === "desc"
                ? desc(schema.entities.name)
                : asc(schema.entities.name)
            )
          : sortBy === "type"
          ? filteredQuery.orderBy(
              sortOrder === "desc"
                ? desc(schema.entities.type)
                : asc(schema.entities.type)
            )
          : filteredQuery.orderBy(
              sortOrder === "desc"
                ? desc(schema.entities.createdAt)
                : asc(schema.entities.createdAt)
            )

      // Apply pagination with chaining
      const paginatedQuery = filters?.offset
        ? sortedQuery.offset(filters.offset).limit(filters?.limit || 100)
        : filters?.limit
        ? sortedQuery.limit(filters.limit)
        : sortedQuery

      const entities = await paginatedQuery

      // Then get counts for each entity
      const entitiesWithCounts = await Promise.all(
        entities.map(async (entity) => {
          // Count relations where entity is subject or object
          const relationsCount = await db
            .select({ count: count() })
            .from(schema.relations)
            .where(
              or(
                eq(schema.relations.subjectId, entity.id),
                eq(schema.relations.objectId, entity.id)
              )
            )

          // Count observations for this entity
          const observationsCount = await db
            .select({ count: count() })
            .from(schema.observations)
            .where(eq(schema.observations.entityId, entity.id))

          return {
            ...entity,
            relationsCount: relationsCount[0]?.count || 0,
            observationsCount: observationsCount[0]?.count || 0,
            // Add assistant info for display
            createdByAssistantInfo: entity.createdByAssistantName
              ? {
                  name: entity.createdByAssistantName,
                  type: entity.createdByAssistantType,
                }
              : null,
          }
        })
      )

      return entitiesWithCounts
    })
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string) {
    return await this.execute(async (db) => {
      const [entity] = await db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.id, entityId))
      return entity || null
    })
  }

  /**
   * Update an entity
   */
  async updateEntity(
    entityId: string,
    data: {
      type?: string
      name?: string
      metadata?: any
      updatedByUser?: string
      updatedByAssistantName?: string
      updatedByAssistantType?: string
    }
  ) {
    return await this.execute(async (db) => {
      const [entity] = await db
        .update(schema.entities)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.entities.id, entityId))
        .returning()
      return entity || null
    })
  }

  /**
   * Delete an entity (cascades to relations and observations)
   */
  async deleteEntity(entityId: string) {
    return await this.execute(async (db) => {
      const [deleted] = await db
        .delete(schema.entities)
        .where(eq(schema.entities.id, entityId))
        .returning()
      return deleted || null
    })
  }

  // ==================== RELATION OPERATIONS ====================

  /**
   * Create a new relation
   */
  async createRelation(data: {
    subjectId: string
    predicate: string
    objectId: string
    strength?: number
    metadata?: any
    createdByUser?: string
    createdByAssistantName?: string
    createdByAssistantType?: string
  }) {
    return await this.execute(async (db) => {
      const [relation] = await db
        .insert(schema.relations)
        .values({
          userId: this.userId,
          subjectId: data.subjectId,
          predicate: data.predicate,
          objectId: data.objectId,
          strength: data.strength,
          metadata: data.metadata,
          createdByUser: data.createdByUser,
          createdByAssistantName: data.createdByAssistantName,
          createdByAssistantType: data.createdByAssistantType,
        })
        .returning()
      return relation
    })
  }

  /**
   * Get relations with optional filtering
   */
  async getRelations(filters?: {
    subjectId?: string
    objectId?: string
    predicate?: string
    createdByUser?: string
    createdByAssistantName?: string
    limit?: number
    offset?: number
  }) {
    return await this.execute(async (db) => {
      const baseQuery = db.select().from(schema.relations)

      // Apply filters
      const conditions = []
      if (filters?.subjectId) {
        conditions.push(eq(schema.relations.subjectId, filters.subjectId))
      }
      if (filters?.objectId) {
        conditions.push(eq(schema.relations.objectId, filters.objectId))
      }
      if (filters?.predicate) {
        conditions.push(eq(schema.relations.predicate, filters.predicate))
      }
      if (filters?.createdByUser) {
        conditions.push(
          eq(schema.relations.createdByUser, filters.createdByUser)
        )
      }
      if (filters?.createdByAssistantName) {
        conditions.push(
          eq(schema.relations.createdByAssistantName, filters.createdByAssistantName)
        )
      }

      // Build query with chaining
      const filteredQuery =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

      // Apply pagination with chaining
      const finalQuery = filters?.offset
        ? filteredQuery.offset(filters.offset).limit(filters?.limit || 100)
        : filters?.limit
        ? filteredQuery.limit(filters.limit)
        : filteredQuery

      return await finalQuery
    })
  }

  /**
   * Get relation by ID
   */
  async getRelation(relationId: string) {
    return await this.execute(async (db) => {
      const [relation] = await db
        .select()
        .from(schema.relations)
        .where(eq(schema.relations.id, relationId))
      return relation || null
    })
  }

  /**
   * Update a relation
   */
  async updateRelation(
    relationId: string,
    data: {
      predicate?: string
      strength?: number
      metadata?: any
    }
  ) {
    return await this.execute(async (db) => {
      const [relation] = await db
        .update(schema.relations)
        .set(data)
        .where(eq(schema.relations.id, relationId))
        .returning()
      return relation || null
    })
  }

  /**
   * Delete a relation
   */
  async deleteRelation(relationId: string) {
    return await this.execute(async (db) => {
      const [deleted] = await db
        .delete(schema.relations)
        .where(eq(schema.relations.id, relationId))
        .returning()
      return deleted || null
    })
  }

  // ==================== OBSERVATION OPERATIONS ====================

  /**
   * Create a new observation
   */
  async createObservation(data: {
    entityId: string
    content: string
    source?: string
    metadata?: any
    createdByUser?: string
    createdByAssistantName?: string
    createdByAssistantType?: string
  }) {
    return await this.execute(async (db) => {
      const [observation] = await db
        .insert(schema.observations)
        .values({
          userId: this.userId,
          entityId: data.entityId,
          content: data.content,
          source: data.source,
          metadata: data.metadata,
          createdByUser: data.createdByUser,
          createdByAssistantName: data.createdByAssistantName,
          createdByAssistantType: data.createdByAssistantType,
        })
        .returning()
      return observation
    })
  }

  /**
   * Get observations with optional filtering
   */
  async getObservations(filters?: {
    entityId?: string
    source?: string
    createdByUser?: string
    createdByAssistantName?: string
    limit?: number
    offset?: number
  }) {
    return await this.execute(async (db) => {
      const baseQuery = db.select().from(schema.observations)

      // Apply filters
      const conditions = []
      if (filters?.entityId) {
        conditions.push(eq(schema.observations.entityId, filters.entityId))
      }
      if (filters?.source) {
        conditions.push(eq(schema.observations.source, filters.source))
      }
      if (filters?.createdByUser) {
        conditions.push(
          eq(schema.observations.createdByUser, filters.createdByUser)
        )
      }
      if (filters?.createdByAssistantName) {
        conditions.push(
          eq(schema.observations.createdByAssistantName, filters.createdByAssistantName)
        )
      }

      // Build query with chaining
      const filteredQuery =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

      // Apply pagination with chaining
      const finalQuery = filters?.offset
        ? filteredQuery.offset(filters.offset).limit(filters?.limit || 100)
        : filters?.limit
        ? filteredQuery.limit(filters.limit)
        : filteredQuery

      return await finalQuery
    })
  }

  /**
   * Get observation by ID
   */
  async getObservation(observationId: string) {
    return await this.execute(async (db) => {
      const [observation] = await db
        .select()
        .from(schema.observations)
        .where(eq(schema.observations.id, observationId))
      return observation || null
    })
  }

  /**
   * Update an observation
   */
  async updateObservation(
    observationId: string,
    data: {
      content?: string
      source?: string
      metadata?: any
    }
  ) {
    return await this.execute(async (db) => {
      const [observation] = await db
        .update(schema.observations)
        .set(data)
        .where(eq(schema.observations.id, observationId))
        .returning()
      return observation || null
    })
  }

  /**
   * Delete an observation
   */
  async deleteObservation(observationId: string) {
    return await this.execute(async (db) => {
      const [deleted] = await db
        .delete(schema.observations)
        .where(eq(schema.observations.id, observationId))
        .returning()
      return deleted || null
    })
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Delete all data for the user (careful!)
   */
  async eraseAllUserData() {
    return await this.transaction(async (tx) => {
      // Order matters due to foreign key constraints
      const deletedObservations = await tx
        .delete(schema.observations)
        .returning()
      const deletedRelations = await tx.delete(schema.relations).returning()
      const deletedEntities = await tx.delete(schema.entities).returning()
      const deletedAssistants = await tx.delete(schema.assistants).returning()

      return {
        deletedObservations: deletedObservations.length,
        deletedRelations: deletedRelations.length,
        deletedEntities: deletedEntities.length,
        deletedAssistants: deletedAssistants.length,
      }
    })
  }

  // ==================== STATIC FACTORY METHODS ====================

  /**
   * Create a user-scoped database instance
   */
  static create(db: DatabaseWithSchema, userId: string): UserScopedDatabase {
    return new UserScopedDatabase(db, userId)
  }

  /**
   * Create a user-scoped database instance with immediate context setup
   * Use this when you need the database context set immediately
   */
  static async createWithContext(
    db: DatabaseWithSchema,
    userId: string
  ): Promise<UserScopedDatabase> {
    const userDb = new UserScopedDatabase(db, userId)
    // Pre-set the context for immediate use
    await setUserContext(db, userId)
    return userDb
  }
}
