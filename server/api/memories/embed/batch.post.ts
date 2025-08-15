import { z } from "zod"
import { createAuthenticatedHandler } from "../../../utils/auth-middleware"
import { EmbeddingService } from "../../../services/embedding-service"
import { MemoryService } from "../../../services/memory-service"
import type { VectorCollectionType } from "../../../services/qdrant-service"

// Request schema
const batchEmbedRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    type: z.enum(["entity", "relation", "observation"]),
  })).min(1).max(100),
  force: z.boolean().optional().default(false),
})

// Response schema
const _batchEmbedResponseSchema = z.object({
  successful: z.array(z.object({
    id: z.string(),
    model: z.string(),
    dimensions: z.number(),
    contentHash: z.string(),
    timestamp: z.string(),
  })),
  failed: z.array(z.object({
    id: z.string(),
    error: z.string(),
  })),
  summary: z.object({
    total: z.number(),
    succeeded: z.number(),
    failed: z.number(),
  }),
})

export type BatchEmbedRequest = z.infer<typeof batchEmbedRequestSchema>
export type BatchEmbedResponse = z.infer<typeof _batchEmbedResponseSchema>

/**
 * Generate embeddings for multiple memory items in batch
 * POST /api/memories/embed/batch
 */
export default createAuthenticatedHandler(async (event, userDb, user) => {
  // Validate request body
  let body: BatchEmbedRequest
  try {
    const rawBody = await readBody(event)
    body = batchEmbedRequestSchema.parse(rawBody)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof z.ZodError 
        ? `Invalid request: ${error.errors.map(e => e.message).join(", ")}`
        : "Invalid request body",
    })
  }

  const userId = user.id

  try {
    const memoryService = new MemoryService(userDb)
    const embeddingService = new EmbeddingService(userId)

    // Prepare batch items with content
    const batchItems: Array<{
      id: string
      content: string
      type: VectorCollectionType
      metadata?: Record<string, unknown>
    }> = []
    
    const failed: Array<{ id: string; error: string }> = []

    // Process each item to get content
    for (const item of body.items) {
      try {
        switch (item.type) {
          case "entity": {
            const entity = await memoryService.getEntity(item.id)
            if (!entity) {
              failed.push({ id: item.id, error: "Entity not found" })
              continue
            }
            
            let content = `${entity.name} (${entity.type})`
            if (entity.description) {
              content += `: ${entity.description}`
            }
            
            batchItems.push({
              id: item.id,
              content,
              type: "entities",
              metadata: {
                entityName: entity.name,
                entityType: entity.type,
                createdBy: entity.createdBy,
              },
            })
            break
          }
          
          case "relation": {
            const relation = await memoryService.getRelation(item.id)
            if (!relation) {
              failed.push({ id: item.id, error: "Relation not found" })
              continue
            }
            
            const subjectEntity = relation.subjectEntity
            const objectEntity = relation.objectEntity
            
            if (!subjectEntity || !objectEntity) {
              failed.push({ id: item.id, error: "Related entities not found" })
              continue
            }
            
            const content = `${subjectEntity.name} ${relation.predicate} ${objectEntity.name}`
            
            batchItems.push({
              id: item.id,
              content,
              type: "relations",
              metadata: {
                sourceEntityId: relation.subjectId,
                targetEntityId: relation.objectId,
                sourceEntityName: subjectEntity.name,
                targetEntityName: objectEntity.name,
                predicate: relation.predicate,
                strength: relation.strength || 1.0,
              },
            })
            break
          }
          
          case "observation": {
            const observation = await memoryService.getObservation(item.id)
            if (!observation) {
              failed.push({ id: item.id, error: "Observation not found" })
              continue
            }
            
            const entity = observation.entity
            if (!entity) {
              failed.push({ id: item.id, error: "Related entity not found" })
              continue
            }
            
            const content = `[${entity.name}] ${observation.content}`
            
            batchItems.push({
              id: `obs_${item.id}`,
              content,
              type: "entities", // Store observations as entity vectors
              metadata: {
                entityName: entity.name,
                entityType: entity.type,
                source: observation.source,
              },
            })
            break
          }
        }
      } catch (error) {
        failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : "Failed to prepare item",
        })
      }
    }

    // Generate embeddings in batch
    const result = await embeddingService.embedBatch(batchItems)
    
    // Combine results
    const allFailed = [...failed, ...result.failed]
    
    // Format successful results
    const successful = result.successful.map(item => ({
      id: item.id.startsWith("obs_") ? item.id.slice(4) : item.id, // Remove obs_ prefix
      model: item.metadata.model,
      dimensions: item.metadata.dimensions,
      contentHash: item.metadata.contentHash,
      timestamp: item.metadata.timestamp.toISOString(),
    }))

    return {
      successful,
      failed: allFailed,
      summary: {
        total: body.items.length,
        succeeded: successful.length,
        failed: allFailed.length,
      },
    } satisfies BatchEmbedResponse
  } catch (error) {
    // Log unexpected errors
    console.error("Batch embedding error:", error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "Failed to generate embeddings",
    })
  }
})