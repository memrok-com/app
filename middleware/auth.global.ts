export default defineNuxtRouteMiddleware((to) => {
  // Public route names (these work with i18n locale prefixes)
  const publicRouteNames = [
    'index',           // root index
    'index___en',      // English index
    // Add more locales here if needed
  ]
  
  // Check if this is a public route by name
  const isPublicRoute = publicRouteNames.includes(to.name as string)
  
  // Check if this is an auth route (auth routes should always be public)
  const isAuthRoute = to.path.includes('/auth/')
  
  // Public routes don't require authentication
  if (isPublicRoute || isAuthRoute) {
    return
  }
  
  // Check if OIDC is configured
  const config = useRuntimeConfig()
  
  if (!config.public.MEMROK_AUTH_CONFIGURED) {
    // If OIDC is not configured, show an error page
    throw createError({
      statusCode: 503,
      statusMessage: 'Authentication not configured. Please set up OIDC credentials.',
    })
  }
  
  // For all other routes, check authentication
  try {
    const { loggedIn, login } = useOidcAuth()
    
    if (!loggedIn.value) {
      return login()
    }
  } catch (error) {
    // If useOidcAuth is not available, show error
    console.error('OIDC auth not available:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication system not available.',
    })
  }
})