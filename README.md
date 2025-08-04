![memrok logo](app/assets/logo/2025-memrok-logo.svg)

# memrok

A truly self-hosted, privacy-first memory service that enables persistent context across AI assistants and conversations. Share your memories between Claude, Cursor, VS Code, and any MCP-compatible client - all while keeping your data on your own infrastructure.

## 🎯 What is memrok?

memrok is a self-hosted memory system that:

- **Stores memories locally** - All data stays on your infrastructure
- **Cross-assistant memory** - Share context between different AI clients
- **Persistent conversations** - Memories survive across sessions
- **Category-based access** - Control which assistants see which memories
- **Just works** - One Docker Compose command to get started

## ✨ Key Features

### 🧠 Memory Management

- **Knowledge Graph Structure** - Entities, relations, and observations like the official MCP memory server
- **Emotional Context** - Track emotional state when memories are created (happy, sad, frustrated, excited)
- **Smart Memory Creation** - AI assistants decide what to memorize and structure it appropriately
- **Category-based Access** - Control which assistants see which memory categories
- **Semantic Search** - Find memories by meaning, not just keywords
- **Automatic Deduplication** - Prevent duplicate memories across sessions

### 🔌 Integrations

- **MCP Server** - Standard Model Context Protocol implementation
- **Web Interface** - Modern UI for memory management
- **REST API** - Programmatic access

### 🚀 Production Features

- Production-ready Docker images with multi-platform support
- Built-in health checks and monitoring endpoints
- Modern OIDC authentication via Zitadel
- Row-level security for multi-tenant data isolation
- Comprehensive MCP protocol implementation
- GitOps-friendly deployment configuration

## 🏗️ Architecture

```
┌─────────────────┐   ┌─────────────────┐
│ AI Clients like │   │ Web Browser     │
│ Claude, Cursor, │   │                 │
│ VS Code, etc.   │   │                 │
└────────┬────────┘   └────────┬────────┘
         │                     │
         │ (MCP Protocol)      │ (HTTPS via Reverse Proxy)
         │                     │
┌────────▼─────────────────────▼────────┐
│              memrok Core              │
│   ┌─────────────┐   ┌─────────────┐   │
│   │ MCP Server  │   │ Web API     │   │
│   │ (stdio)     │   │ (REST/HTTP) │   │
│   └─────────────┘   └─────────────┘   │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│             Storage Layer             │
│ ┌──────────┐   ┌──────────────────┐   │
│ │ Qdrant   │   │ PostgreSQL       │   │
│ │ (Vector) │   │ (Graph/Metadata) │   │
│ └──────────┘   └──────────────────┘   │
└───────────────────────────────────────┘
```

### Memory Structure (Based on MCP Memory Server)

**Entities**: People, places, concepts, projects, etc.

```json
{
  "name": "project_alpha",
  "entityType": "project",
  "observations": [
    "deadline is March 2025",
    "budget is $50k",
    "client seems stressed about timeline"
  ]
}
```

**Relations**: Connections between entities

```json
{
  "from": "john_smith",
  "to": "project_alpha",
  "relationType": "works_on"
}
```

**Observations**: Facts with emotional context

```json
{
  "entityName": "john_smith",
  "content": "prefers morning meetings",
  "emotionalContext": "neutral",
  "category": "work"
}
```

## 🔒 Security & Privacy

### Data Flow Transparency

memrok is designed with complete transparency about data flow:

1. **Data Storage**: All memories stored locally on your infrastructure
2. **Data Processing**: Embedding generation and search happen locally
3. **Memory Structure**: Knowledge graph with entities, relations, and emotional observations
4. **Category-based Sharing**: Control which AI assistants can access which memory categories
5. **No External Dependencies**: Core functionality works entirely offline

Example: Configure LM Studio to access all categories, but Claude Desktop only "work" and "general" categories.

### Security Features

- Modern OIDC authentication via Zitadel
- Category-based access control for different AI clients
- Emotional context tracking for sensitive memories
- Audit logs for all memory access and modifications
- Self-hosted authentication (no external auth dependencies)

## 📋 MVP Roadmap

### Core Features

- [ ] Knowledge graph memory structure (entities, relations, observations)
- [ ] Emotional context tracking in observations
- [ ] MCP server with memory tools (create_entities, add_observations, search_memories)
- [ ] Web interface for memory management and visualization
- [ ] Category-based access control
- [ ] Semantic search with Qdrant
- [ ] Docker deployment with reverse proxy support
- [ ] Client configuration generator

### Memory Tools (MCP)

- `create_entities` - Create people, places, concepts
- `create_relations` - Connect entities with relationships
- `add_observations` - Store facts with emotional context
- `search_memories` - Semantic search across knowledge graph
- `open_memories` - Retrieve specific entity clusters

## 🔧 Development

### Prerequisites

- Node.js 20+ or Bun
- Docker and Docker Compose
- mkcert (for local SSL certificates)

### Local Development Setup

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development setup instructions.

### Building Docker Images

For development, you can build the Docker image locally:

```bash
docker build \
  --build-arg MEMROK_VERSION=dev \
  --build-arg MEMROK_BUILD_YEAR=$(date +%Y) \
  --build-arg NUXT_UI_PRO_LICENSE=$NUXT_UI_PRO_LICENSE \
  -t memrok/app:dev .
```

## 🔄 CI/CD (For Maintainers)

### Release Process

1. Ensure all changes are merged to main
2. Create and push a release tag:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. GitHub Actions automatically:
   - Builds multi-platform Docker images
   - Pushes to GitHub Container Registry
   - Signs images with cosign
   - Scans for vulnerabilities
   - Updates release notes

### GitHub Actions Workflows

- **docker-build.yml**: Production builds on release tags
- **docker-test.yml**: PR validation for Docker changes
- **security-scan.yml**: Continuous vulnerability scanning

See [.github/workflows/README.md](.github/workflows/README.md) for workflow documentation.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.
