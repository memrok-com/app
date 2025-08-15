import type { EventHandler, EventHandlerRequest } from "h3"
import { EmbeddingService } from "../services/embedding-service"

/**
 * Middleware to automatically generate embeddings for newly created memories
 * This runs after successful creation of entities, relations, or observations
 */
export function withAutoEmbed<T extends EventHandlerRequest>(
  handler: EventHandler<T>
): EventHandler<T> {
  return defineEventHandler<T>(async (event) => {
    // Execute the original handler
    const result = await handler(event)
    
    // Check if auto-embedding is enabled
    const autoEmbedEnabled = process.env.AUTO_EMBED_ENABLED !== "false"
    if (!autoEmbedEnabled) {
      return result
    }
    
    // Only process successful POST requests
    if (event.method !== "POST" || !result || typeof result !== "object") {
      return result
    }
    
    // Get user context
    const userId = event.context.user?.id
    if (!userId) {
      return result
    }
    
    // Determine memory type from the URL
    const url = event.path || ""
    let memoryType: "entity" | "relation" | "observation" | null = null
    let memoryId: string | null = null
    
    if (url.includes("/api/entities") && "id" in result) {
      memoryType = "entity"
      memoryId = result.id as string
    } else if (url.includes("/api/relations") && "id" in result) {
      memoryType = "relation"
      memoryId = result.id as string
    } else if (url.includes("/api/observations") && "id" in result) {
      memoryType = "observation"
      memoryId = result.id as string
    }
    
    // If we identified a memory type, generate embedding asynchronously
    if (memoryType && memoryId) {
      // Run embedding generation in background to avoid blocking response
      generateEmbeddingAsync(userId, memoryId, memoryType, result)
        .catch(error => {
          console.error(`Failed to auto-generate embedding for ${memoryType} ${memoryId}:`, error)
        })
    }
    
    return result
  })
}

/**
 * Generate embedding asynchronously in the background
 */
async function generateEmbeddingAsync(
  userId: string,
  memoryId: string,
  memoryType: "entity" | "relation" | "observation",
  memoryData: Record<string, unknown>
): Promise<void> {
  try {
    const embeddingService = new EmbeddingService(userId)
    
    switch (memoryType) {
      case "entity": {
        // Build content for entity
        const name = memoryData.name as string
        const type = memoryData.type as string
        const description = memoryData.description as string | undefined
        
        let content = `${name} (${type})`
        if (description) {
          content += `: ${description}`
        }
        
        // Generate embedding
        await embeddingService.embedEntity(
          memoryId,
          content,
          {
            entityName: name,
            entityType: type,
            createdBy: {
              createdByUser: memoryData.createdBy?.user as string | undefined,
              createdByAssistantName: memoryData.createdBy?.assistant?.name as string | undefined,
              createdByAssistantType: memoryData.createdBy?.assistant?.type as string | undefined,
            },
          }
        )
        
        console.log(`Auto-generated embedding for entity ${memoryId}`)
        break
      }
      
      case "relation": {
        // For relations, we need entity names which might not be in the response
        // Skip auto-embedding for relations as we need to fetch entity details
        console.log(`Skipping auto-embed for relation ${memoryId} (requires entity fetch)`)
        break
      }
      
      case "observation": {
        // For observations, we need entity details which might not be in the response
        // Skip auto-embedding for observations as we need to fetch entity details
        console.log(`Skipping auto-embed for observation ${memoryId} (requires entity fetch)`)
        break
      }
    }
  } catch (error) {
    // Log but don't throw - this is background processing
    console.error(`Auto-embed failed for ${memoryType} ${memoryId}:`, error)
  }
}

/**
 * Check if embedding provider is configured
 */
export function isEmbeddingConfigured(): boolean {
  // Local provider is always available
  return true
}