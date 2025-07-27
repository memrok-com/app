import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { createUserDb } from "../../utils/db"
import {
  entities,
  relations,
  observations,
  assistants,
} from "../../database/schema"
import { eq, and, or, like, sql, isNotNull } from "drizzle-orm"

// Helper to get current user/assistant context for RLS-aware operations
function getCreatorContext(assistantId?: string, userId?: string) {
  if (assistantId) {
    return { createdByAssistant: assistantId, createdByUser: undefined }
  }
  return { createdByUser: userId || undefined, createdByAssistant: undefined }
}

export class MemrokMCPServer {
  public server: McpServer
  private assistantId?: string
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
        },
      }
    )

    this.setupTools()
  }

  setContext(assistantId?: string, userId?: string) {
    this.assistantId = assistantId
    this.userId = userId
  }

  private getUserDb() {
    if (!this.userId) {
      throw new Error("User context is required for MCP operations")
    }
    return createUserDb(this.userId)
  }

  private setupTools() {
    // Create entity tool
    this.server.tool(
      "create_entity",
      "Create a new entity in the knowledge graph",
      {
        name: z.string().describe("Name of the entity"),
        type: z
          .string()
          .describe("Type of entity (person, place, event, concept, etc)"),
        description: z
          .string()
          .optional()
          .describe("Description of the entity"),
      },
      async ({ name, type, description }) => {
        const userDb = this.getUserDb()
        const creator = getCreatorContext(this.assistantId, this.userId)

        const entity = await userDb.createEntity({
          name,
          type,
          metadata: description ? { description } : undefined,
          ...creator,
        })

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  entity: {
                    id: entity.id,
                    name: entity.name,
                    type: entity.type,
                    description: entity.metadata?.description,
                  },
                },
                null,
                2
              ),
            },
          ],
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
          .describe("ID of the subject entity (source of the relation)"),
        objectId: z
          .string()
          .describe("ID of the object entity (target of the relation)"),
        predicate: z
          .string()
          .describe(
            'The relationship type (e.g., "knows", "located_at", "part_of")'
          ),
      },
      async ({ subjectId, objectId, predicate }) => {
        const userDb = this.getUserDb()
        const creator = getCreatorContext(this.assistantId, this.userId)

        const relation = await userDb.createRelation({
          subjectId,
          objectId,
          predicate,
          ...creator,
        })

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  relation: {
                    id: relation.id,
                    subjectId: relation.subjectId,
                    objectId: relation.objectId,
                    predicate: relation.predicate,
                  },
                },
                null,
                2
              ),
            },
          ],
        }
      }
    )

    // Create observation tool
    this.server.tool(
      "create_observation",
      "Record an observation or fact about an entity",
      {
        entityId: z
          .string()
          .describe("ID of the entity this observation is about"),
        content: z.string().describe("The observation or fact"),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Additional metadata as key-value pairs"),
      },
      async ({ entityId, content, metadata }) => {
        const userDb = this.getUserDb()
        const creator = getCreatorContext(this.assistantId, this.userId)

        const observation = await userDb.createObservation({
          entityId,
          content,
          metadata,
          ...creator,
        })

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  observation: {
                    id: observation.id,
                    entityId: observation.entityId,
                    content: observation.content,
                    metadata: observation.metadata,
                  },
                },
                null,
                2
              ),
            },
          ],
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
          .optional()
          .describe("Filter by entity types"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of results"),
      },
      async ({ query, entityTypes, limit = 20 }) => {
        const userDb = this.getUserDb()

        // Search entities using RLS-aware database
        const entityFilters: any = { limit }
        if (entityTypes?.length) {
          // For now, we'll filter in memory since UserScopedDatabase doesn't support type filtering
          entityFilters.limit = limit * 2 // Get more to account for filtering
        }

        const allEntities = await userDb.getEntities(entityFilters)

        // Apply search and type filters
        let foundEntities = allEntities.filter((entity) =>
          entity.name.toLowerCase().includes(query.toLowerCase())
        )

        if (entityTypes?.length) {
          foundEntities = foundEntities.filter((entity) =>
            entityTypes.includes(entity.type)
          )
        }

        foundEntities = foundEntities.slice(0, limit)

        // Search observations using RLS-aware database
        const allObservations = await userDb.getObservations({
          limit: limit * 2,
        })
        const foundObservations = allObservations
          .filter((obs) =>
            obs.content.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, limit)

        // Get entity details for observations
        const observationsWithEntities = []
        for (const obs of foundObservations) {
          const entity = await userDb.getEntity(obs.entityId)
          if (entity) {
            observationsWithEntities.push({
              observation: obs,
              entity,
            })
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  results: {
                    entities: foundEntities.map((e) => ({
                      id: e.id,
                      name: e.name,
                      type: e.type,
                      description: e.metadata?.description,
                    })),
                    observations: observationsWithEntities.map((o) => ({
                      id: o.observation.id,
                      content: o.observation.content,
                      entity: {
                        id: o.entity.id,
                        name: o.entity.name,
                        type: o.entity.type,
                      },
                    })),
                  },
                },
                null,
                2
              ),
            },
          ],
        }
      }
    )

    // Get entity relations tool
    this.server.tool(
      "get_entity_relations",
      "Get all relationships for a specific entity",
      {
        entityId: z.string().describe("ID of the entity to get relations for"),
        direction: z
          .enum(["from", "to", "both"])
          .optional()
          .default("both")
          .describe("Direction of relations to retrieve"),
      },
      async ({ entityId, direction = "both" }) => {
        const userDb = this.getUserDb()

        // Get relations using RLS-aware database
        const filters: any = {}
        if (direction === "from" || direction === "both") {
          filters.subjectId = entityId
        }
        if (
          direction === "to" ||
          (direction === "both" && !filters.subjectId)
        ) {
          filters.objectId = entityId
        }

        // If direction is 'both', we need to get relations in both directions
        let allRelations = []

        if (direction === "from" || direction === "both") {
          const subjectRelations = await userDb.getRelations({
            subjectId: entityId,
          })
          allRelations.push(...subjectRelations)
        }

        if (direction === "to" || direction === "both") {
          const objectRelations = await userDb.getRelations({
            objectId: entityId,
          })
          allRelations.push(...objectRelations)
        }

        // Remove duplicates if direction is 'both'
        if (direction === "both") {
          const uniqueRelations = []
          const seenIds = new Set()
          for (const relation of allRelations) {
            if (!seenIds.has(relation.id)) {
              seenIds.add(relation.id)
              uniqueRelations.push(relation)
            }
          }
          allRelations = uniqueRelations
        }

        // Get entity details for each relation
        const relationsWithEntities = []
        for (const relation of allRelations) {
          const subjectEntity = await userDb.getEntity(relation.subjectId)
          const objectEntity = await userDb.getEntity(relation.objectId)

          if (subjectEntity && objectEntity) {
            relationsWithEntities.push({
              id: relation.id,
              predicate: relation.predicate,
              subjectEntity: {
                id: subjectEntity.id,
                name: subjectEntity.name,
                type: subjectEntity.type,
              },
              objectEntity: {
                id: objectEntity.id,
                name: objectEntity.name,
                type: objectEntity.type,
              },
            })
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  relations: relationsWithEntities,
                },
                null,
                2
              ),
            },
          ],
        }
      }
    )
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.log("MCP stdio server started")
  }
}

// Export class for use in other parts of the application
// Note: Don't create instances at module level to avoid side effects
