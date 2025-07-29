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
        // Set cookie header based on the type of headers object
        if (!options.headers) {
          // If no headers, create as plain object
          options.headers = { cookie: headers.cookie } as any
        } else if (options.headers instanceof Headers) {
          // If Headers instance, use set method
          options.headers.set('cookie', headers.cookie)
        } else {
          // If plain object, add cookie property
          (options.headers as any).cookie = headers.cookie
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