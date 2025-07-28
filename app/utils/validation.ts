/**
 * Input validation and sanitization utilities for the memory store
 * Provides basic XSS protection and input validation for MVP
 */

import DOMPurify from "dompurify"

// Validation limits - only for metadata structure to prevent deeply nested attacks
export const VALIDATION_LIMITS = {
  METADATA_MAX_DEPTH: 10,  // Reasonable depth for JSON structures
  METADATA_MAX_KEYS: 100,  // Reasonable number of keys per object
} as const

// Basic sanitization for text inputs
export const sanitizeText = (input: string): string => {
  if (typeof input !== "string") {
    throw new Error("Input must be a string")
  }

  // Trim whitespace and sanitize HTML
  const trimmed = input.trim()
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] })
}

// Validate and sanitize entity name
export const validateEntityName = (name: string): string => {
  if (!name || typeof name !== "string") {
    throw new Error("Entity name is required")
  }

  const sanitized = sanitizeText(name)

  if (sanitized.length === 0) {
    throw new Error("Entity name cannot be empty after sanitization")
  }

  return sanitized
}

// Validate and sanitize entity type
export const validateEntityType = (type: string): string => {
  if (!type || typeof type !== "string") {
    throw new Error("Entity type is required")
  }

  const sanitized = sanitizeText(type)

  if (sanitized.length === 0) {
    throw new Error("Entity type cannot be empty after sanitization")
  }

  return sanitized
}

// Validate and sanitize observation content
export const validateObservationContent = (content: string): string => {
  if (!content || typeof content !== "string") {
    throw new Error("Observation content is required")
  }

  const sanitized = sanitizeText(content)

  if (sanitized.length === 0) {
    throw new Error("Observation content cannot be empty after sanitization")
  }

  return sanitized
}

// Validate and sanitize relation predicate
export const validatePredicate = (predicate: string): string => {
  if (!predicate || typeof predicate !== "string") {
    throw new Error("Relation predicate is required")
  }

  const sanitized = sanitizeText(predicate)

  if (sanitized.length === 0) {
    throw new Error("Relation predicate cannot be empty after sanitization")
  }


  return sanitized
}

// Validate and sanitize assistant name
export const validateAssistantName = (name?: string): string | undefined => {
  if (!name) return undefined

  if (typeof name !== "string") {
    throw new Error("Assistant name must be a string")
  }

  const sanitized = sanitizeText(name)


  return sanitized || undefined
}

// Basic metadata sanitization (recursive with depth limit)
export const sanitizeMetadata = (metadata: any, depth = 0): any => {
  if (depth > VALIDATION_LIMITS.METADATA_MAX_DEPTH) {
    throw new Error("Metadata object is too deeply nested")
  }

  if (metadata === null || metadata === undefined) {
    return metadata
  }

  // Allow only safe primitive types
  if (typeof metadata === "string") {
    return sanitizeText(metadata)
  }

  if (typeof metadata === "number" || typeof metadata === "boolean") {
    return metadata
  }

  if (Array.isArray(metadata)) {
    return metadata.map((item) => sanitizeMetadata(item, depth + 1))
  }

  if (typeof metadata === "object") {
    const sanitized: Record<string, any> = {}
    const keys = Object.keys(metadata)

    if (keys.length > VALIDATION_LIMITS.METADATA_MAX_KEYS) {
      throw new Error(
        `Metadata object cannot have more than ${VALIDATION_LIMITS.METADATA_MAX_KEYS} keys`
      )
    }

    for (const key of keys) {
      // Sanitize the key itself
      const sanitizedKey = sanitizeText(key)
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeMetadata(metadata[key], depth + 1)
      }
    }

    return sanitized
  }

  // Reject any other types (functions, symbols, etc.)
  throw new Error("Metadata contains unsupported data types")
}

// Validate strength value for relations
export const validateStrength = (strength?: number): number | undefined => {
  if (strength === undefined || strength === null) {
    return undefined
  }

  if (typeof strength !== "number" || isNaN(strength)) {
    throw new Error("Strength must be a valid number")
  }

  if (strength < 0 || strength > 1) {
    throw new Error("Strength must be between 0 and 1")
  }

  return strength
}
