export default defineAppConfig({
  ui: {
    colors: {
      error: "rose",
      info: "cyan",
      neutral: "stone",
      primary: "indigo",
      secondary: "purple",
      success: "green",
      warning: "amber",
    },
    icons: {
      close: "i-ph-x",
      dark: "i-ph-moon-fill",
      external: "i-ph-arrow-square-out-light",
      light: "i-ph-sun-fill",
    },
    input: {
      slots: {
        root: "w-full",
      },
    },
    inputMenu: {
      slots: {
        base: "w-full",
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
})
