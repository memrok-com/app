import { QdrantClient } from "@qdrant/js-client-rest"
import type { CreatorContext } from "./memory-service"
import { getQdrantConfig, getUserCollectionName, validateQdrantConfig } from "../utils/vector-config"

// Collection types for different vector purposes
export type VectorCollectionType = 'entities' | 'relations' | 'contexts' | 'triplets'

// Base vector embedding interface
export interface BaseVectorEmbedding {
  vector: number[]
  payload: {
    userId: string
    content: string
    createdBy: CreatorContext
    createdAt: Date
    metadata?: Record<string, unknown>
  }
}

// Entity vector embedding
export interface EntityVectorEmbedding extends BaseVectorEmbedding {
  payload: BaseVectorEmbedding['payload'] & {
    entityId: string
    entityName: string
    entityType?: string
    source?: string
    // Context preservation
    semanticContext?: {
      relatedEntityIds: string[]
      relationshipCount: number
      lastUpdated: Date
    }
    // Drift detection
    checksums?: {
      contentHash: string
      relationshipHash: string
    }
  }
}

// Relation vector embedding (for entity-relation-entity triplets)
export interface RelationVectorEmbedding extends BaseVectorEmbedding {
  payload: BaseVectorEmbedding['payload'] & {
    relationId: string
    sourceEntityId: string
    targetEntityId: string
    predicate: string
    strength: number
    // Triplet context
    tripletContext: {
      sourceEntityName: string
      targetEntityName: string
      relationshipType: string
      validationScore: number
    }
    // Temporal consistency
    temporalContext?: {
      sequenceId?: number
      conversationId?: string
      timeWindow: string
    }
  }
}

// Context vector embedding (conversation/session boundaries)
export interface ContextVectorEmbedding extends BaseVectorEmbedding {
  payload: BaseVectorEmbedding['payload'] & {
    conversationId: string
    sessionId?: string
    topicSignature: string
    // Boundary markers
    boundaryMarkers: {
      conversationStart: Date
      conversationEnd?: Date
      participantIds: string[]
      topicIds: string[]
    }
    // Coherence metrics
    coherenceMetrics: {
      topicConsistency: number
      temporalCoherence: number
      participantConsistency: number
    }
    // Drift prevention
    semanticAnchors: {
      keyEntityIds: string[]
      anchorPoints: Array<{ timestamp: Date; checksum: string }>
    }
  }
}

// Triplet vector embedding (entity-relation-entity semantic validation)
export interface TripletVectorEmbedding extends BaseVectorEmbedding {
  payload: BaseVectorEmbedding['payload'] & {
    tripletId: string
    sourceEntityId: string
    relationId: string
    targetEntityId: string
    // Logical validation
    validation: {
      logicalConsistency: number
      evidenceSupport: number
      conflictScore: number
      supportingObservationIds: string[]
    }
    // Context preservation
    semanticContext: {
      conversationId?: string
      derivationChain: string[]
      confidence: number
    }
  }
}

// Union type for all vector embeddings
export type VectorEmbedding = EntityVectorEmbedding | RelationVectorEmbedding | ContextVectorEmbedding | TripletVectorEmbedding

// Legacy interface for backward compatibility
export interface LegacyVectorEmbedding {
  vector: number[]
  payload: {
    userId: string
    entityId?: string
    observationId?: string
    content: string
    entityName?: string
    entityType?: string
    source?: string
    metadata?: Record<string, unknown>
    createdBy: CreatorContext
    createdAt: Date
  }
}

// Enhanced search result interface
export interface VectorSearchResult {
  id: string
  score: number
  payload: VectorEmbedding['payload']
  collectionType: VectorCollectionType
  // Drift detection
  driftMetrics?: {
    semanticDrift: number
    temporalDrift: number
    contextualDrift: number
  }
}

// Enhanced search parameters interface
export interface VectorSearchParams {
  query_vector: number[]
  filter?: Record<string, unknown>
  limit?: number
  score_threshold?: number
  // Collection targeting
  collectionTypes?: VectorCollectionType[]
  // Context-aware search
  contextualFilters?: {
    conversationId?: string
    timeWindow?: { start: Date; end: Date }
    semanticBoundaries?: boolean
  }
  // Drift prevention
  driftValidation?: {
    enableValidation: boolean
    maxDriftThreshold: number
  }
}

/**
 * Qdrant vector database service for semantic search
 * Implements user-scoped collections compatible with memrok's RLS architecture
 */
export class QdrantService {
  private client: QdrantClient
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    
    // Get and validate configuration
    const config = getQdrantConfig()
    validateQdrantConfig(config)
    
    // Initialize Qdrant client with configuration
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    })
  }

  // ==================== COLLECTION MANAGEMENT ====================

  /**
   * Get user-specific collection name for a specific vector type
   */
  private getCollectionName(type: VectorCollectionType): string {
    return getUserCollectionName(this.userId, type)
  }

  /**
   * Get legacy collection name for backward compatibility
   */
  private getLegacyCollectionName(): string {
    return getUserCollectionName(this.userId)
  }

  /**
   * Initialize user's vector collection for a specific type
   */
  async ensureCollection(type: VectorCollectionType, vectorSize: number = 1536): Promise<void> {
    const collectionName = this.getCollectionName(type)
    
    try {
      // Check if collection exists
      await this.client.getCollection(collectionName)
    } catch {
      // Collection doesn't exist, create it with type-specific optimizations
      const config = this.getCollectionConfig(type, vectorSize)
      await this.client.createCollection(collectionName, config)
    }
  }

  /**
   * Get collection configuration optimized for specific vector type
   */
  private getCollectionConfig(type: VectorCollectionType, vectorSize: number) {
    const baseConfig = {
      vectors: {
        size: vectorSize,
        distance: "Cosine" as const, // Best for semantic similarity
      },
      replication_factor: 1,
    }

    // Type-specific optimizations
    switch (type) {
      case 'entities':
        return {
          ...baseConfig,
          optimizers_config: {
            default_segment_number: 4,
            indexing_threshold: 10000, // Higher threshold for entity vectors
          },
          hnsw_config: {
            m: 16,
            ef_construct: 200, // Better for entity similarity
          },
        }
      case 'relations':
        return {
          ...baseConfig,
          optimizers_config: {
            default_segment_number: 2,
            indexing_threshold: 5000, // Lower threshold for relationship vectors
          },
          hnsw_config: {
            m: 32, // Higher connectivity for relationship graphs
            ef_construct: 400,
          },
        }
      case 'contexts':
        return {
          ...baseConfig,
          optimizers_config: {
            default_segment_number: 1,
            indexing_threshold: 1000, // Fewer context vectors expected
          },
          hnsw_config: {
            m: 8, // Lower connectivity for context boundaries
            ef_construct: 100,
          },
        }
      case 'triplets':
        return {
          ...baseConfig,
          optimizers_config: {
            default_segment_number: 2,
            indexing_threshold: 5000,
          },
          hnsw_config: {
            m: 24, // Balanced for triplet validation
            ef_construct: 300,
          },
        }
      default:
        return {
          ...baseConfig,
          optimizers_config: {
            default_segment_number: 4,
          },
        }
    }
  }

  /**
   * Get collection info for a specific type
   */
  async getCollectionInfo(type: VectorCollectionType) {
    const collectionName = this.getCollectionName(type)
    return await this.client.getCollection(collectionName)
  }

  /**
   * Initialize all collection types for the user
   */
  async ensureAllCollections(vectorSize: number = 1536): Promise<void> {
    const types: VectorCollectionType[] = ['entities', 'relations', 'contexts', 'triplets']
    await Promise.all(types.map(type => this.ensureCollection(type, vectorSize)))
  }

  // ==================== VECTOR OPERATIONS ====================

  /**
   * Store entity vector with semantic context preservation
   */
  async storeEntityVector(
    id: string,
    embedding: EntityVectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getCollectionName('entities')
    
    // Ensure collection exists
    await this.ensureCollection('entities', embedding.vector.length)
    
    // Add drift detection checksums
    const enhancedPayload = {
      ...embedding.payload,
      userId: this.userId,
      checksums: {
        contentHash: this.calculateContentHash(embedding.payload.content),
        relationshipHash: this.calculateRelationshipHash(embedding.payload.semanticContext?.relatedEntityIds || []),
      },
    }
    
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: enhancedPayload,
      }],
    })
  }

  /**
   * Store relation vector with triplet context
   */
  async storeRelationVector(
    id: string,
    embedding: RelationVectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getCollectionName('relations')
    
    await this.ensureCollection('relations', embedding.vector.length)
    
    // Validate triplet consistency
    const validationScore = await this.validateTripletConsistency(embedding)
    
    const enhancedPayload = {
      ...embedding.payload,
      userId: this.userId,
      tripletContext: {
        ...embedding.payload.tripletContext,
        validationScore,
      },
    }
    
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: enhancedPayload,
      }],
    })
  }

  /**
   * Store context vector with boundary markers
   */
  async storeContextVector(
    id: string,
    embedding: ContextVectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getCollectionName('contexts')
    
    await this.ensureCollection('contexts', embedding.vector.length)
    
    // Calculate coherence metrics
    const coherenceMetrics = await this.calculateCoherenceMetrics(embedding)
    
    const enhancedPayload = {
      ...embedding.payload,
      userId: this.userId,
      coherenceMetrics,
    }
    
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: enhancedPayload,
      }],
    })
  }

  /**
   * Store triplet vector with validation
   */
  async storeTripletVector(
    id: string,
    embedding: TripletVectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getCollectionName('triplets')
    
    await this.ensureCollection('triplets', embedding.vector.length)
    
    // Perform logical consistency validation
    const validation = await this.validateLogicalConsistency(embedding)
    
    const enhancedPayload = {
      ...embedding.payload,
      userId: this.userId,
      validation,
    }
    
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: enhancedPayload,
      }],
    })
  }

  /**
   * Legacy method for backward compatibility
   */
  async storeVector(
    id: string,
    embedding: LegacyVectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getLegacyCollectionName()
    
    // Ensure legacy collection exists
    await this.ensureCollection('entities', embedding.vector.length)
    
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: {
          ...embedding.payload,
          userId: this.userId,
        },
      }],
    })
  }

  /**
   * Store multiple vectors in batch
   */
  async storeVectorsBatch(embeddings: Array<{
    id: string
    embedding: VectorEmbedding
  }>): Promise<void> {
    if (embeddings.length === 0) return
    
    const collectionName = this.getLegacyCollectionName()
    
    // Ensure collection exists (use first vector's size)
    await this.ensureCollection('entities', embeddings[0].embedding.vector.length)
    
    // Prepare batch points
    const points = embeddings.map(({ id, embedding }) => ({
      id,
      vector: embedding.vector,
      payload: {
        ...embedding.payload,
        userId: this.userId, // Enforce user scope
      },
    }))
    
    // Store vectors in batch
    await this.client.upsert(collectionName, { points })
  }

  /**
   * Search vectors by similarity
   */
  async searchVectors(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    const collectionName = this.getLegacyCollectionName()
    
    try {
      // Add user filter to ensure RLS-like behavior
      const filter = {
        must: [
          { key: "userId", match: { value: this.userId } },
          ...(params.filter ? [params.filter] : []),
        ],
      }
      
      const results = await this.client.search(collectionName, {
        vector: params.query_vector,
        filter,
        limit: params.limit || 10,
        score_threshold: params.score_threshold,
        with_payload: true,
      })
      
      return results.map((result: { id: string | number; score: number; payload: unknown }) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as VectorSearchResult['payload'],
        collectionType: 'entities' as VectorCollectionType,
      }))
    } catch (error) {
      // Collection might not exist yet
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return []
      }
      throw error
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(id: string): Promise<VectorSearchResult | null> {
    const collectionName = this.getLegacyCollectionName()
    
    try {
      const results = await this.client.retrieve(collectionName, {
        ids: [id],
        with_payload: true,
        with_vectors: false,
      })
      
      if (results.length === 0) return null
      
      const result = results[0]
      
      // Verify user access (RLS-like check)
      if (result.payload?.userId !== this.userId) {
        return null
      }
      
      return {
        id: result.id as string,
        score: 1.0, // Perfect match for direct retrieval
        payload: result.payload as VectorSearchResult['payload'],
        collectionType: 'entities' as VectorCollectionType,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id: string): Promise<boolean> {
    const collectionName = this.getLegacyCollectionName()
    
    try {
      // First verify the vector belongs to this user
      const vector = await this.getVector(id)
      if (!vector) return false
      
      // Delete the vector
      await this.client.delete(collectionName, {
        points: [id],
      })
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Delete multiple vectors by IDs
   */
  async deleteVectorsBatch(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    
    const collectionName = this.getLegacyCollectionName()
    
    try {
      // Verify all vectors belong to this user
      const vectors = await Promise.all(
        ids.map(id => this.getVector(id))
      )
      
      const validIds = vectors
        .filter(v => v !== null)
        .map(v => v!.id)
      
      if (validIds.length === 0) return 0
      
      // Delete valid vectors
      await this.client.delete(collectionName, {
        points: validIds,
      })
      
      return validIds.length
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return 0
      }
      throw error
    }
  }

  // ==================== SEMANTIC VALIDATION METHODS ====================

  /**
   * Calculate content hash for drift detection
   */
  private calculateContentHash(content: string): string {
    // Simple hash implementation (in production, use crypto)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * Calculate relationship hash for context preservation
   */
  private calculateRelationshipHash(entityIds: string[]): string {
    const sortedIds = entityIds.sort().join(',')
    return this.calculateContentHash(sortedIds)
  }

  /**
   * Validate triplet consistency for relation vectors
   */
  private async validateTripletConsistency(embedding: RelationVectorEmbedding): Promise<number> {
    // Simplified validation - in production, implement sophisticated logic
    const { sourceEntityId, targetEntityId, predicate, strength } = embedding.payload
    
    // Basic consistency checks
    let score = 1.0
    
    // Check if entities exist and are valid
    if (!sourceEntityId || !targetEntityId) score -= 0.3
    if (!predicate) score -= 0.2
    if (strength < 0 || strength > 1) score -= 0.2
    if (sourceEntityId === targetEntityId) score -= 0.5 // Self-reference penalty
    
    return Math.max(0, score)
  }

  /**
   * Calculate coherence metrics for context vectors
   */
  private async calculateCoherenceMetrics(embedding: ContextVectorEmbedding): Promise<typeof embedding.payload.coherenceMetrics> {
    // Simplified implementation - in production, use advanced semantic analysis
    const { boundaryMarkers } = embedding.payload
    
    return {
      topicConsistency: 0.9, // Placeholder - implement topic analysis
      temporalCoherence: boundaryMarkers.conversationEnd 
        ? 1.0 
        : Math.max(0.5, 1.0 - (Date.now() - boundaryMarkers.conversationStart.getTime()) / (24 * 60 * 60 * 1000)), // Decay over time
      participantConsistency: Math.min(1.0, boundaryMarkers.participantIds.length > 0 ? 0.8 + (0.2 / boundaryMarkers.participantIds.length) : 0.5),
    }
  }

  /**
   * Validate logical consistency for triplet vectors
   */
  private async validateLogicalConsistency(embedding: TripletVectorEmbedding): Promise<typeof embedding.payload.validation> {
    const { sourceEntityId, relationId, targetEntityId, semanticContext } = embedding.payload
    
    // Basic logical consistency checks
    let logicalConsistency = 1.0
    const evidenceSupport = semanticContext.confidence
    let conflictScore = 0.0
    
    // Check for circular references in derivation chain
    const derivationSet = new Set(semanticContext.derivationChain)
    if (derivationSet.size !== semanticContext.derivationChain.length) {
      conflictScore += 0.3 // Circular reference detected
    }
    
    // Check for entity consistency
    if (!sourceEntityId || !targetEntityId || !relationId) {
      logicalConsistency -= 0.4
    }
    
    return {
      logicalConsistency: Math.max(0, logicalConsistency),
      evidenceSupport,
      conflictScore,
      supportingObservationIds: embedding.payload.validation?.supportingObservationIds || [],
    }
  }

  /**
   * Calculate semantic drift between vectors
   */
  async calculateSemanticDrift(
    vector1: number[],
    vector2: number[],
    _type: VectorCollectionType
  ): Promise<number> {
    if (vector1.length !== vector2.length) {
      throw new Error('Vector dimensions must match for drift calculation')
    }
    
    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i]
      norm1 += vector1[i] * vector1[i]
      norm2 += vector2[i] * vector2[i]
    }
    
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    const drift = 1 - similarity // Convert similarity to drift metric
    
    return Math.max(0, Math.min(1, drift))
  }

  // ==================== HEALTH AND MAINTENANCE ====================

  /**
   * Check Qdrant service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get comprehensive statistics for all collection types
   */
  async getAllCollectionStats() {
    const types: VectorCollectionType[] = ['entities', 'relations', 'contexts', 'triplets']
    const stats: Record<string, unknown> = {}
    
    await Promise.all(
      types.map(async (type) => {
        try {
          const collectionName = this.getCollectionName(type)
          const collectionInfo = await this.client.getCollection(collectionName)
          stats[type] = collectionInfo
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStatus = (error as { status?: number }).status
          if (errorMessage.includes('Not found') || errorStatus === 404) {
            stats[type] = {
              vectors_count: 0,
              status: "green",
              optimizer_status: "ok",
            }
          } else {
            stats[type] = { error: errorMessage }
          }
        }
      })
    )
    
    return stats
  }

  /**
   * Get user collection statistics for a specific type
   */
  async getCollectionStats(type: VectorCollectionType) {
    const collectionName = this.getCollectionName(type)
    
    try {
      return await this.client.getCollection(collectionName)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return {
          vectors_count: 0,
          status: "green",
          optimizer_status: "ok",
        }
      }
      throw error
    }
  }

  /**
   * Delete user's entire collection (for cleanup/reset)
   */
  /**
   * Delete all collections for the user
   */
  async deleteAllCollections(): Promise<boolean> {
    const types: VectorCollectionType[] = ['entities', 'relations', 'contexts', 'triplets']
    const results = await Promise.all(
      types.map(async (type) => {
        try {
          const collectionName = this.getCollectionName(type)
          await this.client.deleteCollection(collectionName)
          return true
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStatus = (error as { status?: number }).status
          return errorMessage.includes('Not found') || errorStatus === 404
        }
      })
    )
    return results.every(result => result)
  }

  /**
   * Delete user's specific collection type
   */
  async deleteCollection(type: VectorCollectionType): Promise<boolean> {
    const collectionName = this.getCollectionName(type)
    
    try {
      await this.client.deleteCollection(collectionName)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return true // Already doesn't exist
      }
      throw error
    }
  }

  /**
   * Delete legacy collection for backward compatibility
   */
  async deleteLegacyCollection(): Promise<boolean> {
    const collectionName = this.getLegacyCollectionName()
    
    try {
      await this.client.deleteCollection(collectionName)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = (error as { status?: number }).status
      if (errorMessage.includes('Not found') || errorStatus === 404) {
        return true // Already doesn't exist
      }
      throw error
    }
  }
}