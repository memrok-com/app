# MCP Integration Guide

memrok implements the Model Context Protocol (MCP) to provide memory services to AI assistants. This guide explains how to connect your AI assistant to memrok.

## Available MCP Tools

memrok provides the following tools through MCP:

### `create_entity`
Create a new entity in the knowledge graph.

**Parameters:**
- `name` (string, required): Name of the entity
- `type` (string, required): Type of entity (person, place, event, concept, etc)
- `description` (string, optional): Description of the entity

**Returns:** Created entity with ID

### `create_relation`
Create a relationship between two entities.

**Parameters:**
- `fromEntityId` (string, required): ID of the source entity
- `toEntityId` (string, required): ID of the target entity
- `predicate` (string, required): The relationship type (e.g., "knows", "located_at", "part_of")

**Returns:** Created relation with ID

### `create_observation`
Record an observation or fact about an entity.

**Parameters:**
- `entityId` (string, required): ID of the entity this observation is about
- `content` (string, required): The observation or fact
- `metadata` (object, optional): Additional metadata as key-value pairs

**Returns:** Created observation with ID

### `search_memories`
Search through stored memories and entities.

**Parameters:**
- `query` (string, required): Search query to find relevant memories
- `entityTypes` (array, optional): Filter by entity types
- `limit` (number, optional): Maximum number of results (default: 20)

**Returns:** Matching entities and observations

### `get_entity_relations`
Get all relationships for a specific entity.

**Parameters:**
- `entityId` (string, required): ID of the entity to get relations for
- `direction` (string, optional): Direction of relations to retrieve ("from", "to", "both") (default: "both")

**Returns:** List of relations involving the entity

## Connection Methods

### 1. Claude Desktop

1. Get your configuration from memrok:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-memrok-instance.com/api/mcp/config?client=claude
   ```

2. Add the configuration to your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Restart Claude Desktop

### 2. HTTP API

For custom integrations, use the HTTP endpoint:

```bash
POST https://your-memrok-instance.com/api/mcp
Authorization: Bearer YOUR_TOKEN
X-Assistant-ID: your-assistant-id
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_memories",
    "arguments": {
      "query": "meetings last week"
    }
  },
  "id": "1"
}
```

### 3. Stdio Server

For local development or custom integrations:

```bash
bun run mcp:server --user-id YOUR_USER_ID --assistant-id YOUR_ASSISTANT_ID
```

## Authentication

All MCP connections require authentication:

1. **HTTP API**: Include your auth token in the Authorization header
2. **Stdio Server**: Pass user ID and optionally assistant ID as command-line arguments
3. **Claude Desktop**: The configuration includes authentication details

## Examples

### Create a memory about a person:

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_entity",
    "arguments": {
      "name": "John Doe",
      "type": "person",
      "description": "Software engineer at Acme Corp"
    }
  }
}
```

### Record an observation:

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_observation",
    "arguments": {
      "entityId": "entity-id-here",
      "content": "Prefers TypeScript over JavaScript",
      "metadata": {
        "confidence": 0.9,
        "source": "conversation"
      }
    }
  }
}
```

### Search for memories:

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_memories",
    "arguments": {
      "query": "TypeScript",
      "entityTypes": ["person", "concept"],
      "limit": 10
    }
  }
}
```

## Security Considerations

- Each user's memories are isolated - assistants can only access memories created by or for the authenticated user
- Assistant IDs help track which assistant created which memories
- All communication should use HTTPS in production
- Tokens should be kept secure and rotated regularly

## Troubleshooting

### MCP server not connecting
- Ensure you have the correct authentication token
- Check that the memrok server is running and accessible
- Verify the configuration is properly formatted

### No memories returned
- Check that you're authenticated as the correct user
- Verify that memories have been created for this user
- Try a broader search query

### Permission errors
- Ensure your token has not expired
- Verify you have the correct permissions in Zitadel
- Check that the assistant ID (if provided) is valid

## Testing

To test the MCP server functionality:

```bash
bun run test:mcp
```

This runs a comprehensive test suite that validates all MCP tools and operations.