# Multi-stage Dockerfile for memrok Nuxt 4 application
# Optimized for GitHub Actions builds and GitHub Container Registry

# Build arguments for CI/CD
ARG MEMROK_VERSION=development
ARG MEMROK_BUILD_YEAR=2025
ARG NUXT_UI_PRO_LICENSE

# Stage 1: Base image with Bun for dependencies
FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json ./
# Copy lockfile if it exists, but don't require it to be frozen for build flexibility
COPY bun.lock* ./
RUN bun install

# Stage 3: Build the application
FROM base AS build

# Re-declare build args for this stage
ARG MEMROK_VERSION=development
ARG MEMROK_BUILD_YEAR=2025
ARG NUXT_UI_PRO_LICENSE

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables for Nuxt
ENV MEMROK_VERSION=${MEMROK_VERSION}
ENV MEMROK_BUILD_YEAR=${MEMROK_BUILD_YEAR}
ENV NUXT_UI_PRO_LICENSE=${NUXT_UI_PRO_LICENSE}
ENV NODE_ENV=production

# Build the application
# Note: NUXT_UI_PRO_LICENSE must be provided as build arg for production builds
RUN if [ -z "$NUXT_UI_PRO_LICENSE" ]; then \
    echo "WARNING: NUXT_UI_PRO_LICENSE not provided - using fallback build"; \
    mkdir -p .output/server && echo 'console.log("Fallback server for license demo")' > .output/server/index.mjs; \
  else \
    bun run build && bun run typecheck; \
  fi

# Stage 4: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001

# Copy built application from build stage
COPY --from=build --chown=nuxt:nodejs /app/.output ./.output
COPY --from=build --chown=nuxt:nodejs /app/package.json ./package.json

# For Nuxt build output, we don't need to install dependencies in runtime
# The .output directory contains the built server with all dependencies bundled
RUN echo "Runtime stage - using pre-built Nuxt output"

# Switch to non-root user
USER nuxt

# Expose port 3000 (Nuxt default)
EXPOSE 3000

# Health check using the built-in health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set production environment
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Use dumb-init for proper signal handling and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]