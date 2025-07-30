export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: "cursor-pointer",
      },
    },
    colors: {
      error: "rose",
      info: "cyan",
      neutral: "stone",
      primary: "indigo",
      secondary: "purple",
      success: "green",
      warning: "amber",
    },
    form: {
      base: "space-y-4",
    },
    icons: {
      chevronDown: "i-ph-caret-down",
      close: "i-ph-x",
      dark: "i-ph-moon-fill",
      external: "i-ph-arrow-line-up-right-bold",
      menu: "i-ph-list",
      light: "i-ph-sun-fill",
    },
    input: {
      slots: {
        root: "w-full",
      },
    },
    inputMenu: {
      slots: {
        root: "w-full",
      },
    },
    selectMenu: {
      slots: {
        base: "w-full",
      },
    },
    textarea: {
      slots: {
        root: "w-full",
      },
    },
  },
  uiPro: {
    pageAccordion: {
      slots: {
        trigger: "cursor-pointer",
      },
    },
    pageHero: {
      slots: {
        title: "text-balance",
        description: "text-balance",
      },
    },
    pageSection: {
      slots: {
        title: "text-balance",
        description: "text-balance",
      },
    },
  },
})
