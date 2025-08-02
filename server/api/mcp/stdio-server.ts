#!/usr/bin/env bun
// CRITICAL: Load environment variables FIRST, before any other imports
import { config } from "dotenv"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { MemrokMCPServer } from "./server"

// Suppress all console output to stdout to ensure clean MCP protocol communication
console.log = (...args: unknown[]) => console.error(...args)

// Load environment variables from the project root
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../..')
const envPath = resolve(projectRoot, '.env')
config({ path: envPath, quiet: true })

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

// Start the server
const server = new MemrokMCPServer()
server.setContext(assistantId, undefined, userId)
server.start().catch(console.error)
