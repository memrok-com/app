import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { createUserDb } from "../../utils/db"
import { MemoryService, type CreatorContext } from "../../services/memory-service"
import {
  MCPErrorCode,
} from "../../utils/mcp-security"
import {
  toMCPError,
  createMCPSuccessResponse,
  createMCPErrorResponse,
  MemrokMCPError,
} from "../../utils/mcp-errors"


export class MemrokMCPServer {
  public server: McpServer
  private assistantName?: string
  private assistantType?: string
  private userId?: string

  constructor() {
    this.server = new McpServer(
      {
        name: "memrok",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          experimental: {
            samplingRequests: false,
          },
        },
      }
    )

    this.setupTools()
  }

  setContext(assistantName?: string, assistantType?: string, userId?: string) {
    this.assistantName = assistantName
    this.assistantType = assistantType
    this.userId = userId
  }

  private getMemoryService(): MemoryService {
    if (!this.userId) {
      throw new MemrokMCPError(
        MCPErrorCode.CONTEXT_ERROR,
        "User context is required for MCP operations"
      )
    }
    const userDb = createUserDb(this.userId)
    return new MemoryService(userDb)
  }

  private getCreatorContext(): CreatorContext {
    return {
      createdByUser: this.assistantName ? undefined : this.userId,
      createdByAssistantName: this.assistantName,
      createdByAssistantType: this.assistantType,
    }
  }

  private setupTools() {
    // Create entity tool
    this.server.tool(
      "create_entity",
      "Create a new entity in the knowledge graph (max 200 chars name, 1000 chars description)",
      {
        name: z.string().describe("Name of the entity (max 200 characters)"),
        type: z
          .string()
          .describe("Type of entity (person, place, event, concept, etc)"),
        description: z
          .string()
          .optional()
          .describe("Description of the entity (max 1000 characters)"),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Additional metadata as key-value pairs"),
      },
      async ({ name, type, description, metadata }) => {
        try {
          const memoryService = this.getMemoryService()
          const creator = this.getCreatorContext()

          const entity = await memoryService.createEntity(
            { name, type, description, metadata },
            creator
          )

          const response = createMCPSuccessResponse({
            entity: {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              description: entity.description,
              createdAt: entity.createdAt,
              createdBy: entity.createdBy,
            },
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Create relation tool
    this.server.tool(
      "create_relation",
      "Create a relationship between two entities",
      {
        subjectId: z
          .string()
          .uuid()
          .describe("ID of the subject entity (source of the relation)"),
        objectId: z
          .string()
          .uuid()
          .describe("ID of the object entity (target of the relation)"),
        predicate: z
          .string()
          .describe(
            'The relationship type (e.g., "knows", "located_at", "part_of") - max 100 chars'
          ),
        strength: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Relationship strength (0.0 to 1.0)"),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Additional metadata as key-value pairs"),
      },
      async ({ subjectId, objectId, predicate, strength, metadata }) => {
        try {
          const memoryService = this.getMemoryService()
          const creator = this.getCreatorContext()

          const relation = await memoryService.createRelation(
            { subjectId, objectId, predicate, strength, metadata },
            creator
          )

          const response = createMCPSuccessResponse({
            relation: {
              id: relation.id,
              subjectId: relation.subjectId,
              objectId: relation.objectId,
              predicate: relation.predicate,
              strength: relation.strength,
              createdAt: relation.createdAt,
              subjectEntity: relation.subjectEntity,
              objectEntity: relation.objectEntity,
            },
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Create observation tool
    this.server.tool(
      "create_observation",
      "Record an observation or fact about an entity (max 25,000 characters)",
      {
        entityId: z
          .string()
          .uuid()
          .describe("ID of the entity this observation is about"),
        content: z
          .string()
          .describe("The observation or fact (max 25,000 characters)"),
        source: z
          .string()
          .optional()
          .describe("Source of the observation (e.g., 'meeting', 'document', 'conversation')"),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Additional metadata as key-value pairs"),
      },
      async ({ entityId, content, source, metadata }) => {
        try {
          const memoryService = this.getMemoryService()
          const creator = this.getCreatorContext()

          const observation = await memoryService.createObservation(
            { entityId, content, source, metadata },
            creator
          )

          const response = createMCPSuccessResponse({
            observation: {
              id: observation.id,
              entityId: observation.entityId,
              content: observation.content,
              source: observation.source,
              metadata: observation.metadata,
              createdAt: observation.createdAt,
              entity: observation.entity,
            },
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Search memories tool
    this.server.tool(
      "search_memories",
      "Search through stored memories and entities",
      {
        query: z.string().describe("Search query to find relevant memories"),
        entityTypes: z
          .array(z.string())
          .max(10)
          .optional()
          .describe("Filter by entity types (max 10 types)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Maximum number of results (1-100)"),
      },
      async ({ query, entityTypes, limit = 20 }) => {
        try {
          const memoryService = this.getMemoryService()

          const results = await memoryService.searchMemories({
            query,
            entityTypes,
            limit,
          })

          const response = createMCPSuccessResponse({
            results: {
              entities: results.entities.map((e) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                description: e.description,
                createdAt: e.createdAt,
                createdBy: e.createdBy,
              })),
              observations: results.observations.map((o) => ({
                id: o.id,
                content: o.content,
                source: o.source,
                createdAt: o.createdAt,
                entity: o.entity ? {
                  id: o.entity.id,
                  name: o.entity.name,
                  type: o.entity.type,
                } : undefined,
              })),
              totalCount: results.totalCount,
            },
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Get entity relations tool
    this.server.tool(
      "get_entity_relations",
      "Get all relationships for a specific entity",
      {
        entityId: z
          .string()
          .uuid()
          .describe("ID of the entity to get relations for"),
        direction: z
          .enum(["from", "to", "both"])
          .optional()
          .default("both")
          .describe("Direction of relations to retrieve"),
      },
      async ({ entityId, direction = "both" }) => {
        try {
          const memoryService = this.getMemoryService()

          const relations = await memoryService.getEntityRelations(
            entityId,
            direction
          )

          const response = createMCPSuccessResponse({
            relations: relations.map((r) => ({
              id: r.id,
              predicate: r.predicate,
              strength: r.strength,
              createdAt: r.createdAt,
              subjectEntity: r.subjectEntity ? {
                id: r.subjectEntity.id,
                name: r.subjectEntity.name,
                type: r.subjectEntity.type,
              } : undefined,
              objectEntity: r.objectEntity ? {
                id: r.objectEntity.id,
                name: r.objectEntity.name,
                type: r.objectEntity.type,
              } : undefined,
            })),
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Batch create entities tool
    this.server.tool(
      "batch_create_entities",
      "Create multiple entities in a single operation (max 50 entities)",
      {
        entities: z
          .array(
            z.object({
              name: z.string().describe("Name of the entity (max 200 characters)"),
              type: z.string().describe("Type of entity"),
              description: z
                .string()
                .optional()
                .describe("Description of the entity (max 1000 characters)"),
              metadata: z
                .record(z.any())
                .optional()
                .describe("Additional metadata"),
            })
          )
          .min(1)
          .max(50)
          .describe("Array of entities to create (1-50 entities)"),
      },
      async ({ entities }) => {
        try {
          const memoryService = this.getMemoryService()
          const creator = this.getCreatorContext()

          const createdEntities = await memoryService.batchCreateEntities(
            entities,
            creator
          )

          const response = createMCPSuccessResponse({
            entities: createdEntities.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              description: e.description,
              createdAt: e.createdAt,
              createdBy: e.createdBy,
            })),
            count: createdEntities.length,
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Forget memory tool (delete entity)
    this.server.tool(
      "forget_memory",
      "Delete an entity and all its associated relations and observations",
      {
        entityId: z
          .string()
          .uuid()
          .describe("ID of the entity to delete"),
      },
      async ({ entityId }) => {
        try {
          const memoryService = this.getMemoryService()

          await memoryService.deleteEntity(entityId)

          const response = createMCPSuccessResponse({
            deleted: true,
            entityId,
            message: "Entity and all associated data deleted successfully",
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )

    // Get entity details tool
    this.server.tool(
      "get_entity_details",
      "Get detailed information about a specific entity including observations",
      {
        entityId: z
          .string()
          .uuid()
          .describe("ID of the entity to get details for"),
      },
      async ({ entityId }) => {
        try {
          const memoryService = this.getMemoryService()

          const entity = await memoryService.getEntity(entityId)
          if (!entity) {
            throw new MemrokMCPError(
              MCPErrorCode.ENTITY_NOT_FOUND,
              `Entity with ID ${entityId} not found`
            )
          }

          const observations = await memoryService.getEntityObservations(entityId)
          const relations = await memoryService.getEntityRelations(entityId)

          const response = createMCPSuccessResponse({
            entity: {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              description: entity.description,
              metadata: entity.metadata,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
              createdBy: entity.createdBy,
            },
            observations: observations.map((o) => ({
              id: o.id,
              content: o.content,
              source: o.source,
              createdAt: o.createdAt,
            })),
            relations: relations.map((r) => ({
              id: r.id,
              predicate: r.predicate,
              strength: r.strength,
              subjectEntity: r.subjectEntity,
              objectEntity: r.objectEntity,
            })),
            counts: {
              observations: observations.length,
              relations: relations.length,
            },
          })

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        } catch (error) {
          const mcpError = toMCPError(error)
          const response = createMCPErrorResponse(mcpError)
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          }
        }
      }
    )
  }

  // Method to list all available tools
  async listTools() {
    const tools = []
    
    // Get tools from the MCP server instance
    // The tools are registered during setupTools(), we need to extract them
    // This is a simplified implementation - in a real scenario you'd want to
    // maintain a registry of tools or use the server's internal tool list
    
    tools.push(
      {
        name: "create_entity",
        description: "Create a new entity (person, place, concept, etc.) with optional metadata",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the entity (max 200 characters)" },
            type: { type: "string", description: "Type of entity" },
            description: { type: "string", description: "Description of the entity (max 1000 characters)" },
            metadata: { type: "object", description: "Additional metadata as key-value pairs" }
          },
          required: ["name", "type"]
        }
      },
      {
        name: "create_relation",
        description: "Create a relation between two entities",
        inputSchema: {
          type: "object",
          properties: {
            subjectId: { type: "string", description: "ID of the subject entity" },
            objectId: { type: "string", description: "ID of the object entity" },
            predicate: { type: "string", description: "Type of relation" },
            strength: { type: "number", description: "Strength of the relation (0.0-1.0)", minimum: 0, maximum: 1 },
            metadata: { type: "object", description: "Additional metadata" }
          },
          required: ["subjectId", "objectId", "predicate"]
        }
      },
      {
        name: "create_observation",
        description: "Add an observation to an entity",
        inputSchema: {
          type: "object",
          properties: {
            entityId: { type: "string", description: "ID of the entity to observe" },
            content: { type: "string", description: "Observation content" },
            source: { type: "string", description: "Source of the observation" },
            metadata: { type: "object", description: "Additional metadata" }
          },
          required: ["entityId", "content"]
        }
      },
      {
        name: "search_memories",
        description: "Search for entities by name or type",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            entityTypes: { type: "array", items: { type: "string" }, description: "Filter by entity types" },
            limit: { type: "number", description: "Maximum results to return", default: 20 }
          },
          required: ["query"]
        }
      },
      {
        name: "get_entity_relations",
        description: "Get all relations for a specific entity",
        inputSchema: {
          type: "object",
          properties: {
            entityId: { type: "string", description: "ID of the entity" },
            direction: { type: "string", enum: ["incoming", "outgoing", "both"], description: "Direction of relations", default: "both" }
          },
          required: ["entityId"]
        }
      },
      {
        name: "batch_create_entities",
        description: "Create multiple entities in a single operation (max 50 entities)",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              maxItems: 50,
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Name of the entity (max 200 characters)" },
                  type: { type: "string", description: "Type of entity" },
                  description: { type: "string", description: "Description of the entity (max 1000 characters)" },
                  metadata: { type: "object", description: "Additional metadata" }
                },
                required: ["name", "type"]
              }
            }
          },
          required: ["entities"]
        }
      },
      {
        name: "get_entity_observations",
        description: "Get all observations for a specific entity",
        inputSchema: {
          type: "object",
          properties: {
            entityId: { type: "string", description: "ID of the entity" }
          },
          required: ["entityId"]
        }
      },
      {
        name: "delete_entity",
        description: "Delete an entity and all its relations and observations",
        inputSchema: {
          type: "object",
          properties: {
            entityId: { type: "string", description: "ID of the entity to delete" }
          },
          required: ["entityId"]
        }
      }
    )
    
    return { tools }
  }

  // Method to call a specific tool
  async callTool(name: string, args: Record<string, unknown>) {
    try {
      const memoryService = this.getMemoryService()
      const creator = this.getCreatorContext()

      switch (name) {
        case "create_entity": {
          const { name: entityName, type, description, metadata } = args as {
            name: string
            type: string
            description?: string
            metadata?: Record<string, unknown>
          }
          const entity = await memoryService.createEntity(
            { name: entityName, type, description, metadata },
            creator
          )
          const response = createMCPSuccessResponse({
            entity: {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              description: entity.description,
              createdAt: entity.createdAt,
              createdBy: entity.createdBy,
            },
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "create_relation": {
          const { subjectId, objectId, predicate, strength, metadata } = args as {
            subjectId: string
            objectId: string
            predicate: string
            strength?: number
            metadata?: Record<string, unknown>
          }
          const relation = await memoryService.createRelation(
            { subjectId, objectId, predicate, strength, metadata },
            creator
          )
          const response = createMCPSuccessResponse({
            relation: {
              id: relation.id,
              subjectId: relation.subjectId,
              objectId: relation.objectId,
              predicate: relation.predicate,
              strength: relation.strength,
              createdAt: relation.createdAt,
              subjectEntity: relation.subjectEntity,
              objectEntity: relation.objectEntity,
            },
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "create_observation": {
          const { entityId, content, source, metadata } = args as {
            entityId: string
            content: string
            source?: string
            metadata?: Record<string, unknown>
          }
          const observation = await memoryService.createObservation(
            { entityId, content, source, metadata },
            creator
          )
          const response = createMCPSuccessResponse({
            observation: {
              id: observation.id,
              entityId: observation.entityId,
              content: observation.content,
              source: observation.source,
              metadata: observation.metadata,
              createdAt: observation.createdAt,
              entity: observation.entity,
            },
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "search_memories": {
          const { query, entityTypes, limit = 20 } = args as {
            query: string
            entityTypes?: string[]
            limit?: number
          }
          const results = await memoryService.searchMemories({ query, entityTypes, limit })
          const response = createMCPSuccessResponse({
            results: {
              entities: results.entities.map((e) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                description: e.description,
                createdAt: e.createdAt,
                createdBy: e.createdBy,
              })),
              observations: results.observations.map((o) => ({
                id: o.id,
                content: o.content,
                source: o.source,
                createdAt: o.createdAt,
                entity: o.entity ? { id: o.entity.id, name: o.entity.name, type: o.entity.type } : undefined,
              })),
              totalCount: results.totalCount,
            },
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "get_entity_relations": {
          const { entityId, direction = "both" } = args as {
            entityId: string
            direction?: "incoming" | "outgoing" | "both"
          }
          // Map MCP direction to MemoryService direction
          const serviceDirection = direction === "incoming" ? "to" : direction === "outgoing" ? "from" : "both"
          const relations = await memoryService.getEntityRelations(entityId, serviceDirection)
          const response = createMCPSuccessResponse({
            relations: relations.map((r) => ({
              id: r.id,
              predicate: r.predicate,
              strength: r.strength,
              createdAt: r.createdAt,
              subjectEntity: r.subjectEntity ? {
                id: r.subjectEntity.id,
                name: r.subjectEntity.name,
                type: r.subjectEntity.type,
              } : undefined,
              objectEntity: r.objectEntity ? {
                id: r.objectEntity.id,
                name: r.objectEntity.name,
                type: r.objectEntity.type,
              } : undefined,
            })),
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "batch_create_entities": {
          const { entities } = args as {
            entities: Array<{
              name: string
              type: string
              description?: string
              metadata?: Record<string, unknown>
            }>
          }
          const createdEntities = await memoryService.batchCreateEntities(entities, creator)
          const response = createMCPSuccessResponse({
            entities: createdEntities.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              description: e.description,
              createdAt: e.createdAt,
              createdBy: e.createdBy,
            })),
            count: createdEntities.length,
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "get_entity_observations": {
          const { entityId } = args as { entityId: string }
          const observations = await memoryService.getEntityObservations(entityId)
          const response = createMCPSuccessResponse({
            observations: observations.map((o) => ({
              id: o.id,
              content: o.content,
              source: o.source,
              createdAt: o.createdAt,
            })),
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        case "delete_entity": {
          const { entityId } = args as { entityId: string }
          await memoryService.deleteEntity(entityId)
          const response = createMCPSuccessResponse({
            deleted: true,
            entityId,
            message: "Entity and all associated data deleted successfully",
          })
          return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
        }

        default:
          throw new MemrokMCPError(MCPErrorCode.INVALID_INPUT, `Unknown tool: ${name}`)
      }
    } catch (error) {
      const mcpError = toMCPError(error)
      const response = createMCPErrorResponse(mcpError)
      return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }
    }
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    // Server started - no console output needed as it clutters dev server logs
  }
}

// Export class for use in other parts of the application
// Note: Don't create instances at module level to avoid side effects
