import { defineStore } from 'pinia'
import type { ApiKey, CreateApiKeyRequest } from '~/types/api-keys'

export const useApiKeysStore = defineStore('api-keys', () => {
  const api = useApi()
  
  // State
  const keys = ref<ApiKey[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const newlyCreatedKey = ref<{ id: string; secret: string } | null>(null)
  const deleting = ref(new Set<string>())

  // Actions
  async function fetchKeys() {
    loading.value = true
    error.value = null
    try {
      const response = await api('/api/keys')
      keys.value = response.keys
    } catch (err) {
      error.value = 'Failed to load API keys'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createKey(data: CreateApiKeyRequest) {
    loading.value = true
    error.value = null
    try {
      const response = await api('/api/keys', {
        method: 'POST',
        body: data
      })
      
      // Store the secret temporarily for display
      newlyCreatedKey.value = {
        id: response.key.id,
        secret: response.key.secret
      }
      
      // Add to list (without secret)
      const { secret, ...keyWithoutSecret } = response.key
      keys.value.unshift(keyWithoutSecret)
      
      return response
    } catch (err) {
      error.value = 'Failed to create API key'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function revokeKey(keyId: string) {
    deleting.value.add(keyId)
    error.value = null
    try {
      await api(`/api/keys/${keyId}`, {
        method: 'DELETE'
      })
      
      // Remove from list
      keys.value = keys.value.filter(key => key.id !== keyId)
    } catch (err) {
      error.value = 'Failed to revoke API key'
      throw err
    } finally {
      deleting.value.delete(keyId)
    }
  }

  function clearNewlyCreatedKey() {
    newlyCreatedKey.value = null
  }

  function isDeleting(keyId: string): boolean {
    return deleting.value.has(keyId)
  }

  return {
    // State
    keys: readonly(keys),
    loading: readonly(loading),
    error: readonly(error),
    newlyCreatedKey: readonly(newlyCreatedKey),
    deleting: readonly(deleting),
    
    // Actions
    fetchKeys,
    createKey,
    revokeKey,
    clearNewlyCreatedKey,
    isDeleting
  }
})