// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  css: [
    '~/assets/css/main.css',
  ],
  devtools: {
    enabled: true,
  },
  runtimeConfig: {
    public: {
      MEMROK_VERSION: process.env.MEMROK_VERSION || 'v0.0.1',
      MEMROK_AUTH_CONFIGURED: !!(process.env.ZITADEL_CLIENT_ID && process.env.ZITADEL_CLIENT_SECRET),
    },
  },
  vite: {
    server: {
      allowedHosts: [process.env.MEMROK_APP_DOMAIN || 'app.dev.memrok.com'],
    },
  },
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: ['en'],
    vueI18n: './i18n/i18n.config.ts'
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
    providers: {
      zitadel: {
        clientId: process.env.ZITADEL_CLIENT_ID || '',
        clientSecret: process.env.ZITADEL_CLIENT_SECRET || '',
        baseUrl: process.env.ZITADEL_BASE_URL || 'https://auth.dev.memrok.com',
        redirectUri: process.env.ZITADEL_REDIRECT_URI || 'https://app.dev.memrok.com/auth/zitadel/callback',
        logoutRedirectUri: process.env.ZITADEL_LOGOUT_REDIRECT_URI || 'https://app.dev.memrok.com',
        authenticationScheme: 'none', // PKCE flow
      },
    },
    session: {
      automaticRefresh: true,
    },
  },
})