#!/usr/bin/env bun
import { spawn } from 'child_process'

async function testMCPTools() {
  console.log('🧪 Testing MCP Server Functionality\n')

  // Start the server
  const server = spawn('bun', [
    'run',
    'server/api/mcp/stdio-server.ts',
    '--user-id',
    'test-user-final'
  ], {
    stdio: ['pipe', 'pipe', 'inherit']
  })

  const tests = [
    {
      name: 'List Tools',
      request: {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }
    },
    {
      name: 'Create Entity',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_entity',
          arguments: {
            name: 'Test Person',
            type: 'person',
            description: 'A test person for MCP validation'
          }
        },
        id: 2
      }
    },
    {
      name: 'Create Observation',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_observation',
          arguments: {
            entityId: 'ENTITY_ID_PLACEHOLDER',
            content: 'This person likes to test things',
            metadata: { confidence: 0.9, source: 'test' }
          }
        },
        id: 3
      }
    },
    {
      name: 'Search Memories',
      request: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_memories',
          arguments: {
            query: 'test person',
            limit: 5
          }
        },
        id: 4
      }
    }
  ]

  let currentTest = 0
  let entityId: string | null = null
  const results: Array<{test: string, success: boolean, response?: unknown, error?: unknown}> = []

  server.stdout.on('data', (data) => {
    const responses = data.toString().trim().split('\n').filter(line => {
      try {
        JSON.parse(line)
        return true
      } catch {
        return false
      }
    })

    for (const responseText of responses) {
      try {
        const response = JSON.parse(responseText)
        const test = tests[currentTest]
        
        if (test) {
          console.log(`✅ ${test.name}:`)
          
          if (response.result) {
            if (test.name === 'List Tools') {
              console.log(`   Found ${response.result.tools.length} tools`)
              response.result.tools.forEach(tool => {
                console.log(`   - ${tool.name}`)
              })
            } else if (test.name === 'Create Entity') {
              const result = JSON.parse(response.result.content[0].text)
              entityId = result.entity.id
              console.log(`   Created entity: ${result.entity.name} (${entityId})`)
            } else if (test.name === 'Create Observation') {
              const result = JSON.parse(response.result.content[0].text)
              console.log(`   Created observation: ${result.observation.content}`)
            } else if (test.name === 'Search Memories') {
              const result = JSON.parse(response.result.content[0].text)
              console.log(`   Found ${result.results.entities.length} entities, ${result.results.observations.length} observations`)
            }
            
            results.push({ test: test.name, success: true, response })
          } else if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`)
            results.push({ test: test.name, success: false, error: response.error })
          }
        }
        
        currentTest++
        
        // Send next test
        if (currentTest < tests.length) {
          const nextTest = tests[currentTest]
          
          // Replace placeholder with actual entity ID if needed
          if (nextTest.request.params.arguments?.entityId === 'ENTITY_ID_PLACEHOLDER') {
            nextTest.request.params.arguments.entityId = entityId!
          }
          
          server.stdin.write(JSON.stringify(nextTest.request) + '\n')
        } else {
          // All tests done
          console.log('\n📊 Test Summary:')
          const successful = results.filter(r => r.success).length
          const failed = results.filter(r => !r.success).length
          
          console.log(`✅ Successful: ${successful}`)
          console.log(`❌ Failed: ${failed}`)
          
          if (failed === 0) {
            console.log('\n🎉 All MCP server tests passed!')
          } else {
            console.log('\n⚠️  Some tests failed')
          }
          
          server.kill()
          process.exit(failed === 0 ? 0 : 1)
        }
      } catch {
        console.error('Failed to parse response:', responseText)
      }
    }
  })

  // Send first test
  setTimeout(() => {
    server.stdin.write(JSON.stringify(tests[0].request) + '\n')
  }, 1000)

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('\n⏰ Test timeout')
    server.kill()
    process.exit(1)
  }, 30000)
}

testMCPTools().catch(console.error)