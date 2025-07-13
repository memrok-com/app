export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check during SSR
  if (process.server) return

  // Check if route is explicitly marked as public
  if (to.meta.public === true) {
    return
  }

  // Check for Authelia headers that indicate successful authentication
  const isAuthenticated = checkAutheliaAuth()
  
  if (!isAuthenticated) {
    // Redirect to Authelia for authentication
    // This will redirect to auth.dev.memrok.com which handles the auth flow
    const autheliaUrl = getAutheliaRedirectUrl(to.fullPath)
    return navigateTo(autheliaUrl, { external: true })
  }
})

function checkAutheliaAuth(): boolean {
  // In development/testing, you might want to bypass auth
  if (process.env.NODE_ENV === 'development' && !process.env.NUXT_REQUIRE_AUTH) {
    return true
  }

  // Check for Authelia authentication headers
  // These headers are set by Authelia when the user is authenticated
  const headers = useRequestHeaders()
  
  return !!(
    headers['remote-user'] || 
    headers['Remote-User'] ||
    headers['x-remote-user']
  )
}

function getAutheliaRedirectUrl(returnPath: string): string {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl || window.location.origin
  const autheliaUrl = config.public.autheliaUrl || 'http://auth.dev.memrok.com'
  
  // Encode the return URL so Authelia knows where to redirect after auth
  const redirectUrl = `${baseUrl}${returnPath}`
  return `${autheliaUrl}/?rd=${encodeURIComponent(redirectUrl)}`
}