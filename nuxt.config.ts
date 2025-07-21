// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  css: [
    '~/assets/css/main.css',
  ],
  devtools: {
    enabled: true,
  },
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: ['en'],
    vueI18n: '~/i18n/i18n.config.ts'
  },
  modules: [
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui-pro',
    '@nuxtjs/i18n',
    'nuxt-oidc-auth',
  ],
  oidc: {
    defaultProvider: 'zitadel',
    middleware: {
      globalMiddlewareEnabled: true, // Enable built-in global middleware
    },
    providers: {
      zitadel: {
        audience: process.env.NUXT_OIDC_CLIENT_ID,
        clientId: process.env.NUXT_OIDC_CLIENT_ID,
        baseUrl: process.env.NUXT_OIDC_ISSUER,
        redirectUri: process.env.NUXT_OIDC_REDIRECT_URI,
        logoutRedirectUri: process.env.NUXT_OIDC_POST_LOGOUT_REDIRECT_URI,
        authenticationScheme: 'none', // PKCE flow
      },
    },
    session: {
      automaticRefresh: true,
    },
  },
  runtimeConfig: {
    public: {
      MEMROK_VERSION: process.env.MEMROK_VERSION,
      MEMROK_AUTH_CONFIGURED: !!(process.env.NUXT_OIDC_CLIENT_ID),
      MEMROK_AUTH_DOMAIN: process.env.MEMROK_AUTH_DOMAIN,
    },
  },
  vite: {
    server: {
      allowedHosts: [process.env.MEMROK_APP_DOMAIN || 'app.dev.memrok.com'],
    },
  },
})