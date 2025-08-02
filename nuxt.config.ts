// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  css: ['~/assets/css/main.css'],
  devtools: {
    enabled: true,
  },
  fonts: {
    defaults: {
      weights: ['200 700'],
    },
  },
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: ['en'],
  },
  modules: [
    '@formkit/auto-animate/nuxt',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui-pro',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'nuxt-oidc-auth',
  ],
  oidc: {
    defaultProvider: 'zitadel',
    providers: {
      zitadel: {
        audience: process.env.NUXT_OIDC_CLIENT_ID,
        clientId: process.env.NUXT_OIDC_CLIENT_ID,
        clientSecret: '', // PKCE flow
        baseUrl: process.env.NUXT_OIDC_ISSUER,
        redirectUri: process.env.NUXT_OIDC_REDIRECT_URI,
        logoutRedirectUri: process.env.NUXT_OIDC_POST_LOGOUT_REDIRECT_URI,
        authenticationScheme: 'none', // PKCE flow
        scope: ['openid', 'profile', 'email'],
        exposeAccessToken: true, // Enable access to tokens on server-side
      },
    },
    session: {
      automaticRefresh: true,
    },
  },
  runtimeConfig: {
    public: {
      MEMROK_APP_DOMAIN: process.env.MEMROK_APP_DOMAIN,
      MEMROK_AUTH_CONFIGURED: !!process.env.NUXT_OIDC_CLIENT_ID,
      MEMROK_AUTH_DOMAIN: process.env.MEMROK_AUTH_DOMAIN,
      MEMROK_PROJECT_PATH: process.cwd(),
      MEMROK_VERSION:
        process.env.NODE_ENV === 'production'
          ? process.env.MEMROK_VERSION
          : process.env.NODE_ENV,
    },
  },
  vite: {
    server: {
      allowedHosts: [process.env.MEMROK_APP_DOMAIN || 'app.dev.memrok.com'],
    },
  },
})
