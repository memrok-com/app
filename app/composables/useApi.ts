/**
 * SSR-compatible API composable for authenticated requests
 * 
 * This composable provides a fetch instance that properly handles:
 * - Authentication cookies during SSR
 * - Proper base URL resolution
 * - Error handling
 */

export const useApi = () => {
  // Get request headers for SSR cookie forwarding
  const headers = useRequestHeaders(['cookie'])
  
  // Create a custom fetch instance
  const api = $fetch.create({
    onRequest({ options }) {
      // Forward cookies during SSR for authentication
      if (import.meta.server && headers.cookie) {
        options.headers = {
          ...options.headers,
          cookie: headers.cookie
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
  
  return api
}