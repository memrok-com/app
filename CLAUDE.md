# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

memrok is a self-hosted, privacy-first memory service for AI assistants. It implements the Model Context Protocol (MCP) to provide persistent context across different AI tools while keeping all data on user infrastructure.

## Architecture

### Core Concepts
- **Knowledge Graph Structure**: Memories are stored as entities, relations, and observations
- **Privacy-First**: All data stored locally, no external dependencies
- **MCP Protocol**: Standardized interface for AI assistant integration
- **Multi-Assistant Support**: Works with Claude, Cursor, VS Code, and other MCP-compatible tools
- **Row Level Security**: PostgreSQL RLS policies ensure user data isolation

### Tech Stack
- **Frontend**: Nuxt 4, Vue 3, Nuxt UI Pro 3 (incl. Tailwind CSS 4)
- **Backend**: Nitro server, Bun runtime
- **Database**: PostgreSQL with Drizzle ORM, Row Level Security (RLS)
- **Authentication**: Zitadel (OIDC)
- **Deployment**: Docker + Docker Compose

### Deployment Architecture

**Repository Structure:**
- `memrok-com/app` - Full development environment (this repo)
- `memrok-com/memrok` - Production deployment repo (submodule at `./deployment`)

**Development Setup:**
- Dev configs in app root (CONTRIBUTING.md, package.json scripts)
- Deployment configs in `./deployment` submodule
- Infrastructure: Traefik + Zitadel + PostgreSQL containers + local Nuxt dev server
- SSL: mkcert for trusted certificates (no browser warnings)
- Domains: `*.dev.memrok.com` (public DNS → 127.0.0.1)
- Database: PostgreSQL on port 5432 (configurable via POSTGRES_HOST_PORT)

**Production Setup:**
- All configs in deployment submodule
- Infrastructure: Traefik + Zitadel + PostgreSQL + memrok app containers  
- SSL: Let's Encrypt via Traefik
- Production-ready base configuration with development overrides

## Development Commands
See [CONTRIBUTING.md](/CONTRIBUTING.md)

## Project Structure

Nuxt 4 uses an organized directory structure with application code in the `/app/` directory:

**Application Code (in `/app/` directory):**
- `/app/pages/`: File-based routing - memories.vue, assistants.vue, settings.vue
- `/app/components/`: Reusable Vue components
- `/app/layouts/`: Page layouts with navigation
- `/app/assets/`: CSS and static assets
- `/app/plugins/`: Client-side plugins
- `/app/middleware/`: Route middleware
- `/app/utils/`: Utility functions
- `/app/i18n/`: Internationalization configuration
- `/app/app.vue`: Root application component
- `/app/app.config.ts`: Application configuration

**Project Root:**
- `/server/`: Nitro server code (API endpoints, MCP implementation)
- `/server/database/`: Database schema and utilities
- `/public/`: Static files
- `/deployment/`: Docker deployment configuration (submodule)
- `nuxt.config.ts`: Nuxt framework configuration
- `drizzle.config.ts`: Database ORM configuration

## Implementation Status

Currently implemented:
- ✅ Basic UI structure with navigation
- ✅ Page routing setup
- ✅ Branding and visual design
- ✅ Full authentication integration
- ✅ Database schema with Drizzle ORM
- ✅ Knowledge graph structure (entities, relations, observations)
- ✅ Multi-user and assistant support in schema
- ✅ PostgreSQL container configuration with automated setup
- ✅ Database migration system with Drizzle Kit
- ✅ **Complete MCP server implementation** with 5 memory tools
- ✅ **Memory storage and retrieval APIs** (entities, relations, observations, assistants)
- ✅ **MCP connectivity** via stdio (Claude Desktop) and HTTP endpoints
- ✅ **Row Level Security (RLS)** implementation with user data isolation
- ✅ **RLS-aware API endpoints** - all endpoints use user context, no manual filtering

Not yet implemented:
- Web UI for memory management
- Vector embeddings and Qdrant integration
- Full Docker deployment for app container

## Key Files to Know

**Core Configuration:**
- `nuxt.config.ts`: Framework configuration
- `app/app.config.ts`: UI theme and runtime config
- `server/tsconfig.json`: Server-specific TypeScript config
- `drizzle.config.ts`: Database ORM configuration

**Database & RLS:**
- `server/utils/db.ts`: Database connection utility
- `server/database/schema/`: Database schema definitions with RLS policies
- `server/database/rls-context.ts`: RLS user context management
- `server/database/user-scoped-db.ts`: User-scoped database operations
- `server/utils/auth-middleware.ts`: Authentication middleware for API routes

**MCP Implementation:**
- `server/api/mcp/server.ts`: Core MCP server with 5 memory tools
- `server/api/mcp/stdio-server.ts`: Standalone MCP server executable
- `server/api/mcp/config.get.ts`: Auto-generates MCP client configurations
- `test/mcp-server.test.ts`: MCP server test suite

**API Endpoints:**
- `server/api/entities/`: Entity management endpoints (RLS-aware)
- `server/api/relations/`: Relation management endpoints (RLS-aware)
- `server/api/observations/`: Observation management endpoints (RLS-aware)
- `server/api/assistants/`: Assistant management endpoints (RLS-aware)

## UI Conventions

- Primary color: Indigo
- Neutral color: Stone
- Font families: DM Serif Display (headings), DM Sans (body), DM Mono (code)
- Icons: Phosphor Icons via @iconify-json/ph
- UI components: Nuxt UI Pro library

## Row Level Security (RLS) Implementation

**Status:** ✅ Complete and production-ready

**Architecture:**
- **User Context Management**: `rls-context.ts` handles PostgreSQL `app.current_user_id` setting
- **Scoped Operations**: `user-scoped-db.ts` provides user-isolated database operations
- **Authentication**: `auth-middleware.ts` extracts user context and provides RLS-aware database instances
- **Database Policies**: All tables have RLS policies that check `user_id` against current user context

**Usage Pattern:**
```typescript
// API endpoints use authenticated handlers
export default createAuthenticatedHandler(async (event, userDb, user) => {
  // userDb automatically filters by current user via RLS
  const entities = await userDb.getEntities()
})
```

**Security:** Users can only access their own data - RLS policies enforce isolation at the database level.

## MCP Server Implementation

**Status:** ✅ Complete and production-ready

**Architecture:**
- **Core Server** (`server/api/mcp/server.ts`): Uses `@modelcontextprotocol/sdk` with 5 memory tools
- **Stdio Endpoint** (`server/api/mcp/stdio-server.ts`): For Claude Desktop and direct AI assistant connections
- **HTTP Endpoint** (`server/api/mcp/index.post.ts`): For web-based integrations with session management
- **Configuration** (`server/api/mcp/config.get.ts`): Auto-generates client configurations

**Available Tools:**
1. `create_entity` - Create knowledge graph entities (person, place, concept, etc.)
2. `create_relation` - Link entities with typed relationships  
3. `create_observation` - Record facts/observations about entities with metadata
4. `search_memories` - Search through stored memories by query
5. `get_entity_relations` - Retrieve entity relationships

**Usage:**
- Run MCP server: `bun run mcp:server`
- Test functionality: `bun run test:mcp`
- Get client configs: `/api/mcp/config` endpoint (integrated into web UI)

## GitOps Workflow

- We use GitOps with feature branches and pull requests
- When committing changes that involve the deployment submodule:
  1. First commit changes in the deployment submodule
  2. Then commit in the parent repository to include the reference to the current submodule state

## Using Advisory Agents

This project uses specialized advisory agents to provide expert guidance while you (Claude) remain the primary implementer:

- **security-auditor**: Security guidance and vulnerability analysis
- **database-architect**: Database design and optimization advice  
- **api-architect**: REST API design patterns and best practices
- **frontend-architect**: Vue/Nuxt patterns and component guidance
- **deployment-architect**: Infrastructure and deployment strategies
- **mcp-specialist**: Model Context Protocol expertise
- **test-architect**: Testing strategy and test design guidance

**Usage:** Consult agents for expert advice, then implement solutions with user oversight and visibility.

## Future Implementation Notes

When implementing remaining features:
1. ✅ ~~MCP server~~ - **Complete**
2. ✅ ~~Memory storage APIs~~ - **Complete**
3. ✅ ~~Row Level Security~~ - **Complete**
4. Vector embeddings for semantic search should integrate with Qdrant
5. Authentication uses Zitadel OIDC with nuxt-oidc-auth module
6. Docker setup includes PostgreSQL (implemented), needs Qdrant and app container
7. Tests should be added using Vitest when implemented
8. Database migrations use Drizzle Kit (`bun run db:generate` and `bun run db:migrate`)
9. Database schema tracks creator (user or assistant) for all records

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.