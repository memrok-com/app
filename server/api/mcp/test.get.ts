export default defineEventHandler(async (event) => {
  // This endpoint helps test the MCP server functionality
  const user = await requireUser(event)

  return {
    status: "ok",
    message: "MCP server is available",
    user: user.sub,
    endpoints: {
      http: "/api/mcp (POST)",
      config: "/api/mcp/config (GET)",
      stdio: "bun run server/api/mcp/stdio-server.ts",
    },
    tools: [
      "create_entity",
      "create_relation",
      "create_observation",
      "search_memories",
      "get_entity_relations",
    ],
  }
})
