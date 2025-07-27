import { join } from "path"
import type { User } from "#auth-utils"

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = await requireUser(event)

  // Get assistant ID from query params
  const { assistantId } = getQuery(event)

  // Get the server URL from environment or config
  const serverUrl = process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const isProduction = process.env.NODE_ENV === "production"

  // Generate configuration based on client type
  const clientType = getQuery(event).client || "claude"

  switch (clientType) {
    case "claude":
      // Claude Desktop configuration
      return {
        mcpServers: {
          memrok: {
            command: isProduction ? "npx" : "bun",
            args: isProduction
              ? ["@memrok/mcp-server", "--user-id", user.sub]
              : [
                  join(process.cwd(), "server/api/mcp/stdio-server.ts"),
                  "--user-id",
                  user.sub,
                ],
            env: {
              DATABASE_URL: process.env.DATABASE_URL,
              MEMROK_API_URL: serverUrl,
            },
          },
        },
      }

    case "http":
      // HTTP-based configuration for custom clients
      return {
        endpoint: `${serverUrl}/api/mcp`,
        headers: {
          Authorization: `Bearer ${getCookie(event, "auth.token")}`,
          "X-Assistant-ID": assistantId || "",
        },
        methods: {
          listTools: {
            method: "tools/list",
          },
          callTool: {
            method: "tools/call",
          },
        },
      }

    default:
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported client type: ${clientType}`,
      })
  }
})
