import { QdrantClient } from "@qdrant/js-client-rest"
import type { CreatorContext } from "./memory-service"

// Vector embedding interface
export interface VectorEmbedding {
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

// Search result interface
export interface VectorSearchResult {
  id: string
  score: number
  payload: VectorEmbedding['payload']
}

// Search parameters interface
export interface VectorSearchParams {
  query_vector: number[]
  filter?: Record<string, unknown>
  limit?: number
  score_threshold?: number
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
    
    // Initialize Qdrant client with environment configuration
    const apiKey = process.env.QDRANT_API_KEY
    
    // Use HTTPS via Traefik in development, internal HTTP in production
    let url: string
    if (process.env.NODE_ENV === 'development' && process.env.MEMROK_VECTORS_DOMAIN) {
      // Development: Use HTTPS via Traefik
      url = `https://${process.env.MEMROK_VECTORS_DOMAIN}`
    } else if (process.env.QDRANT_URL) {
      // Custom URL if provided
      url = process.env.QDRANT_URL
    } else {
      // Production: Internal container network
      const host = process.env.QDRANT_HOST || 'memrok-qdrant'
      const port = process.env.QDRANT_PORT || '6333'
      url = `http://${host}:${port}`
    }

    this.client = new QdrantClient({
      url,
      apiKey,
    })
  }

  // ==================== COLLECTION MANAGEMENT ====================

  /**
   * Get user-specific collection name following RLS pattern
   */
  private getCollectionName(): string {
    return `user_${this.userId}_memories`
  }

  /**
   * Initialize user's vector collection if it doesn't exist
   */
  async ensureCollection(vectorSize: number = 1536): Promise<void> {
    const collectionName = this.getCollectionName()
    
    try {
      // Check if collection exists
      await this.client.getCollection(collectionName)
    } catch {
      // Collection doesn't exist, create it
      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: "Cosine", // Best for semantic similarity
        },
        // Optimize for search performance
        optimizers_config: {
          default_segment_number: 4,
        },
        replication_factor: 1,
      })
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    const collectionName = this.getCollectionName()
    return await this.client.getCollection(collectionName)
  }

  // ==================== VECTOR OPERATIONS ====================

  /**
   * Store vector embedding for entity or observation
   */
  async storeVector(
    id: string,
    embedding: VectorEmbedding,
    _upsert: boolean = true
  ): Promise<void> {
    const collectionName = this.getCollectionName()
    
    // Ensure collection exists
    await this.ensureCollection(embedding.vector.length)
    
    // Store vector with user-scoped payload
    await this.client.upsert(collectionName, {
      points: [{
        id,
        vector: embedding.vector,
        payload: {
          ...embedding.payload,
          userId: this.userId, // Enforce user scope
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
    
    const collectionName = this.getCollectionName()
    
    // Ensure collection exists (use first vector's size)
    await this.ensureCollection(embeddings[0].embedding.vector.length)
    
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
    const collectionName = this.getCollectionName()
    
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
      
      return results.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as VectorSearchResult['payload'],
      }))
    } catch (error: unknown) {
      // Collection might not exist yet
      if ((error as Error).message?.includes('Not found')) {
        return []
      }
      throw error
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(id: string): Promise<VectorSearchResult | null> {
    const collectionName = this.getCollectionName()
    
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
      }
    } catch (error) {
      if (error.message?.includes('Not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id: string): Promise<boolean> {
    const collectionName = this.getCollectionName()
    
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
      if (error.message?.includes('Not found')) {
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
    
    const collectionName = this.getCollectionName()
    
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
      if (error.message?.includes('Not found')) {
        return 0
      }
      throw error
    }
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
   * Get user collection statistics
   */
  async getCollectionStats() {
    const collectionName = this.getCollectionName()
    
    try {
      return await this.client.getCollection(collectionName)
    } catch (error) {
      if (error.message?.includes('Not found')) {
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
  async deleteCollection(): Promise<boolean> {
    const collectionName = this.getCollectionName()
    
    try {
      await this.client.deleteCollection(collectionName)
      return true
    } catch (error) {
      if (error.message?.includes('Not found')) {
        return true // Already doesn't exist
      }
      throw error
    }
  }
}