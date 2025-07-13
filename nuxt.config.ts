// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  css: [
    '~/assets/css/main.css',
  ],
  devtools: {
    enabled: true,
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