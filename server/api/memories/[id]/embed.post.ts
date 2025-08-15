import { z } from "zod"
import { createAuthenticatedHandler } from "../../../utils/auth-middleware"
import { EmbeddingService } from "../../../services/embedding-service"
import { MemoryService, type RelationDTO } from "../../../services/memory-service"

// Request schema
const embedRequestSchema = z.object({
  type: z.enum(["entity", "relation", "observation"]),
  force: z.boolean().optional().default(false),
})

// Response schema
const _embedResponseSchema = z.object({
  success: z.boolean(),
  embedding: z.object({
    id: z.string(),
    model: z.string(),
    dimensions: z.number(),
    contentHash: z.string(),
    timestamp: z.string(),
  }).optional(),
  error: z.string().optional(),
})

export type EmbedRequest = z.infer<typeof embedRequestSchema>
export type EmbedResponse = z.infer<typeof _embedResponseSchema>

/**
 * Generate or regenerate embeddings for a memory item
 * POST /api/memories/:id/embed
 */
export default createAuthenticatedHandler(async (event, userDb, user) => {
  const id = getRouterParam(event, "id")
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Memory ID is required",
    })
  }

  // Validate request body
  let body: EmbedRequest
  try {
    const rawBody = await readBody(event)
    body = embedRequestSchema.parse(rawBody)
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

    // Get the memory item based on type
    let content: string
    
    switch (body.type) {
      case "entity": {
        const entity = await memoryService.getEntity(id)
        if (!entity) {
          throw createError({
            statusCode: 404,
            statusMessage: "Entity not found",
          })
        }
        
        // Build content for embedding
        content = `${entity.name} (${entity.type})`
        if (entity.description) {
          content += `: ${entity.description}`
        }
        
        // Get related entities for context
        const relations = await memoryService.getEntityRelations(id)
        const relatedEntityIds = relations.map((r: RelationDTO) => 
          r.subjectId === id ? r.objectId : r.subjectId
        )
        
        // Generate embedding with context
        const result = await embeddingService.embedEntity(
          id,
          content,
          {
            entityName: entity.name,
            entityType: entity.type,
            relatedEntityIds,
            createdBy: {
              createdByUser: entity.createdBy.user,
              createdByAssistantName: entity.createdBy.assistant?.name,
              createdByAssistantType: entity.createdBy.assistant?.type,
            },
          }
        )
        
        return {
          success: true,
          embedding: {
            id: result.id,
            model: result.metadata.model,
            dimensions: result.metadata.dimensions,
            contentHash: result.metadata.contentHash,
            timestamp: result.metadata.timestamp.toISOString(),
          },
        } satisfies EmbedResponse
      }
      
      case "relation": {
        const relation = await memoryService.getRelation(id)
        if (!relation) {
          throw createError({
            statusCode: 404,
            statusMessage: "Relation not found",
          })
        }
        
        // Get entity names for triplet context
        const subjectEntity = relation.subjectEntity
        const objectEntity = relation.objectEntity
        
        if (!subjectEntity || !objectEntity) {
          throw createError({
            statusCode: 400,
            statusMessage: "Related entities not found",
          })
        }
        
        // Build content
        content = `${subjectEntity.name} ${relation.predicate} ${objectEntity.name}`
        
        // Generate embedding with triplet context
        const result = await embeddingService.embedRelation(
          id,
          content,
          {
            sourceEntityId: relation.subjectId,
            targetEntityId: relation.objectId,
            sourceEntityName: subjectEntity.name,
            targetEntityName: objectEntity.name,
            predicate: relation.predicate,
            strength: relation.strength || 1.0,
            createdBy: {
              createdByUser: userId, // Relations don't track creator separately
            },
          }
        )
        
        return {
          success: true,
          embedding: {
            id: result.id,
            model: result.metadata.model,
            dimensions: result.metadata.dimensions,
            contentHash: result.metadata.contentHash,
            timestamp: result.metadata.timestamp.toISOString(),
          },
        } satisfies EmbedResponse
      }
      
      case "observation": {
        const observation = await memoryService.getObservation(id)
        if (!observation) {
          throw createError({
            statusCode: 404,
            statusMessage: "Observation not found",
          })
        }
        
        // Get entity for context
        const entity = observation.entity
        if (!entity) {
          throw createError({
            statusCode: 400,
            statusMessage: "Related entity not found",
          })
        }
        
        // Build content with entity context
        content = `[${entity.name}] ${observation.content}`
        
        // Generate embedding
        const result = await embeddingService.embedEntity(
          `obs_${id}`, // Prefix observation IDs
          content,
          {
            entityName: entity.name,
            entityType: entity.type,
            source: observation.source,
            createdBy: {
              createdByUser: userId, // Observations don't track creator separately
            },
          }
        )
        
        return {
          success: true,
          embedding: {
            id: result.id,
            model: result.metadata.model,
            dimensions: result.metadata.dimensions,
            contentHash: result.metadata.contentHash,
            timestamp: result.metadata.timestamp.toISOString(),
          },
        } satisfies EmbedResponse
      }
      
      default:
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid memory type",
        })
    }
  } catch (error) {
    // If it's already an H3 error, re-throw it
    if (error instanceof Error && "statusCode" in error) {
      throw error
    }
    
    // Log unexpected errors
    console.error("Embedding generation error:", error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate embedding",
    } satisfies EmbedResponse
  }
})