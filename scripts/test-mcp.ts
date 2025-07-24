#!/usr/bin/env bun
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'child_process'

async function testMCPServer() {
  console.log('Testing MCP Server...\n')

  try {
    // Create client with transport that spawns the server
    const transport = new StdioClientTransport({
      command: 'bun',
      args: [
        'run',
        'server/api/mcp/stdio-server.ts',
        '--user-id',
        'test-user',
        '--assistant-id',
        'test-assistant'
      ],
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://memrok:memrok@localhost:5432/memrok'
      }
    })

    const client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    })

    await client.connect(transport)
    console.log('✅ Connected to MCP server\n')

    // Test 1: List tools
    console.log('Test 1: Listing available tools...')
    const tools = await client.listTools()
    console.log(`Found ${tools.tools.length} tools:`)
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`)
    })
    console.log()

    // Test 2: Create an entity
    console.log('Test 2: Creating an entity...')
    const createEntityResult = await client.callTool('create_entity', {
      name: 'Test Person',
      type: 'person',
      description: 'A test person created by MCP test script'
    })
    console.log('Created entity:', JSON.parse(createEntityResult.content[0].text))
    const entityId = JSON.parse(createEntityResult.content[0].text).entity.id
    console.log()

    // Test 3: Create an observation
    console.log('Test 3: Creating an observation...')
    const createObsResult = await client.callTool('create_observation', {
      entityId: entityId,
      content: 'This person likes testing',
      metadata: { source: 'test-script' }
    })
    console.log('Created observation:', JSON.parse(createObsResult.content[0].text))
    console.log()

    // Test 4: Search memories
    console.log('Test 4: Searching memories...')
    const searchResult = await client.callTool('search_memories', {
      query: 'test',
      limit: 5
    })
    console.log('Search results:', JSON.parse(searchResult.content[0].text))
    console.log()

    // Test 5: Create another entity and a relation
    console.log('Test 5: Creating a relation...')
    const createEntity2Result = await client.callTool('create_entity', {
      name: 'Test Project',
      type: 'project',
      description: 'A test project'
    })
    const entity2Id = JSON.parse(createEntity2Result.content[0].text).entity.id

    const createRelationResult = await client.callTool('create_relation', {
      fromEntityId: entityId,
      toEntityId: entity2Id,
      predicate: 'works_on'
    })
    console.log('Created relation:', JSON.parse(createRelationResult.content[0].text))
    console.log()

    // Test 6: Get entity relations
    console.log('Test 6: Getting entity relations...')
    const getRelationsResult = await client.callTool('get_entity_relations', {
      entityId: entityId,
      direction: 'both'
    })
    console.log('Entity relations:', JSON.parse(getRelationsResult.content[0].text))
    console.log()

    console.log('✅ All tests passed!')

    // Clean up
    await client.close()

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testMCPServer().catch(console.error)