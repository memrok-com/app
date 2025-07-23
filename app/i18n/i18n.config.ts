export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en: {
      navigation: {
        memories: 'Memories',
        assistants: 'Assistants',
        settings: 'Settings',
        github: 'GitHub',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        profile: 'Profile',
        logout: 'Logout',
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