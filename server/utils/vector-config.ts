/**
 * Qdrant Vector Database Configuration
 * Centralized configuration for vector database operations
 */

export interface QdrantConfig {
  url: string
  apiKey?: string
  vectorSize: number
  distance: 'Cosine' | 'Euclid' | 'Dot'
  collectionPrefix: string
  optimization: {
    defaultSegmentNumber: number
    indexingThreshold: number
    memmapThreshold?: number
  }
  retry: {
    maxAttempts: number
    initialDelay: number
    maxDelay: number
  }
}

/**
 * Get Qdrant configuration based on environment
 */
export function getQdrantConfig(): QdrantConfig {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Determine URL based on environment
  let url: string
  if (process.env.QDRANT_URL) {
    // Custom URL if provided
    url = process.env.QDRANT_URL
  } else if (isDevelopment) {
    // Development: Direct HTTP connection to Qdrant
    url = 'http://localhost:6333'
  } else {
    // Production: Internal container network
    const host = process.env.QDRANT_HOST || 'memrok-qdrant'
    const port = process.env.QDRANT_PORT || '6333'
    url = `http://${host}:${port}`
  }
  
  return {
    url,
    apiKey: process.env.QDRANT_API_KEY,
    vectorSize: parseInt(process.env.QDRANT_VECTOR_SIZE || '1536'),
    distance: 'Cosine', // Best for semantic similarity
    collectionPrefix: 'user',
    optimization: {
      defaultSegmentNumber: 4,
      indexingThreshold: 10000,
      memmapThreshold: isDevelopment ? undefined : 50000,
    },
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    },
  }
}

/**
 * Vector embedding model configuration
 */
export interface EmbeddingConfig {
  model: string
  dimensions: number
  maxTokens: number
  provider: 'openai' | 'local' | 'custom'
}

/**
 * Get embedding model configuration
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = process.env.EMBEDDING_PROVIDER || 'openai'
  
  switch (provider) {
    case 'openai':
      return {
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        dimensions: 1536,
        maxTokens: 8191,
        provider: 'openai',
      }
    case 'local':
      return {
        model: process.env.LOCAL_EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
        dimensions: 384,
        maxTokens: 512,
        provider: 'local',
      }
    default:
      return {
        model: process.env.CUSTOM_EMBEDDING_MODEL || 'custom',
        dimensions: parseInt(process.env.CUSTOM_EMBEDDING_DIMENSIONS || '1536'),
        maxTokens: parseInt(process.env.CUSTOM_EMBEDDING_MAX_TOKENS || '8191'),
        provider: 'custom',
      }
  }
}

/**
 * Search configuration
 */
export interface SearchConfig {
  defaultLimit: number
  maxLimit: number
  scoreThreshold: number
  cacheEnabled: boolean
  cacheTTL: number // seconds
}

/**
 * Get search configuration
 */
export function getSearchConfig(): SearchConfig {
  return {
    defaultLimit: parseInt(process.env.VECTOR_SEARCH_DEFAULT_LIMIT || '10'),
    maxLimit: parseInt(process.env.VECTOR_SEARCH_MAX_LIMIT || '100'),
    scoreThreshold: parseFloat(process.env.VECTOR_SEARCH_SCORE_THRESHOLD || '0.7'),
    cacheEnabled: process.env.VECTOR_SEARCH_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.VECTOR_SEARCH_CACHE_TTL || '300'), // 5 minutes
  }
}

/**
 * Validate Qdrant configuration
 */
export function validateQdrantConfig(config: QdrantConfig): void {
  if (!config.url) {
    throw new Error('Qdrant URL is required')
  }
  
  if (config.vectorSize < 1 || config.vectorSize > 65536) {
    throw new Error('Vector size must be between 1 and 65536')
  }
  
  if (!['Cosine', 'Euclid', 'Dot'].includes(config.distance)) {
    throw new Error('Invalid distance metric')
  }
  
  if (config.optimization.defaultSegmentNumber < 1) {
    throw new Error('Default segment number must be at least 1')
  }
}

/**
 * Get collection name for a user and vector type
 */
export function getUserCollectionName(userId: string, type?: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const config = getQdrantConfig()
  
  if (type) {
    // New multi-collection approach
    return `${config.collectionPrefix}_${safeUserId}_${type}`
  } else {
    // Legacy single collection for backward compatibility
    return `${config.collectionPrefix}_${safeUserId}_memories`
  }
}

/**
 * Connection pool configuration for production
 */
export interface ConnectionPoolConfig {
  minConnections: number
  maxConnections: number
  idleTimeout: number
  connectionTimeout: number
}

/**
 * Get connection pool configuration
 */
export function getConnectionPoolConfig(): ConnectionPoolConfig {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    minConnections: isDevelopment ? 1 : 2,
    maxConnections: isDevelopment ? 5 : 20,
    idleTimeout: 30000, // 30 seconds
    connectionTimeout: 5000, // 5 seconds
  }
}