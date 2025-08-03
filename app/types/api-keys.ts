/**
 * API Key type definitions
 */

export interface ApiKey {
  id: string
  name: string
  description: string | null
  prefix: string // First 8 chars for identification (e.g., "mk_live_")
  scopes: string[]
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
  isActive: boolean
}

export interface ApiKeysResponse {
  keys: ApiKey[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface CreateApiKeyRequest {
  name: string
  description?: string
  scopes?: string[] // Default: ['memories:read', 'memories:write']
  expiresAt?: string // ISO date string, null for no expiration
}

export interface CreateApiKeyResponse {
  key: ApiKey & {
    secret: string // Only returned on creation
  }
  warning: string // Security notice about storing the key
}

export interface UpdateApiKeyRequest {
  name?: string
  description?: string
  scopes?: string[]
  expiresAt?: string | null
  isActive?: boolean
}

export interface UpdateApiKeyResponse {
  key: ApiKey
}

export interface DeleteApiKeyResponse {
  success: boolean
  message: string
}

export interface RegenerateApiKeyResponse {
  key: ApiKey & {
    secret: string // New secret value
  }
  warning: string
}