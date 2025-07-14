export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en: {
      navigation: {
        memory: 'Memory',
        assistants: 'Assistants',
        settings: 'Settings',
        github: 'GitHub',
      },
      index: {
        hero: {
          title: 'Rock-Solid Memory to Personalize All Your AI Assistants',
          description: 'Keep your data on your infrastructure under your control.'
        },
      },
    },
  },
}))