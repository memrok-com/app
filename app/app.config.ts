export default defineAppConfig({
  ui: {
    alert: {
      slots: {
        icon: '!h-[1.25em] !w-[1.25em]',
      },
    },
    button: {
      slots: {
        base: 'cursor-pointer',
      },
    },
    colors: {
      error: 'rose',
      info: 'cyan',
      neutral: 'stone',
      primary: 'indigo',
      secondary: 'purple',
      success: 'green',
      warning: 'amber',
    },
    form: {
      base: 'space-y-4',
    },
    icons: {
      chevronDown: 'i-ph-caret-down',
      close: 'i-ph-x',
      dark: 'i-ph-moon-fill',
      external: 'i-ph-arrow-line-up-right-bold',
      menu: 'i-ph-list',
      light: 'i-ph-sun-fill',
    },
    input: {
      slots: {
        root: 'w-full',
      },
    },
    inputMenu: {
      slots: {
        root: 'w-full',
      },
    },
    selectMenu: {
      slots: {
        base: 'w-full',
      },
    },
    table: {
      slots: {
        th: 'whitespace-nowrap',
      },
    },
    tabs: {
      slots: {
        trigger: 'cursor-pointer',
      },
    },
    textarea: {
      slots: {
        root: 'w-full',
      },
    },
  },
  uiPro: {
    pageAccordion: {
      slots: {
        trigger: 'cursor-pointer',
      },
    },
    pageFeature: {
      slots: {
        leadingIcon: '!h-[1.25em] !w-[1.25em]',
      },
    },
    pageHero: {
      slots: {
        title: 'text-balance',
        description: 'text-balance',
      },
    },
    pageSection: {
      slots: {
        leadingIcon: '!h-[2.5em] !w-[2.5em]',
        title: 'text-balance',
        description: 'text-balance',
      },
    },
  },
})
