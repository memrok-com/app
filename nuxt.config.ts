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
        authenticationScheme: 'none', // PKCE flow
        authorizationUrl: '',
        baseUrl: '',
        clientId: '',
        clientSecret: '', // PKCE flow
        exposeAccessToken: true, // Enable access to tokens on server-side
        logoutUrl: '',
        logoutRedirectUri: '',
        redirectUri: '',
        responseType: 'code',
        scope: ['openid', 'profile', 'email'],
        tokenUrl: '',
        userInfoUrl: '',
      },
    },
    session: {
      automaticRefresh: true,
      maxAge: 3600, // 1 hour session timeout
      cookie: {
        secure: true, // HTTPS only
        sameSite: 'lax',
      },
    },
  },
  runtimeConfig: {
    public: {
      MEMROK_APP_DOMAIN: process.env.MEMROK_APP_DOMAIN || '',
      MEMROK_AUTH_DOMAIN: process.env.MEMROK_AUTH_DOMAIN || '',
      MEMROK_BUILD_YEAR:
        process.env.MEMROK_BUILD_YEAR || new Date().getFullYear().toString(),
      MEMROK_PROJECT_PATH: process.cwd(),
      MEMROK_VERSION:
        process.env.NODE_ENV === 'development'
          ? 'development'
          : process.env.MEMROK_VERSION || undefined,
    },
  },
  nitro: {
    experimental: {
      wasm: true, // Enable WASM support for Transformers.js
    },
    rollupConfig: {
      external: process.env.CI === 'true' ? ['@xenova/transformers'] : [],
    },
  },
  vite: {
    server: {
      allowedHosts: [process.env.MEMROK_APP_DOMAIN || 'app.dev.memrok.com'],
    },
    build: {
      rollupOptions: {
        external: process.env.NODE_ENV === 'test' ? ['@xenova/transformers'] : [],
      },
    },
    optimizeDeps: {
      exclude: ['@xenova/transformers'],
    },
  },
})
