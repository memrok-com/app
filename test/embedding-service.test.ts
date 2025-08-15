import { describe, it, expect, beforeAll } from 'vitest'
import { EmbeddingService } from '../server/services/embedding-service'

describe('EmbeddingService', () => {
  beforeAll(() => {
    // Ensure we're in test mode for mock embeddings
    process.env.NODE_ENV = 'test'
    process.env.CI = 'true'
  })

  it('should initialize without errors', () => {
    const service = new EmbeddingService('test-user')
    expect(service).toBeDefined()
    expect(service.getProviderInfo()).toEqual({
      model: 'Xenova/all-MiniLM-L6-v2',
      dimensions: 384,
      provider: 'local'
    })
  })

  it('should generate semantic drift calculation', () => {
    const service = new EmbeddingService('test-user')
    
    // Create two identical vectors
    const vector1 = new Array(384).fill(0.5)
    const vector2 = new Array(384).fill(0.5)
    
    // Should have zero drift for identical vectors
    const drift = service.calculateSemanticDrift(vector1, vector2)
    expect(drift).toBeCloseTo(0, 5)
  })

  it('should detect drift between different vectors', () => {
    const service = new EmbeddingService('test-user')
    
    // Create two different vectors
    const vector1 = new Array(384).fill(1.0)
    const vector2 = new Array(384).fill(-1.0)
    
    // Should have maximum drift for opposite vectors
    const drift = service.calculateSemanticDrift(vector1, vector2)
    expect(drift).toBeCloseTo(2, 1) // Maximum drift for opposite unit vectors
  })
})