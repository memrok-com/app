# Contributing to memrok

Thanks for your interest in contributing! memrok is a community-driven project, and we welcome contributions of all kinds - from bug reports and documentation improvements to new features and code reviews.

## Setup

```bash
git clone https://github.com/MichaelSchmidle/memrok.git
cd memrok
bun install
cp .env.example .env
# Add your NUXT_UI_PRO_LICENSE to .env
bun run dev
```

## Development

- **Branch**: Create feature branches from `main`
- **Commits**: Use descriptive messages, follow existing style
- **Code**: Follow existing patterns, use TypeScript
- **Tests**: Add tests for new features (when testing is implemented)

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit PR to `main` branch

## Code Style

- Use existing component patterns
- Follow Nuxt 3 and Vue 3 conventions
- Use Nuxt UI Pro components where possible
- Keep translations in `i18n/i18n.config.ts`

## Issues

- Use issue templates when available
- Provide reproduction steps for bugs
- Search existing issues before creating new ones