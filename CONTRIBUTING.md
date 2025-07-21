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
bun run setup  # Automated setup: generates certs, starts infrastructure, provisions auth
bun run dev    # Start development server
```

**Access URLs:**
- https://app.dev.memrok.com - memrok app
- https://auth.dev.memrok.com - Zitadel authentication  
- https://proxy.dev.memrok.com - Traefik dashboard

**Key Features:**
- Docker Compose with Traefik + Zitadel
- Trusted SSL certificates via mkcert (no browser warnings)
- Public DNS: `*.dev.memrok.com` → `127.0.0.1` (no hosts file needed)
- Automated Zitadel provisioning with OIDC configuration
- PKCE authentication flow (no client secrets)


### Development Commands

```bash
# Quick commands
bun run setup                  # Full automated setup (recommended)
bun run dev                    # Start development server

# Infrastructure management  
bun run infra:start            # Start Traefik + Zitadel
bun run infra:stop             # Stop infrastructure
bun run infra:logs             # View logs
bun run infra:provision        # Re-run auth provisioning

# Production builds
bun run build                  # Build for production
bun run preview                # Preview production build
```

## Tech Stack

**Backend**
- **Runtime**: Bun
- **Framework**: Nitro (universal server framework)
- **Database**: PostgreSQL + Qdrant (vector)
- **Authentication**: Zitadel (OIDC)

**Frontend**
- **Framework**: Nuxt
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
- Follow Nuxt and Vue conventions
- Use Nuxt UI Pro components where possible
- Keep translations in `i18n/i18n.config.ts`

## Issues

- Use issue templates when available
- Provide reproduction steps for bugs
- Search existing issues before creating new ones