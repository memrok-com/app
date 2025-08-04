import type { H3Event } from "h3"
import { getHeader, setHeader } from "h3"
import { 
  RATE_LIMIT_WINDOW_MS, 
  RATE_LIMIT_MAX_REQUESTS, 
  RATE_LIMIT_MAX_BATCH_OPERATIONS,
  MCPErrorCode 
} from "../utils/mcp-security"
import { MemrokMCPError } from "../utils/mcp-errors"
import { consola } from "consola"

// In-memory rate limiting store (in production, use Redis)
interface RateLimitEntry {
  count: number
  batchCount: number
  windowStart: number
  blocked: boolean
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limiting middleware for MCP endpoints
 */
export async function rateLimitMiddleware(
  event: H3Event,
  userId: string,
  operation: {
    type: "request" | "batch"
    toolName?: string
    batchSize?: number
  }
): Promise<void> {
  const now = Date.now()
  const key = `${userId}:${getClientIP(event) || "unknown"}`
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  if (!entry) {
    entry = {
      count: 0,
      batchCount: 0,
      windowStart: now,
      blocked: false,
    }
    rateLimitStore.set(key, entry)
  }

  // Reset window if expired
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0
    entry.batchCount = 0
    entry.windowStart = now
    entry.blocked = false
  }

  // Check if currently blocked
  if (entry.blocked) {
    const remainingTime = Math.ceil(
      (entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000
    )
    throw new MemrokMCPError(
      MCPErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
      {
        retryAfter: remainingTime,
        limit: RATE_LIMIT_MAX_REQUESTS,
        window: RATE_LIMIT_WINDOW_MS / 1000,
      }
    )
  }

  // Increment counters
  entry.count++
  if (operation.type === "batch") {
    entry.batchCount++
  }

  // Check limits
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    entry.blocked = true
    const remainingTime = Math.ceil(
      (entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000
    )
    
    // Log security event
    const logger = consola.withTag('security')
    logger.warn(JSON.stringify({
      type: "security",
      event: "rate_limit_exceeded",
      userId,
      ip: getClientIP(event),
      count: entry.count,
      limit: RATE_LIMIT_MAX_REQUESTS,
      timestamp: new Date().toISOString(),
    }))

    throw new MemrokMCPError(
      MCPErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
      {
        retryAfter: remainingTime,
        limit: RATE_LIMIT_MAX_REQUESTS,
        window: RATE_LIMIT_WINDOW_MS / 1000,
      }
    )
  }

  // Check batch operation limits
  if (operation.type === "batch") {
    if (entry.batchCount > RATE_LIMIT_MAX_BATCH_OPERATIONS) {
      entry.blocked = true
      const remainingTime = Math.ceil(
        (entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000
      )
      
      consola.withTag('security').warn(JSON.stringify({
        type: "security",
        event: "batch_rate_limit_exceeded", 
        userId,
        ip: getClientIP(event),
        batchCount: entry.batchCount,
        limit: RATE_LIMIT_MAX_BATCH_OPERATIONS,
        timestamp: new Date().toISOString(),
      }))

      throw new MemrokMCPError(
        MCPErrorCode.RATE_LIMIT_EXCEEDED,
        `Batch operation limit exceeded. Try again in ${remainingTime} seconds.`,
        {
          retryAfter: remainingTime,
          limit: RATE_LIMIT_MAX_BATCH_OPERATIONS,
          window: RATE_LIMIT_WINDOW_MS / 1000,
        }
      )
    }

    // Check batch size
    if (operation.batchSize && operation.batchSize > 50) {
      throw new MemrokMCPError(
        MCPErrorCode.REQUEST_TOO_LARGE,
        `Batch size ${operation.batchSize} exceeds maximum of 50 items.`,
        { maxBatchSize: 50 }
      )
    }
  }

  // Add rate limit headers for HTTP responses
  if (event.method === "POST") {
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
    const resetTime = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS) / 1000)
    
    setHeader(event, "X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString())
    setHeader(event, "X-RateLimit-Remaining", remaining.toString())
    setHeader(event, "X-RateLimit-Reset", resetTime.toString())
    setHeader(event, "Retry-After", Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
  }
}

/**
 * Get current rate limit status for a user
 */
export function getRateLimitStatus(userId: string, clientIP?: string): {
  remaining: number
  resetAt: number
  blocked: boolean
} {
  const key = `${userId}:${clientIP || "unknown"}`
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    return {
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
      blocked: false,
    }
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS
  
  return {
    remaining,
    resetAt,
    blocked: entry.blocked,
  }
}

/**
 * Request size validation middleware
 */
export async function validateRequestSize(event: H3Event): Promise<void> {
  const contentLength = getHeader(event, "content-length")
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > 1024 * 1024) { // 1MB limit
      throw new MemrokMCPError(
        MCPErrorCode.REQUEST_TOO_LARGE,
        `Request size ${size} bytes exceeds maximum of 1MB.`,
        { maxSize: 1024 * 1024, actualSize: size }
      )
    }
  }
}

// Helper to extract client IP safely
function getClientIP(event: H3Event): string | null {
  const forwarded = getHeader(event, "x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  return getHeader(event, "x-real-ip") || null
}

