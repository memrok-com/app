#!/usr/bin/env bun
import { spawn } from 'child_process'

// Just test the server can start and handle basic JSON-RPC
const serverProcess = spawn('bun', [
  'run',
  'server/api/mcp/stdio-server.ts',
  '--user-id',
  'test-user'
], {
  stdio: ['pipe', 'pipe', 'inherit'] // Inherit stderr to see errors
})

// Send a list tools request
const request = {
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
}

console.log('Sending request:', JSON.stringify(request))
serverProcess.stdin.write(JSON.stringify(request) + '\n')

// Listen for response
serverProcess.stdout.on('data', (data) => {
  console.log('Response:', data.toString())
  
  // Try a tool call
  const toolRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create_entity',
      arguments: {
        name: 'Test Entity',
        type: 'test'
      }
    },
    id: 2
  }
  
  console.log('\nSending tool call:', JSON.stringify(toolRequest))
  serverProcess.stdin.write(JSON.stringify(toolRequest) + '\n')
})

// Give it some time then exit
setTimeout(() => {
  console.log('\nTest complete')
  serverProcess.kill()
  process.exit(0)
}, 5000)