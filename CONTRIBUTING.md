# Contributing to memrok

Thanks for your interest in contributing! memrok is a community-driven project, and we welcome contributions of all kinds - from bug reports and documentation improvements to new features and code reviews.

## Setup

**Prerequisites:**
- [Node.js LTS](https://nodejs.org/) 
- [Bun](https://bun.sh/) runtime
- [Docker](https://docs.docker.com/get-docker/)
- [mkcert](https://mkcert.dev) for trusted SSL certificates
- **SMTP service** (e.g., Mailgun, Gmail, SendGrid) for email notifications

```bash
git clone --recursive https://github.com/memrok-com/app.git
cd app
bun install
cp .env.example .env
# Override environment variables in `.env` as required
```

### Development Setup

The development environment uses Traefik and Zitadel with trusted SSL certificates via mkcert.

**Quick Start:**
```bash
# Full automated setup (recommended)
bun run setup
# This will:
# 1. Generate SSL certificates
# 2. Start infrastructure (Traefik + Zitadel) 
# 3. Provision Zitadel project and application
# 4. Output OIDC configuration for your .env

# Then start development server
bun run dev
```

**Access URLs:**
- https://app.dev.memrok.com - memrok app (proxied to local Nuxt dev server)
- https://auth.dev.memrok.com - Zitadel authentication portal  
- https://proxy.dev.memrok.com - Traefik dashboard

**Authentication Setup:**

1. **Configure Admin User** (in `.env`):
   ```bash
   ZITADEL_ADMIN_EMAIL=admin@yourdomain.com
   ZITADEL_ADMIN_PASSWORD=your-secure-password
   ```

2. **Generate OIDC Secrets** (required for Nuxt authentication):
   ```bash
   # Generate session secrets and token keys
   openssl rand -hex 32  # For NUXT_OIDC_SESSION_SECRET
   openssl rand -hex 32  # For NUXT_OIDC_AUTH_SESSION_SECRET  
   openssl rand -hex 24  # For NUXT_OIDC_TOKEN_KEY
   ```
   Add these to your `.env` file.

3. **Configure SMTP** (optional but recommended for email notifications):
   ```bash
   # Example for Mailgun
   ZITADEL_SMTP_HOST=smtp.eu.mailgun.org:587
   ZITADEL_SMTP_USER=postmaster@your-domain.mailgun.org
   ZITADEL_SMTP_PASSWORD=your-mailgun-password
   ZITADEL_SMTP_FROM=auth@yourdomain.com
   ```

4. **Run Automated Provisioning**:
   The `bun run setup` command automatically:
   - Creates a service account for provisioning
   - Creates the "memrok" project in Zitadel
   - Grants the admin user access to the project
   - Creates a User Agent (SPA) application with PKCE
   - Outputs the OIDC configuration for your `.env`:
     ```
     NUXT_OIDC_CLIENT_ID="your-generated-client-id"
     NUXT_OIDC_ISSUER="https://auth.dev.memrok.com"
     NUXT_OIDC_REDIRECT_URI="https://app.dev.memrok.com/auth/callback"
     NUXT_OIDC_POST_LOGOUT_REDIRECT_URI="https://app.dev.memrok.com/"
     ```

**How it works:**
- Uses Docker Compose with Traefik + Zitadel
- Trusted SSL certificates via mkcert (no browser warnings)
- Public DNS: `*.dev.memrok.com` → `127.0.0.1` (no hosts file needed!)
- Traefik proxies to local Nuxt dev server via host.docker.internal
- Automated Zitadel provisioning creates project and application
- OIDC authentication via Zitadel using PKCE flow (no client secrets)


### Development Commands

```bash
# Install dependencies
bun install

# SSL Certificate management
bun run certs                  # Generate SSL certificates (first time only)

# Infrastructure management  
bun run infra:start            # Start infrastructure (Traefik + Zitadel)
bun run infra:stop             # Stop infrastructure
bun run infra:restart          # Restart infrastructure
bun run infra:logs             # View infrastructure logs
bun run infra:status           # Check infrastructure status

# Application development
bun run dev                    # Start Nuxt development server
bun run setup                  # Full setup (certs + infra + auth provisioning)
bun run auth                   # Run Zitadel provisioning only

# Production builds
bun run build                  # Build for production
bun run preview                # Preview production build
bun run generate               # Generate static site

# Run tests (when implemented)
bun test
```

## Tech Stack

**Backend**
- **Runtime**: Bun
- **Framework**: Nitro (universal server framework)
- **Database**: PostgreSQL + Qdrant (vector)
- **Authentication**: Zitadel (OIDC)

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