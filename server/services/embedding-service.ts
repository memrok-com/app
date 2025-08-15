import { createHash } from "node:crypto"
import type { CreatorContext } from "./memory-service"
import { 
  QdrantService, 
  type EntityVectorEmbedding, 
  type RelationVectorEmbedding,
  type VectorCollectionType 
} from "./qdrant-service"

// Local Transformers.js provider implementation
class LocalEmbeddingProvider {
  private model: string
  private dimensions: number
  private extractor: unknown | null = null // Transformers.js pipeline type
  private initPromise: Promise<void> | null = null

  constructor() {
    // Using MiniLM model - small, fast, and effective for semantic search
    this.model = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2"
    this.dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || "384")
  }

  private async initialize(): Promise<void> {
    if (this.extractor) return
    
    // Ensure we only initialize once
    if (!this.initPromise) {
      this.initPromise = this.doInitialize()
    }
    
    await this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      // Use mock embeddings in CI/test environments to avoid build issues
      if (process.env.CI === "true" || process.env.NODE_ENV === "test") {
        console.log("Using mock embeddings (CI/test environment)")
        this.extractor = this.createMockExtractor()
        return
      }
      
      console.log(`Initializing local embedding model: ${this.model}`)
      
      // Dynamic import with error handling for missing dependency
      const transformers = await import("@xenova/transformers").catch((error) => {
        console.warn("@xenova/transformers not available, falling back to mock embeddings:", error.message)
        return null
      })
      
      if (!transformers) {
        this.extractor = this.createMockExtractor()
        return
      }
      
      const { pipeline } = transformers
      
      // Create feature extraction pipeline
      // Models are cached locally after first download
      this.extractor = await pipeline("feature-extraction", this.model, {
        quantized: true, // Use quantized model for better performance
        cache_dir: process.env.TRANSFORMERS_CACHE || "./.cache/transformers",
        local_files_only: false,
      })
      console.log(`Embedding model ready: ${this.model}`)
    } catch (error) {
      console.error("Failed to initialize embedding model:", error)
      console.warn("Falling back to mock embeddings")
      this.extractor = this.createMockExtractor()
    }
  }

  /**
   * Create a mock extractor for CI/test environments
   * Generates deterministic embeddings based on text hash
   */
  private createMockExtractor() {
    return async (text: string, _options: Record<string, unknown>) => {
      // Generate deterministic embeddings based on text content
      const hash = createHash("sha256").update(text, "utf8").digest()
      const embedding = new Float32Array(this.dimensions)
      
      // Fill embedding with deterministic values based on hash
      for (let i = 0; i < this.dimensions; i++) {
        const hashByte = hash[i % hash.length]
        if (hashByte !== undefined) {
          embedding[i] = (hashByte / 255) * 2 - 1 // Normalize to [-1, 1]
        }
      }
      
      // Normalize the vector
      let norm = 0
      for (let i = 0; i < this.dimensions; i++) {
        const val = embedding[i]
        if (val !== undefined) {
          norm += val * val
        }
      }
      norm = Math.sqrt(norm)
      
      if (norm > 0) {
        for (let i = 0; i < this.dimensions; i++) {
          const val = embedding[i]
          if (val !== undefined) {
            embedding[i] = val / norm
          }
        }
      }
      
      return { data: embedding }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize()
    
    if (!this.extractor) {
      throw new Error("Embedding model not initialized")
    }
    
    // Generate embeddings using Transformers.js
    // Type assertion since we know this is a pipeline after initialization
    const extractor = this.extractor as (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>
    const output = await extractor(text, {
      pooling: "mean", // Mean pooling for sentence embeddings
      normalize: true, // Normalize for cosine similarity
    })
    
    // Convert to array and ensure correct dimensions
    const embedding = Array.from(output.data as Float32Array)
    
    if (embedding.length !== this.dimensions) {
      console.warn(`Embedding dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`)
    }
    
    return embedding
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize()
    
    if (!this.extractor) {
      throw new Error("Embedding model not initialized")
    }
    
    // Process texts in batch for efficiency
    const embeddings: number[][] = []
    const extractor = this.extractor as (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>
    
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      })
      embeddings.push(Array.from(output.data as Float32Array))
    }
    
    return embeddings
  }

  getModel(): string {
    return this.model
  }

  getDimensions(): number {
    return this.dimensions
  }
}

// Embedding cache entry
interface CacheEntry {
  embedding: number[]
  model: string
  timestamp: Date
  contentHash: string
}

// Embedding result interface
export interface EmbeddingResult {
  id: string
  embedding: number[]
  metadata: {
    model: string
    dimensions: number
    contentHash: string
    timestamp: Date
  }
}

// Batch processing result
export interface BatchEmbeddingResult {
  successful: EmbeddingResult[]
  failed: Array<{
    id: string
    error: string
  }>
}

// Context preservation metadata
export interface ContextPreservation {
  semanticAnchors?: string[]
  relationshipContext?: string[]
  temporalMarkers?: {
    conversationId?: string
    sequenceId?: number
  }
  driftMetrics?: {
    contentHash: string
    relationshipHash: string
  }
}

/**
 * Service for generating and managing vector embeddings
 * Uses local Transformers.js models for privacy-first processing
 */
export class EmbeddingService {
  private provider: LocalEmbeddingProvider
  private cache: Map<string, CacheEntry>
  private userId: string
  private qdrantService: QdrantService

  constructor(userId: string) {
    this.userId = userId
    this.qdrantService = new QdrantService(userId)
    
    // Initialize local provider
    this.provider = new LocalEmbeddingProvider()
    
    // Initialize cache
    this.cache = new Map()
  }

  /**
   * Generate embedding for entity with context preservation
   */
  async embedEntity(
    entityId: string,
    content: string,
    metadata: {
      entityName: string
      entityType?: string
      source?: string
      relatedEntityIds?: string[]
      createdBy: CreatorContext
    }
  ): Promise<EmbeddingResult> {
    // Check cache first
    const contentHash = this.generateContentHash(content)
    const cacheKey = `entity:${entityId}:${contentHash}`
    
    const cached = this.getCachedEmbedding(cacheKey)
    if (cached) {
      return {
        id: entityId,
        embedding: cached.embedding,
        metadata: {
          model: cached.model,
          dimensions: cached.embedding.length,
          contentHash: cached.contentHash,
          timestamp: cached.timestamp,
        },
      }
    }
    
    // Generate embedding
    const embedding = await this.provider.generateEmbedding(content)
    
    // Store in cache
    this.setCachedEmbedding(cacheKey, {
      embedding,
      model: this.provider.getModel(),
      timestamp: new Date(),
      contentHash,
    })
    
    // Store in Qdrant with context preservation
    const vectorEmbedding: EntityVectorEmbedding = {
      vector: embedding,
      payload: {
        userId: this.userId,
        entityId,
        entityName: metadata.entityName,
        entityType: metadata.entityType,
        source: metadata.source,
        content,
        createdBy: metadata.createdBy,
        createdAt: new Date(),
        semanticContext: metadata.relatedEntityIds ? {
          relatedEntityIds: metadata.relatedEntityIds,
          relationshipCount: metadata.relatedEntityIds.length,
          lastUpdated: new Date(),
        } : undefined,
      },
    }
    
    await this.qdrantService.storeEntityVector(entityId, vectorEmbedding)
    
    return {
      id: entityId,
      embedding,
      metadata: {
        model: this.provider.getModel(),
        dimensions: embedding.length,
        contentHash,
        timestamp: new Date(),
      },
    }
  }

  /**
   * Generate embedding for relation with triplet context
   */
  async embedRelation(
    relationId: string,
    content: string,
    metadata: {
      sourceEntityId: string
      targetEntityId: string
      sourceEntityName: string
      targetEntityName: string
      predicate: string
      strength: number
      createdBy: CreatorContext
    }
  ): Promise<EmbeddingResult> {
    // Build relation content with triplet context
    const tripletContent = `${metadata.sourceEntityName} ${metadata.predicate} ${metadata.targetEntityName}: ${content}`
    
    // Check cache
    const contentHash = this.generateContentHash(tripletContent)
    const cacheKey = `relation:${relationId}:${contentHash}`
    
    const cached = this.getCachedEmbedding(cacheKey)
    if (cached) {
      return {
        id: relationId,
        embedding: cached.embedding,
        metadata: {
          model: cached.model,
          dimensions: cached.embedding.length,
          contentHash: cached.contentHash,
          timestamp: cached.timestamp,
        },
      }
    }
    
    // Generate embedding
    const embedding = await this.provider.generateEmbedding(tripletContent)
    
    // Store in cache
    this.setCachedEmbedding(cacheKey, {
      embedding,
      model: this.provider.getModel(),
      timestamp: new Date(),
      contentHash,
    })
    
    // Store in Qdrant with triplet context
    const vectorEmbedding: RelationVectorEmbedding = {
      vector: embedding,
      payload: {
        userId: this.userId,
        relationId,
        sourceEntityId: metadata.sourceEntityId,
        targetEntityId: metadata.targetEntityId,
        predicate: metadata.predicate,
        strength: metadata.strength,
        content,
        createdBy: metadata.createdBy,
        createdAt: new Date(),
        tripletContext: {
          sourceEntityName: metadata.sourceEntityName,
          targetEntityName: metadata.targetEntityName,
          relationshipType: metadata.predicate,
          validationScore: 1.0, // Will be calculated by QdrantService
        },
      },
    }
    
    await this.qdrantService.storeRelationVector(relationId, vectorEmbedding)
    
    return {
      id: relationId,
      embedding,
      metadata: {
        model: this.provider.getModel(),
        dimensions: embedding.length,
        contentHash,
        timestamp: new Date(),
      },
    }
  }

  /**
   * Generate embeddings for multiple items in batch
   */
  async embedBatch(
    items: Array<{
      id: string
      content: string
      type: VectorCollectionType
      metadata?: Record<string, unknown>
    }>
  ): Promise<BatchEmbeddingResult> {
    const successful: EmbeddingResult[] = []
    const failed: Array<{ id: string; error: string }> = []
    
    // Process in chunks for efficiency
    const chunkSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || "10")
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)
      
      // Check cache and separate cached from uncached
      const uncached: typeof chunk = []
      const cachedResults: EmbeddingResult[] = []
      
      for (const item of chunk) {
        const contentHash = this.generateContentHash(item.content)
        const cacheKey = `${item.type}:${item.id}:${contentHash}`
        const cached = this.getCachedEmbedding(cacheKey)
        
        if (cached) {
          cachedResults.push({
            id: item.id,
            embedding: cached.embedding,
            metadata: {
              model: cached.model,
              dimensions: cached.embedding.length,
              contentHash: cached.contentHash,
              timestamp: cached.timestamp,
            },
          })
        } else {
          uncached.push(item)
        }
      }
      
      successful.push(...cachedResults)
      
      if (uncached.length > 0) {
        try {
          // Generate embeddings for uncached items
          const texts = uncached.map(item => item.content)
          const embeddings = await this.provider.generateBatchEmbeddings(texts)
          
          // Process results
          for (let j = 0; j < uncached.length; j++) {
            const item = uncached[j]
            const embedding = embeddings[j]
            if (!item || !embedding) continue
            
            const contentHash = this.generateContentHash(item.content)
            const cacheKey = `${item.type}:${item.id}:${contentHash}`
            
            // Store in cache
            this.setCachedEmbedding(cacheKey, {
              embedding,
              model: this.provider.getModel(),
              timestamp: new Date(),
              contentHash,
            })
            
            successful.push({
              id: item.id,
              embedding,
              metadata: {
                model: this.provider.getModel(),
                dimensions: embedding.length,
                contentHash,
                timestamp: new Date(),
              },
            })
          }
        } catch (error) {
          // Record failures
          for (const item of uncached) {
            failed.push({
              id: item.id,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }
        }
      }
    }
    
    return { successful, failed }
  }

  /**
   * Search for similar vectors
   */
  async search(
    queryText: string,
    options: {
      limit?: number
      scoreThreshold?: number
      collectionTypes?: VectorCollectionType[]
      contextualFilters?: {
        conversationId?: string
        timeWindow?: { start: Date; end: Date }
      }
    } = {}
  ) {
    // Generate query embedding
    const queryEmbedding = await this.provider.generateEmbedding(queryText)
    
    // Search in Qdrant
    return await this.qdrantService.searchVectors({
      query_vector: queryEmbedding,
      limit: options.limit,
      score_threshold: options.scoreThreshold,
      collectionTypes: options.collectionTypes,
      contextualFilters: options.contextualFilters,
    })
  }

  /**
   * Calculate semantic drift between two embeddings
   */
  calculateSemanticDrift(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embedding dimensions must match")
    }
    
    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < embedding1.length; i++) {
      const val1 = embedding1[i] ?? 0
      const val2 = embedding2[i] ?? 0
      dotProduct += val1 * val2
      norm1 += val1 * val1
      norm2 += val2 * val2
    }
    
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    return 1 - similarity // Convert to drift metric
  }

  /**
   * Generate content hash for caching
   */
  private generateContentHash(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16)
  }

  /**
   * Get cached embedding if available
   */
  private getCachedEmbedding(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) return undefined
    
    // Check if cache is still valid (24 hours)
    const age = Date.now() - entry.timestamp.getTime()
    if (age > 24 * 60 * 60 * 1000) {
      this.cache.delete(key)
      return undefined
    }
    
    return entry
  }

  /**
   * Store embedding in cache
   */
  private setCachedEmbedding(key: string, entry: CacheEntry): void {
    // Limit cache size
    if (this.cache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
      
      for (let i = 0; i < 100; i++) {
        const entry = entries[i]
        if (entry) {
          this.cache.delete(entry[0])
        }
      }
    }
    
    this.cache.set(key, entry)
  }

  /**
   * Clear cache for user
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get provider information
   */
  getProviderInfo(): { model: string; dimensions: number; provider: string } {
    return {
      model: this.provider.getModel(),
      dimensions: this.provider.getDimensions(),
      provider: "local",
    }
  }
}