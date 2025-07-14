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
- **Frontend**: Nuxt 3, Vue 3, Nuxt UI Pro 3 (incl. Tailwind CSS 4)
- **Backend**: Nitro server, Bun runtime
- **Database**: PostgreSQL (planned), Qdrant vector DB (planned)
- **Authentication**: Zitadel (OIDC)
- **Deployment**: Docker + Docker Compose

### Deployment Architecture

**Repository Structure:**
- `memrok-com/app` - Full development environment (this repo)
- `memrok-com/memrok` - Production deployment repo (submodule at `./deployment`)

**Development Setup:**
- Dev configs in app root (CONTRIBUTING.md, package.json scripts)
- Deployment configs in `./deployment` submodule
- Infrastructure: Traefik + Zitadel containers + local Nuxt dev server
- SSL: mkcert for trusted certificates (no browser warnings)
- Domains: `*.dev.memrok.com` (public DNS → 127.0.0.1)

**Production Setup:**
- All configs in deployment submodule
- Infrastructure: Traefik + Zitadel + memrok app containers  
- SSL: Let's Encrypt via Traefik
- Production-ready base configuration with development overrides

**Service Organization:**
- `/deployment/` - Docker Compose configurations
- `/deployment/traefik/` - Reverse proxy configs  
- `/deployment/memrok/` - App-specific deployment files
- `/deployment/scripts/` - Utility scripts (cert generation, etc.)

## Development Commands

### Quick Start
```bash
# Install dependencies
bun install

# Setup development environment (first time only)
bun run setup

# Start development server
bun run dev
```

### Full Development Setup
```bash
# Generate SSL certificates (first time only)  
bun run certs

# Start infrastructure (Traefik + Zitadel)
bun run infra:start

# Start Nuxt development server
bun run dev

# Access: https://app.dev.memrok.com
# Auth: Setup required in Zitadel console at https://auth.dev.memrok.com/ui/console
```

### Infrastructure Management
```bash
# Infrastructure control
bun run infra:start    # Start containers
bun run infra:stop     # Stop containers  
bun run infra:restart  # Restart containers
bun run infra:logs     # View logs
bun run infra:status   # Check status

# Build and preview
bun run build          # Build for production
bun run preview        # Preview production build
bun run generate       # Generate static site
```

## Project Structure

Key directories and their purposes:
- `/pages/`: File-based routing - memories.vue, assistants.vue, settings.vue
- `/components/`: Reusable Vue components
- `/server/`: Nitro server code (API endpoints, MCP implementation)
- `/layouts/`: Page layouts with navigation
- `/assets/`: CSS and static assets

## Environment Setup

Create `.env` file from `.env.example`:
```bash
NUXT_UI_PRO_LICENSE=your-license-key-here
```

## Implementation Status

Currently implemented:
- Basic UI structure with navigation
- Page routing setup
- Branding and visual design

Not yet implemented:
- MCP server functionality
- Memory storage and retrieval
- Database connections
- API endpoints
- Full authentication integration (Zitadel configuration needed)
- Docker deployment

## Key Files to Know

- `nuxt.config.ts`: Framework configuration
- `app.config.ts`: UI theme and runtime config
- `server/tsconfig.json`: Server-specific TypeScript config
- `/assets/css/main.css`: Global styles and font imports

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
- **memrok**: Main application (when containerized)

### SSL & Domains
- Development: `*.dev.memrok.com` with mkcert certificates
- Production: Let's Encrypt via Traefik
- No hosts file needed - public DNS resolves to 127.0.0.1

### Configuration Files
- `deployment/docker-compose.yml`: Production-ready base configuration
- `deployment/docker-compose.dev.yml`: Development overrides only
- `deployment/docker-compose.prod.yml`: Small production override (memrok app only)

## Future Implementation Notes

When implementing core features:
1. MCP server should be in `/server/api/mcp/`
2. Memory storage logic should handle entities, relations, and observations as separate concepts
3. Vector embeddings for semantic search should integrate with Qdrant
4. Authentication uses Zitadel OIDC with nuxt-oidc-auth module
5. Docker setup should include PostgreSQL, Qdrant, and the Nuxt app
6. Tests should be added using Vitest when implemented