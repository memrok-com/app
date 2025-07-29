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

- **Frontend**: Nuxt 4, Vue 3, Nuxt UI Pro 3 (incl. Tailwind CSS 4), Pinia (state management)
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
- `/app/stores/`: Pinia state management stores
- `/app/types/`: TypeScript type definitions for API responses
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
- ✅ Multi-user support with string-based assistant attribution
- ✅ PostgreSQL container configuration with automated setup
- ✅ Database migration system with Drizzle Kit
- ✅ **Complete MCP server implementation** with 5 memory tools
- ✅ **Memory storage and retrieval APIs** (entities, relations, observations)
- ✅ **MCP connectivity** via stdio (Claude Desktop) and HTTP endpoints
- ✅ **Row Level Security (RLS)** implementation with user data isolation
- ✅ **RLS-aware API endpoints** - all endpoints use user context, no manual filtering
- ✅ **Complete Web UI** for memory management with reactive state management
- ✅ **Unified Memory Store** - Single Pinia store manages all entities, observations, and relations
- ✅ **Business Rule Validation** - Components self-govern creation permissions via stores
- ✅ **String-based Assistant Attribution** - Simplified assistant tracking without FK constraints

Not yet implemented:

- **Assistant Auto-Detection** - Automatic client identification in MCP server
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

**State Management (Pinia):**

- `app/stores/memory.ts`: Unified store for all entities, observations, and relations
- `app/types/`: TypeScript interfaces for API responses and store data

## UI Conventions

- Primary color: Indigo
- Neutral color: Stone
- Font families: DM Serif Display (headings), DM Sans (body), DM Mono (code)
- Icons: Phosphor Icons via @iconify-json/ph
- UI components: Nuxt UI Pro library
- Component naming: Use lowercase only (e.g., `table.vue`, not `Table.vue`)
- Internationalization: Keep translation messages with `const { t } = useI18n({ useScope: "local" })` in the component that uses them (SFC, Single File Component)

## Key Implementation Status

**✅ Complete Systems:**
- **RLS (Row Level Security)**: Multi-tenant data isolation via PostgreSQL policies (`rls-context.ts`, `auth-middleware.ts`)
- **Assistant Attribution**: String-based tracking without FK constraints (supports claude, cursor, vscode, etc.)
- **MCP Server**: 5 memory tools with stdio/HTTP transports (`server/api/mcp/`)
- **Memory Store**: Unified Pinia store with business rule validation (`app/stores/memory.ts`)

## GitOps Workflow

- We use GitOps with feature branches and pull requests
- When committing changes that involve the deployment submodule:
  1. First commit changes in the deployment submodule
  2. Then commit in the parent repository to include the reference to the current submodule state

## Using Advisory Agents

This project uses specialized advisory agents to provide expert guidance while you (Claude) remain the primary implementer. **You MUST proactively consult these agents BEFORE beginning implementation work.**

### Agent Consultation Matrix

| Task Type | Primary Agent | Secondary Agent | When to Consult |
|-----------|---------------|-----------------|-----------------|
| **API Endpoints** | api-architect | security-auditor | Before implementing any new endpoints, modifying existing routes, or adding server-side functionality |
| **Vue Components** | frontend-architect | test-architect | Before creating components, modifying Pinia stores, or changing UI patterns |
| **Database Changes** | database-architect | security-auditor | Before schema changes, adding tables/columns, or writing complex queries |
| **Security Features** | security-auditor | api-architect | Before implementing authentication, data access, or privacy-sensitive features |
| **MCP Tools** | mcp-specialist | security-auditor | Before adding MCP tools, modifying server configs, or changing AI assistant integrations |
| **Infrastructure** | deployment-architect | security-auditor | Before Docker changes, adding containers, or modifying deployment configs |
| **Testing Strategy** | test-architect | All relevant agents | Before implementing features, when adding test coverage, or setting up testing infrastructure |

### Mandatory Consultation Triggers

**ALWAYS consult agents before:**

1. **New Feature Implementation** → Consult relevant agent(s) based on feature type
2. **Security-Sensitive Work** → security-auditor + domain-specific agent
3. **Infrastructure Changes** → deployment-architect + security-auditor  
4. **Database Modifications** → database-architect + security-auditor
5. **API Development** → api-architect + security-auditor
6. **UI/UX Development** → frontend-architect + test-architect
7. **MCP Integration** → mcp-specialist + security-auditor

### Agent Expertise Summary

- **security-auditor**: RLS, authentication, data protection, GDPR compliance, container security
- **database-architect**: Knowledge graph schema, RLS policies, Drizzle ORM, query optimization
- **api-architect**: REST patterns, memrok endpoints, RLS integration, assistant attribution
- **frontend-architect**: Vue 3/Nuxt 4, Pinia stores, Nuxt UI Pro, component architecture
- **deployment-architect**: GitOps workflow, Docker/submodule setup, Traefik configuration
- **mcp-specialist**: memrok's 5 MCP tools, protocol compliance, client integration
- **test-architect**: MCP testing, RLS validation, Vue component testing, integration strategies

**Usage:** Consult agents for expert advice BEFORE implementation, then implement solutions with user oversight and visibility.

## Development Workflow

**Mandatory Process:**
1. **Assess** → Use Agent Consultation Matrix to identify required agents
2. **Consult** → Use Task tool with primary + secondary agents before coding
3. **Implement** → Follow agent recommendations and memrok patterns
4. **Validate** → Run `bun run lint`, `bun run typecheck`, `bun run test:mcp`

**Quality Gates:** All required agents consulted → Recommendations incorporated → Validation passes

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
9. Database schema tracks creator (user or assistant) using string-based attribution

# Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
**MANDATORY:** ALWAYS consult appropriate sub-agents BEFORE beginning any implementation work - use the Agent Consultation Matrix above.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Agent Usage Checklist

Before starting any implementation:

1. ✅ Identify task type from Agent Consultation Matrix
2. ✅ Consult primary agent for architectural guidance
3. ✅ Consult secondary agent if specified
4. ✅ Review agent recommendations and integrate feedback
5. ✅ Proceed with implementation incorporating agent guidance
