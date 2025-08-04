# Contributing to memrok

Thanks for your interest in contributing! memrok is a community-driven project, and we welcome contributions of all kinds - from bug reports and documentation improvements to new features and code reviews.

## Setup

**Prerequisites:**

- [Node.js LTS](https://nodejs.org/)
- [Bun](https://bun.sh/) runtime
- [Docker](https://docs.docker.com/get-docker/)
- [mkcert](https://mkcert.dev) for trusted SSL certificates
- **SMTP service** (e.g., Mailgun, Gmail, SendGrid) for email notifications

### Quick Start

```bash
git clone --recursive https://github.com/memrok-com/app.git
cd app
bun install
cp .env.example .env
# Configure your .env file (see detailed instructions in .env.example)
bun run setup  # Automated setup: generates certs, starts infrastructure, sets up database, provisions auth
bun run dev    # Start development server
```

### Windows Docker Desktop Known Issue

**Issue**: Docker Desktop on Windows doesn't properly respect PostgreSQL health check timing during initial setup, causing `bun run setup` to fail on the first run.

**Workaround**: Run the setup command twice:

```bash
bun run setup  # May fail during infra:start step due to timing issue
bun run setup  # Should succeed on second run (PostgreSQL volume exists)
```

**Access URLs:**

- https://app.dev.memrok.com - memrok app
- https://auth.dev.memrok.com - Zitadel authentication
- https://proxy.dev.memrok.com - Traefik dashboard
- db.dev.memrok.com:5432 - PostgreSQL database (maps to localhost:5432)

**Key Features:**

- Docker Compose with Traefik + Zitadel + PostgreSQL
- Trusted SSL certificates via mkcert (no browser warnings)
- Public DNS: `*.dev.memrok.com` → `127.0.0.1` (no hosts file needed)
- Automated Zitadel provisioning with OIDC configuration
- PKCE authentication flow (no client secrets)
- Shared PostgreSQL instance for memrok and Zitadel
- Drizzle ORM for type-safe database access

### Development Commands

```bash
# Quick commands
bun run setup                  # Full automated setup: certs + infrastructure + database + auth (recommended)
bun run dev                    # Start development server

# Infrastructure management
bun run infra:start            # Start Traefik + Zitadel + PostgreSQL
bun run infra:stop             # Stop infrastructure
bun run infra:logs             # View logs
bun run infra:provision        # Re-run auth provisioning

# Database management
bun run db:generate            # Generate migrations from schema changes
bun run db:migrate             # Apply migrations to database
bun run db:push                # Push schema directly (dev only)
bun run db:studio              # Open Drizzle Studio GUI

# MCP server (for AI assistant integration)
bun run test:mcp               # Run comprehensive MCP server test suite

# MCP Client Configuration:
# memrok uses mcp-remote proxy to connect AI assistants to the HTTP MCP endpoint
# The configuration is auto-generated in the Apps page when logged in
# No local stdio server or npm packages needed - works remotely!

# Production builds
bun run build                  # Build for production
bun run preview                # Preview production build
```

### Docker Container Testing

Test the production Docker image locally within the development stack:

```bash
# Build the Docker image locally
bun run build:image            # Build memrok/app:local from current code

# Test the container (integrates with existing dev stack)
bun run test:image             # Build image and start test container
bun run test:start             # Start test container (requires pre-built image)
bun run test:stop              # Stop and remove test container
bun run test:logs              # View test container logs
bun run test:status            # Check test container status
```

**Access URLs:**
- https://app-test.dev.memrok.com - Test container (Docker image)
- https://app.dev.memrok.com - Development server (local Nuxt)

The test container integrates with your existing development infrastructure (shares Traefik, PostgreSQL, Zitadel) but runs on a separate domain to avoid conflicts. This allows you to:

- Test the actual Docker image that will be deployed to production
- Compare behavior between the development server and containerized app
- Validate Docker builds before creating releases
- Debug container-specific issues in a familiar environment

**Environment Variables:**
- `MEMROK_APP_TEST_DOMAIN`: Test container domain (defaults to app-test.dev.memrok.com)
- `MEMROK_BUILD_YEAR`: Build year for container metadata (defaults to current year)

## Tech Stack

**Backend**

- **Runtime**: Bun
- **Framework**: Nitro (universal server framework)
- **Database**: PostgreSQL with Drizzle ORM + Qdrant (vector, planned)
- **Authentication**: Zitadel (OIDC)
- **MCP Server**: Complete HTTP implementation with 5 memory tools (@modelcontextprotocol/sdk)
- **MCP Client Access**: Via mcp-remote proxy - works with any MCP client from anywhere

**Frontend**

- **Framework**: Nuxt
- **State Management**: Pinia (Setup Store pattern)
- **UI**: Nuxt UI Pro
- **Testing**: Vitest

**Infrastructure**

- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Traefik (development), compatible with nginx, Caddy
- **Database**: PostgreSQL 17 (shared instance)

## Development

- **Branch**: Create feature branches from `main`
- **Commits**: Use descriptive messages, follow existing style
- **Code**: Follow existing patterns, use TypeScript
- **Tests**: Add tests for new features (when testing is implemented)

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit PR to `main` branch

## Code Style

- Use existing component patterns
- Follow Nuxt and Vue conventions
- Use Nuxt UI Pro components where possible
- Keep translations in `i18n/i18n.config.ts`

## Issues

- Use issue templates when available
- Provide reproduction steps for bugs
- Search existing issues before creating new ones
