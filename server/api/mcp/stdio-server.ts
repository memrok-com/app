#!/usr/bin/env bun
import { MemrokMCPServer } from "./server"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env") })

// Parse command line arguments for context
const args = process.argv.slice(2)
let assistantId: string | undefined
let userId: string | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--assistant-id" && i + 1 < args.length) {
    assistantId = args[i + 1]
    i++
  } else if (args[i] === "--user-id" && i + 1 < args.length) {
    userId = args[i + 1]
    i++
  }
}

// Only start the server if this file is being run directly (not imported)
// Use a more compatible check for direct execution
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('stdio-server')) {
  const server = new MemrokMCPServer()
  server.setContext(assistantId, undefined, userId)
  server.start().catch(console.error)
}
