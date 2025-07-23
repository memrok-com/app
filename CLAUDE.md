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

### Tech Stack
- **Frontend**: Nuxt 4, Vue 3, Nuxt UI Pro 3 (incl. Tailwind CSS 4)
- **Backend**: Nitro server, Bun runtime
- **Database**: PostgreSQL with Drizzle ORM, Qdrant vector DB (planned)
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

**Service Organization:**
- `/deployment/` - Docker Compose configurations
- `/deployment/traefik/` - Reverse proxy configs
- `/deployment/zitadel/` - Zitadel secrets and configurations
- `/deployment/postgres/` - Database initialization scripts
- `/deployment/memrok/` - App-specific deployment files
- `/deployment/scripts/` - Utility scripts (cert generation, etc.)

## Development Commands
See [CONTRIBUTING.md](/CONTRIBUTING.md)

## SSL Certificate Trust in Development
The dev server automatically trusts mkcert certificates by setting NODE_EXTRA_CA_CERTS to the mkcert root CA. This ensures secure communication with Zitadel during development.

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
- Basic UI structure with navigation
- Page routing setup
- Branding and visual design
- Full authentication integration
- Database schema with Drizzle ORM
- Knowledge graph structure (entities, relations, observations)
- Multi-user and assistant support in schema
- PostgreSQL container configuration with automated setup
- Database migration system with Drizzle Kit

Not yet implemented:
- MCP server functionality
- Memory storage and retrieval APIs
- Vector embeddings and Qdrant integration
- Full Docker deployment for app container

## Key Files to Know

- `nuxt.config.ts`: Framework configuration
- `app/app.config.ts`: UI theme and runtime config
- `server/tsconfig.json`: Server-specific TypeScript config
- `app/assets/css/main.css`: Global styles and font imports
- `drizzle.config.ts`: Database ORM configuration
- `server/utils/db.ts`: Database connection utility
- `server/database/schema/`: Database schema definitions

## UI Conventions

- Primary color: Indigo
- Neutral color: Stone
- Font families: DM Serif Display (headings), DM Sans (body), DM Mono (code)
- Icons: Phosphor Icons via @iconify-json/ph
- UI components: Nuxt UI Pro library

## Development Infrastructure

### Docker Services
- **Traefik**: Reverse proxy with SSL termination
- **Zitadel**: Authentication service (OIDC/OAuth2)
- **PostgreSQL**: Primary database (shared by memrok and Zitadel)
- **memrok**: Main application (when containerized)

### SSL & Domains
- Development: `*.dev.memrok.com` with mkcert certificates (no hosts file needed - public DNS resolves to 127.0.0.1)
- Production: Let's Encrypt via Traefik 

### Configuration Files
- `deployment/docker-compose.yml`: Production-ready base configuration
- `deployment/docker-compose.dev.yml`: Development overrides only
- `deployment/docker-compose.prod.yml`: Small production override (memrok app only)

## Future Implementation Notes

When implementing core features:
1. MCP server should be in `/server/api/mcp/`
2. Memory storage logic should handle entities, relations, and observations as separate concepts (schema already defined)
3. Vector embeddings for semantic search should integrate with Qdrant
4. Authentication uses Zitadel OIDC with nuxt-oidc-auth module
5. Docker setup includes PostgreSQL (implemented), needs Qdrant and app container
6. Tests should be added using Vitest when implemented
7. Database migrations use Drizzle Kit (`bun run db:generate` and `bun run db:migrate`)
8. Database schema tracks creator (user or assistant) for all records