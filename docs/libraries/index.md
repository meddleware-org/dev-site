---
title: "Libraries"
description: "The shared packages every Meddleware app and site is built from: wallet-adapter, web-utils, frontend-config, walrus-storage-kit and the VitePress theme."
---

# Libraries

Besides the [Sui SDKs](/sui/) and the [design system](/design-system/), every Meddleware app and site is built from a few shared
packages. Each is its own repository, licensed 0BSD, with its own CHANGELOG and npm release.

| Package | Purpose | Used by |
| --- | --- | --- |
| [`@meddleware/wallet-adapter`](./wallet-adapter) | Vue 3 wallet-standard composable, the network selector, the executor and the test doubles | every tool app, the dashboard, the Treasury |
| [`@meddleware/web-utils`](./web-utils) | Framework-free helpers: exact amounts, dates, bounded fetch, links, status snapshots, network availability | the UI libraries, the apps, the clients |
| [`@meddleware/frontend-config`](./frontend-config) | Lint, Vite, Vitest, Playwright and Lighthouse configuration, the Content-Security-Policy profiles and the build tools | every app and site |
| [`@meddleware/walrus-storage-kit`](./walrus-storage-kit) | Vue 3 UI for the upload relay: relay selection, tip estimate, gate access, upload widget | the Walrus Storage and Token Issuance apps |
| [`@meddleware/vitepress-theme`](./vitepress-theme) | The VitePress theme and site configuration, and the build scripts the documentation sites share | the documentation sites |

The design system packages, `@meddleware/design-tokens` and `@meddleware/ui`, are on [their own pages](/design-system/). A static
app is composed like this:

```text
design-tokens ─▶ ui ─▶ wallet-adapter ─▶ walrus-storage-kit ─▶ the app
                  ▲          ▲
              web-utils ─────┘            frontend-config: build, lint, test and CSP of the app
```

Packages that ship TypeScript or `.vue` source (`wallet-adapter`, `walrus-storage-kit`, the SDK clients) are compiled by the consuming
app's bundler. A `^0.0.x` range does not take the next patch, so a consumer bumps its range after each release.
