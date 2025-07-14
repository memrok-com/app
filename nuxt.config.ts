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
      autheliaUrl: process.env.MEMROK_AUTH_DOMAIN ? `https://${process.env.MEMROK_AUTH_DOMAIN}` : 'https://auth.dev.memrok.com',
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
    vueI18n: './i18n.config.ts'
  },
  modules: [
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/ui-pro',
    '@nuxtjs/i18n',
  ],
})