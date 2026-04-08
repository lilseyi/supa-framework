# Supa Framework

Opinionated full-stack framework for building apps with **Convex** + **Expo** + **React Native**.

Spawn a new app in 2 minutes. Get auth, notifications, chat, payments, CI/CD, and native safety out of the box. Focus on your domain logic — Supa handles the rest.

## Quick Start

```bash
npx create-supa-app my-app
cd my-app
pnpm install
pnpm setup:secrets
npx convex dev
pnpm dev
```

## Packages

| Package | Description |
|---------|-------------|
| [`@supa/core`](packages/core) | Runtime providers, hooks, navigation, keyboard handling |
| [`@supa/convex`](packages/convex) | Backend auth (OTP), schema helpers, notifications, payments |
| [`@supa/chat`](packages/chat) | Real-time messaging with pagination, offline caching |
| [`@supa/notifications`](packages/notifications) | Push notifications with deep linking |
| [`@supa/payments`](packages/payments) | Stripe integration with staging/production separation |
| [`@supa/metro`](packages/metro) | Metro config factory for pnpm monorepos |
| [`@supa/native-safety`](packages/native-safety) | Native dependency gating for safe OTA updates |
| [`@supa/linter`](packages/linter) | ESLint rules for Supa conventions |
| [`@supa/testing`](packages/testing) | Reusable test suites for Expo gotchas |
| [`@supa/dev`](packages/dev) | Development orchestrator (Convex + Expo) |
| [`@supa/scripts`](packages/scripts) | CI/deploy helper scripts |
| [`@supa/claude`](packages/claude) | Claude Code configuration templates |
| [`create-supa-app`](packages/create-supa-app) | Interactive CLI scaffolder |

## Reusable GitHub Workflows

Consumer apps call these instead of writing their own CI/CD:

```yaml
jobs:
  ci:
    uses: lilseyi/supa-framework/.github/workflows/ci.yml@v1
    with:
      node-version: "22"
      shared-package: "@myapp/shared"
    secrets: inherit
```

## Philosophy

- **Opinionated, not flexible** — sensible defaults with escape hatches
- **Copy real code, don't generate** — extracted from production apps
- **Enforce conventions** — linting and tests catch mistakes before CI
- **Updates propagate** — `pnpm update @supa/*` brings improvements to all consumers

## License

MIT
