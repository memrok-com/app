import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { db } from '../../utils/db'
import { entities, relations, observations, assistants } from '../../database/schema'
import { eq, and, or, like, sql, isNotNull } from 'drizzle-orm'

// Helper to get current user/assistant context
async function getCreatorContext(assistantId?: string, userId?: string) {
  if (assistantId) {
    const assistant = await db.query.assistants.findFirst({
      where: eq(assistants.id, assistantId)
    })
    return { createdByAssistant: assistantId, createdByUser: assistant?.userId }
  }
  return { createdByUser: userId || null, createdByAssistant: null }
}

export class MemrokMCPServer {
  public server: McpServer
  private assistantId?: string
  private userId?: string

  constructor() {
    this.server = new McpServer(
      {
        name: 'memrok',
        version: '1.0.0',
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

  private setupTools() {
    // Create entity tool
    this.server.tool(
      'create_entity',
      'Create a new entity in the knowledge graph',
      {
        name: z.string().describe('Name of the entity'),
        type: z.string().describe('Type of entity (person, place, event, concept, etc)'),
        description: z.string().optional().describe('Description of the entity'),
      },
      async ({ name, type, description }) => {
        const creator = await getCreatorContext(this.assistantId, this.userId)
        
        const [entity] = await db.insert(entities).values({
          name,
          type,
          description,
          ...creator,
        }).returning()
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              entity: {
                id: entity.id,
                name: entity.name,
                type: entity.type,
                description: entity.description,
              },
            }, null, 2)
          }]
        }
      }
    )

    // Create relation tool
    this.server.tool(
      'create_relation',
      'Create a relationship between two entities',
      {
        fromEntityId: z.string().describe('ID of the source entity'),
        toEntityId: z.string().describe('ID of the target entity'),
        predicate: z.string().describe('The relationship type (e.g., "knows", "located_at", "part_of")'),
      },
      async ({ fromEntityId, toEntityId, predicate }) => {
        const creator = await getCreatorContext(this.assistantId, this.userId)
        const [relation] = await db.insert(relations).values({
          fromEntityId,
          toEntityId,
          predicate,
          ...creator,
        }).returning()
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              relation: {
                id: relation.id,
                fromEntityId: relation.fromEntityId,
                toEntityId: relation.toEntityId,
                predicate: relation.predicate,
              },
            }, null, 2)
          }]
        }
      }
    )

    // Create observation tool
    this.server.tool(
      'create_observation',
      'Record an observation or fact about an entity',
      {
        entityId: z.string().describe('ID of the entity this observation is about'),
        content: z.string().describe('The observation or fact'),
        metadata: z.record(z.any()).optional().describe('Additional metadata as key-value pairs'),
      },
      async ({ entityId, content, metadata }) => {
        const creator = await getCreatorContext(this.assistantId, this.userId)
        const [observation] = await db.insert(observations).values({
          entityId,
          content,
          metadata,
          observedAt: new Date(),
          ...creator,
        }).returning()
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              observation: {
                id: observation.id,
                entityId: observation.entityId,
                content: observation.content,
                observedAt: observation.observedAt,
                metadata: observation.metadata,
              },
            }, null, 2)
          }]
        }
      }
    )

    // Search memories tool
    this.server.tool(
      'search_memories',
      'Search through stored memories and entities',
      {
        query: z.string().describe('Search query to find relevant memories'),
        entityTypes: z.array(z.string()).optional().describe('Filter by entity types'),
        limit: z.number().optional().default(20).describe('Maximum number of results'),
      },
      async ({ query, entityTypes, limit = 20 }) => {
        const creator = await getCreatorContext(this.assistantId, this.userId)
        
        // Search entities
        const entitiesQuery = db.select().from(entities).where(
          and(
            like(entities.name, `%${query}%`),
            entityTypes?.length 
              ? sql`${entities.type} = ANY(${entityTypes})`
              : undefined,
            creator.createdByUser 
              ? eq(entities.createdByUser, creator.createdByUser)
              : undefined
          )
        ).limit(limit)
        
        const foundEntities = await entitiesQuery

        // Also search observations
        const observationsQuery = db.select({
          observation: observations,
          entity: entities,
        })
        .from(observations)
        .innerJoin(entities, eq(observations.entityId, entities.id))
        .where(
          and(
            like(observations.content, `%${query}%`),
            creator.createdByUser 
              ? eq(observations.createdByUser, creator.createdByUser)
              : undefined
          )
        )
        .limit(limit)
        
        const foundObservations = await observationsQuery

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              results: {
                entities: foundEntities.map(e => ({
                  id: e.id,
                  name: e.name,
                  type: e.type,
                  description: e.description,
                })),
                observations: foundObservations.map(o => ({
                  id: o.observation.id,
                  content: o.observation.content,
                  entity: {
                    id: o.entity.id,
                    name: o.entity.name,
                    type: o.entity.type,
                  },
                  observedAt: o.observation.observedAt,
                })),
              },
            }, null, 2)
          }]
        }
      }
    )

    // Get entity relations tool
    this.server.tool(
      'get_entity_relations',
      'Get all relationships for a specific entity',
      {
        entityId: z.string().describe('ID of the entity to get relations for'),
        direction: z.enum(['from', 'to', 'both']).optional().default('both').describe('Direction of relations to retrieve'),
      },
      async ({ entityId, direction = 'both' }) => {
        const creator = await getCreatorContext(this.assistantId, this.userId)
        
        const conditions = []
        if (direction === 'from' || direction === 'both') {
          conditions.push(eq(relations.fromEntityId, entityId))
        }
        if (direction === 'to' || direction === 'both') {
          conditions.push(eq(relations.toEntityId, entityId))
        }

        const entityRelations = await db.select({
          relation: relations,
          fromEntity: {
            id: sql`fe.id`,
            name: sql`fe.name`, 
            type: sql`fe.type`,
          },
          toEntity: {
            id: sql`te.id`,
            name: sql`te.name`,
            type: sql`te.type`,
          },
        })
        .from(relations)
        .innerJoin(sql`${entities} as fe`, sql`${relations.fromEntityId} = fe.id`)
        .innerJoin(sql`${entities} as te`, sql`${relations.toEntityId} = te.id`)
        .where(
          and(
            conditions.length > 0 ? or(...conditions) : undefined,
            creator.createdByUser 
              ? eq(relations.createdByUser, creator.createdByUser)
              : undefined
          )
        )

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              relations: entityRelations.map(r => ({
                id: r.relation.id,
                predicate: r.relation.predicate,
                fromEntity: r.fromEntity,
                toEntity: r.toEntity,
              })),
            }, null, 2)
          }]
        }
      }
    )
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('MCP server started')
  }
}

// Export for use in other parts of the application
export const mcpServer = new MemrokMCPServer()