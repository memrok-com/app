export default defineEventHandler(async (event) => {
  // This endpoint helps test the MCP server functionality
  const user = await extractUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required"
    })
  }

  return {
    status: "ok",
    message: "MCP server is available",
    user: user.id,
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
      "batch_create_entities",
      "forget_memory",
      "get_entity_details",
    ],
  }
})
