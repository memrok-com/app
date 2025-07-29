/**
 * SSR-compatible API composable for authenticated requests
 * 
 * This composable provides a fetch instance that properly handles:
 * - Authentication cookies during SSR
 * - Proper base URL resolution
 * - Error handling
 */

import type { $Fetch } from 'ofetch'

export const useApi = (): $Fetch => {
  // Get request headers for SSR cookie forwarding
  const headers = useRequestHeaders(['cookie'])
  
  // Create a custom fetch instance
  const api = $fetch.create({
    onRequest({ options }) {
      // Forward cookies during SSR for authentication
      if (import.meta.server && headers.cookie) {
        // Set cookie header based on the type of headers object
        if (!options.headers) {
          // If no headers, create as Headers instance
          options.headers = new Headers({ cookie: headers.cookie })
        } else if (options.headers instanceof Headers) {
          // If Headers instance, use set method
          options.headers.set('cookie', headers.cookie)
        } else {
          // If plain object, add cookie property
          (options.headers as Record<string, string>).cookie = headers.cookie
        }
      }
    },
    onResponseError({ response }) {
      // Handle authentication errors consistently
      if (response.status === 401) {
        // Clear any local auth state if needed
        console.error('Authentication error:', response._data)
      }
    }
  })
  
  return api as $Fetch
}