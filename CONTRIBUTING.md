# Contributing to memrok

Thanks for your interest in contributing! memrok is a community-driven project, and we welcome contributions of all kinds - from bug reports and documentation improvements to new features and code reviews.

## Setup

**Prerequisites:**
- [Node.js LTS](https://nodejs.org/) 
- [Bun](https://bun.sh/) runtime
- [Docker](https://docs.docker.com/get-docker/)

```bash
git clone --recursive https://github.com/memrok-com/app.git
cd app
bun install
cp .env.example .env
# Override environment variables in `.env` as required
```

### Development Setup

Choose your development environment:

#### Full Stack (Traefik + Authelia + memrok)

Complete development environment with included Traefik:

```bash
# Edit .env with domains and secrets (uses *.dev.memrok.com by default)

# Start full stack (creates network, starts Traefik + Authelia + memrok)
bun run dev

# Available endpoints:
# http://app.dev.memrok.com - memrok app
# http://auth.dev.memrok.com - Authelia auth portal  
# http://proxy.dev.memrok.com - Traefik dashboard
```

#### Minimal Stack (BYORP - Bring Your Own Reverse Proxy)

Use your existing reverse proxy with Authelia:

```bash
# Edit .env with your domains and network settings

# Start minimal stack (starts Authelia + memrok)
bun run dev:mini

# Available endpoints:
# http://localhost:3000 - memrok app (direct)
# http://localhost:9091 - Authelia (direct)

# Configure your reverse proxy to route:
# - ${MEMROK_APP_DOMAIN} → host.docker.internal:3000
# - ${MEMROK_AUTH_DOMAIN} → host.docker.internal:9091
```


### Development Commands

```bash
# Install dependencies
bun install

# Full development stack (Traefik + Authelia + memrok)
bun run dev

# Minimal development stack (Authelia + memrok)
bun run dev:mini

# Build for production
bun run build

# Preview production build
bun run preview

# Generate static site
bun run generate

# Run tests (when implemented)
bun test
```

## Tech Stack

**Backend**
- **Runtime**: Bun
- **Framework**: Nitro (universal server framework)
- **Database**: PostgreSQL + Qdrant (vector)
- **Authentication**: JWT

**Frontend**
- **Framework**: Nuxt 3
- **UI**: Nuxt UI Pro
- **State**: Pinia
- **Testing**: Vitest

**Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Compatible with nginx, Traefik, Caddy

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
- Follow Nuxt 3 and Vue 3 conventions
- Use Nuxt UI Pro components where possible
- Keep translations in `i18n/i18n.config.ts`

## Issues

- Use issue templates when available
- Provide reproduction steps for bugs
- Search existing issues before creating new ones