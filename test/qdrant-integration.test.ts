#!/usr/bin/env bun
/**
 * Qdrant Integration Test
 * Tests vector database operations and user isolation
 */

import { QdrantService } from '../server/services/qdrant-service'
import type { VectorEmbedding } from '../server/services/qdrant-service'
import { randomUUID } from 'crypto'

// Test configuration
const TEST_USER_ID = 'test-user-123'
const TEST_VECTOR_SIZE = 1536

// Create test embedding
function createTestEmbedding(content: string): VectorEmbedding {
  // Generate a simple test vector (in production, this would use an embedding model)
  const vector = Array(TEST_VECTOR_SIZE).fill(0).map(() => Math.random())
  
  return {
    vector,
    payload: {
      userId: TEST_USER_ID,
      entityId: 'test-entity-1',
      content,
      entityName: 'Test Entity',
      entityType: 'test',
      createdBy: {
        createdByUser: TEST_USER_ID,
      },
      createdAt: new Date(),
    },
  }
}

async function runTests() {
  console.log('🧪 Starting Qdrant Integration Tests...\n')
  
  const qdrantService = new QdrantService(TEST_USER_ID)
  
  try {
    // Test 1: Health Check
    console.log('Test 1: Health Check')
    try {
      const isHealthy = await qdrantService.healthCheck()
      console.log(`✅ Qdrant service is ${isHealthy ? 'healthy' : 'unhealthy'}\n`)
      
      if (!isHealthy) {
        throw new Error('Qdrant service is not healthy. Make sure Qdrant container is running.')
      }
    } catch (healthError) {
      console.error('Health check error details:', healthError)
      throw new Error(`Qdrant service is not healthy: ${healthError.message}`)
    }
    
    // Test 2: Collection Creation
    console.log('Test 2: Collection Creation')
    await qdrantService.ensureCollection(TEST_VECTOR_SIZE)
    const collectionInfo = await qdrantService.getCollectionInfo()
    console.log(`✅ Collection created: ${JSON.stringify(collectionInfo.status)}\n`)
    
    // Test 3: Store Single Vector
    console.log('Test 3: Store Single Vector')
    const testEmbedding = createTestEmbedding('This is a test memory about AI and machine learning')
    const vectorId1 = randomUUID()
    await qdrantService.storeVector(vectorId1, testEmbedding)
    console.log('✅ Vector stored successfully\n')
    
    // Test 4: Retrieve Vector
    console.log('Test 4: Retrieve Vector')
    const retrievedVector = await qdrantService.getVector(vectorId1)
    if (!retrievedVector) {
      throw new Error('Failed to retrieve vector')
    }
    console.log(`✅ Vector retrieved: ${retrievedVector.payload.content}\n`)
    
    // Test 5: Batch Store Vectors
    console.log('Test 5: Batch Store Vectors')
    const vectorId2 = randomUUID()
    const vectorId3 = randomUUID()
    const vectorId4 = randomUUID()
    const batchEmbeddings = [
      { id: vectorId2, embedding: createTestEmbedding('Memory about databases and SQL') },
      { id: vectorId3, embedding: createTestEmbedding('Memory about web development and React') },
      { id: vectorId4, embedding: createTestEmbedding('Memory about cloud computing and AWS') },
    ]
    await qdrantService.storeVectorsBatch(batchEmbeddings)
    console.log('✅ Batch vectors stored successfully\n')
    
    // Test 6: Search Vectors
    console.log('Test 6: Search Vectors')
    const searchEmbedding = createTestEmbedding('Looking for AI related memories')
    const searchResults = await qdrantService.searchVectors({
      query_vector: searchEmbedding.vector,
      limit: 3,
    })
    console.log(`✅ Found ${searchResults.length} similar vectors`)
    searchResults.forEach((result, i) => {
      console.log(`  ${i + 1}. Score: ${result.score.toFixed(3)} - ${result.payload.content}`)
    })
    console.log()
    
    // Test 7: User Isolation (Security Test)
    console.log('Test 7: User Isolation')
    const otherUserService = new QdrantService('other-user-456')
    const otherUserResults = await otherUserService.searchVectors({
      query_vector: searchEmbedding.vector,
      limit: 10,
    })
    if (otherUserResults.length > 0) {
      throw new Error('User isolation failed! Other user can see test user vectors')
    }
    console.log('✅ User isolation working correctly (other user sees no vectors)\n')
    
    // Test 8: Collection Statistics
    console.log('Test 8: Collection Statistics')
    const stats = await qdrantService.getCollectionStats()
    console.log(`✅ Collection stats: ${JSON.stringify(stats)}\n`)
    
    // Test 9: Delete Vector
    console.log('Test 9: Delete Vector')
    const deleted = await qdrantService.deleteVector(vectorId1)
    if (!deleted) {
      throw new Error('Failed to delete vector')
    }
    console.log('✅ Vector deleted successfully\n')
    
    // Test 10: Batch Delete
    console.log('Test 10: Batch Delete')
    const deletedCount = await qdrantService.deleteVectorsBatch([vectorId2, vectorId3, vectorId4])
    console.log(`✅ Deleted ${deletedCount} vectors\n`)
    
    // Cleanup: Delete test collection
    console.log('Cleanup: Removing test collection')
    await qdrantService.deleteCollection()
    console.log('✅ Test collection deleted\n')
    
    console.log('🎉 All tests passed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
console.log('Qdrant Integration Test Suite')
console.log('==============================\n')
console.log('Prerequisites:')
console.log('- Qdrant container must be running (bun run infra:start)')
console.log('- Default configuration (no API key required for dev)\n')

runTests().catch(console.error)