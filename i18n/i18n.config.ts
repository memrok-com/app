export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en: {
      navigation: {
        memory: 'Memory',
        assistants: 'Assistants',
        settings: 'Settings',
        github: 'GitHub'
      },
      index: {
        hero: {
          title: 'Rock-Solid Assistant Memory',
          description: 'memrok is a shared memory for all your AI assistants, helping them keep track of your conversations and interactions.'
        },
      },
    },
  },
}))