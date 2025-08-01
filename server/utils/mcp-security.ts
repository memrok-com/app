import { z } from "zod"
import type { H3Event } from "h3"
import { getHeader } from "h3"

// UUID validation schema
export const uuidSchema = z.string().uuid()

// String length limits - optimized for memrok's memory/knowledge use case
export const MAX_NAME_LENGTH = 200        // Entity names - optimal for indexing
export const MAX_DESCRIPTION_LENGTH = 1000 // Entity descriptions - good balance
export const MAX_CONTENT_LENGTH = 25000    // Observations - increased for AI context, meeting notes, etc.
export const MAX_METADATA_SIZE = 8192      // JSON stringified size - below PostgreSQL TOAST threshold
export const MAX_PREDICATE_LENGTH = 100    // Relation predicates - for graph query efficiency

// Input validation schemas with security constraints
export const secureStringSchema = z
  .string()
  .min(1)
  .max(MAX_NAME_LENGTH)
  .transform((val) => sanitizeString(val))

export const secureDescriptionSchema = z
  .string()
  .max(MAX_DESCRIPTION_LENGTH)
  .transform((val) => sanitizeString(val))

export const secureContentSchema = z
  .string()
  .min(1)
  .max(MAX_CONTENT_LENGTH)
  .transform((val) => sanitizeString(val))

// Metadata validation - prevent injection attacks
export const secureMetadataSchema = z
  .record(z.any())
  .optional()
  .refine(
    (val) => {
      if (!val) return true
      const size = JSON.stringify(val).length
      return size <= MAX_METADATA_SIZE
    },
    {
      message: `Metadata size must not exceed ${MAX_METADATA_SIZE} characters`,
    }
  )
  .transform((val) => {
    if (!val) return val
    return sanitizeMetadata(val)
  })

// Entity type validation with whitelist
export const entityTypeSchema = z.enum([
  "person",
  "place",
  "event",
  "concept",
  "organization",
  "document",
  "project",
  "task",
  "note",
  "other",
])

// Predicate validation for relations - with length constraint
export const predicateSchema = z
  .string()
  .min(1)
  .max(MAX_PREDICATE_LENGTH)
  .transform((val) => sanitizeString(val))
  .refine(
    (val) => [
      "knows",
      "works_with", 
      "located_at",
      "part_of",
      "related_to",
      "mentions",
      "created_by",
      "assigned_to",
      "depends_on",
      "contains",
      "references",
      "follows",
      "precedes", 
      "causes",
      "contradicts",
      "supports",
      "other",
    ].includes(val) || val.length <= MAX_PREDICATE_LENGTH,
    {
      message: `Predicate must be a known type or custom predicate under ${MAX_PREDICATE_LENGTH} characters`,
    }
  )

// Request size limits
export const MAX_REQUEST_SIZE = 1024 * 1024 // 1MB
export const MAX_BATCH_SIZE = 50

// Rate limiting configuration
export const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100
export const RATE_LIMIT_MAX_BATCH_OPERATIONS = 10

// Sanitization functions
export function sanitizeString(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "")
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  
  // Normalize unicode
  sanitized = sanitized.normalize("NFC")
  
  return sanitized
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize keys
    const sanitizedKey = sanitizeString(key).slice(0, 100)
    
    // Sanitize values based on type
    if (typeof value === "string") {
      sanitized[sanitizedKey] = sanitizeString(value).slice(0, 1000)
    } else if (typeof value === "number") {
      // Ensure number is finite and within safe range
      if (Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
        sanitized[sanitizedKey] = value
      }
    } else if (typeof value === "boolean") {
      sanitized[sanitizedKey] = value
    } else if (Array.isArray(value)) {
      // Limit array size and sanitize elements
      sanitized[sanitizedKey] = value.slice(0, 100).map((item) => {
        if (typeof item === "string") {
          return sanitizeString(item).slice(0, 500)
        }
        return item
      })
    } else if (value && typeof value === "object") {
      // Recursively sanitize nested objects (limit depth)
      const maxDepth = 3
      const sanitizeNested = (obj: Record<string, unknown>, depth: number): Record<string, unknown> => {
        if (depth >= maxDepth) return {}
        const result: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj).slice(0, 50)) {
          const sk = sanitizeString(k).slice(0, 100)
          if (typeof v === "string") {
            result[sk] = sanitizeString(v).slice(0, 500)
          } else if (typeof v === "object" && v !== null) {
            result[sk] = sanitizeNested(v as Record<string, unknown>, depth + 1)
          } else {
            result[sk] = v
          }
        }
        return result
      }
      sanitized[sanitizedKey] = sanitizeNested(value as Record<string, unknown>, 0)
    }
  }
  
  return sanitized
}

// Audit logging
export interface AuditLogEntry {
  timestamp: Date
  userId: string
  assistantName?: string
  assistantType?: string
  operation: string
  toolName?: string
  entityId?: string
  success: boolean
  errorCode?: string
  duration?: number
}

export async function logAuditEvent(event: H3Event, entry: AuditLogEntry) {
  // In production, this would write to a proper audit log storage
  // For now, we'll use console with structured logging
  console.log(JSON.stringify({
    type: "audit",
    ...entry,
    requestId: event.context.requestId || "unknown",
    ip: getClientIP(event) || "unknown",
  }))
}

// Helper to extract client IP safely
function getClientIP(event: H3Event): string | null {
  const forwarded = getHeader(event, "x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  return getHeader(event, "x-real-ip") || null
}

// Validation helpers for MCP tools
export const validateEntityInput = z.object({
  name: secureStringSchema,
  type: entityTypeSchema,
  description: secureDescriptionSchema.optional(),
})

export const validateRelationInput = z.object({
  subjectId: uuidSchema,
  objectId: uuidSchema,
  predicate: predicateSchema,
})

export const validateObservationInput = z.object({
  entityId: uuidSchema,
  content: secureContentSchema,
  metadata: secureMetadataSchema,
})

export const validateSearchInput = z.object({
  query: secureStringSchema,
  entityTypes: z.array(entityTypeSchema).max(10).optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

// Error codes for consistent error handling
export enum MCPErrorCode {
  // Validation errors (4xxx)
  INVALID_INPUT = "MCP_4001",
  INVALID_UUID = "MCP_4002",
  INVALID_ENTITY_TYPE = "MCP_4003",
  INVALID_METADATA = "MCP_4004",
  REQUEST_TOO_LARGE = "MCP_4005",
  RATE_LIMIT_EXCEEDED = "MCP_4006",
  
  // Resource errors (4xxx) 
  ENTITY_NOT_FOUND = "MCP_4041",
  RELATION_NOT_FOUND = "MCP_4042",
  OBSERVATION_NOT_FOUND = "MCP_4043",
  
  // Permission errors (4xxx)
  UNAUTHORIZED = "MCP_4011",
  FORBIDDEN = "MCP_4031",
  
  // Server errors (5xxx)
  INTERNAL_ERROR = "MCP_5001",
  DATABASE_ERROR = "MCP_5002",
  CONTEXT_ERROR = "MCP_5003",
}