# Design system

The Meddleware design system is two packages, with three shared packages around them:

- **`@meddleware/design-tokens`** — CSS custom properties, JSON token tree, and TypeScript exports. The source of truth for colours, spacing, type scale, and motion; text contrast is held at WCAG AAA (7:1) in every colour mode and season.
- **`@meddleware/ui`** — Vue 3 component library (layout shell, primitives, forms, data and status components, colour-mode control) built entirely on the token layer, each component with its own CSS in a cascade layer.
- **`@meddleware/web-utils`** — framework-free helpers the frontends share: exact bigint amounts, dates and time zones, bounded fetch, stale-result guards, and the link helpers (`safeHref`, `safePath`, `suiExplorerUrl`).
- **`@meddleware/frontend-config`** — the shared lint, accessibility sweep, browser support list, Playwright and Lighthouse configuration.
- **`@meddleware/vitepress-theme`** — the VitePress theme and site config these documentation sites use.

## Quick start

```bash
npm install @meddleware/design-tokens @meddleware/ui
```

Import the CSS once at your app entry point:

```ts
// src/main.ts
import '@meddleware/design-tokens/tokens.css'   // required — registers CSS custom properties
import '@meddleware/design-tokens/seasons.css'  // optional — data-season="spring|summer|autumn|winter"
import '@meddleware/ui/reset.css'                // required once — element defaults, the focus ring, utilities (each component brings its own CSS)
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

## Philosophy

The design system is guided by three principles:

1. **Design recedes** — structure is invisible (sacred-geometry scales, φ/Fibonacci spacing). No decorative chrome.
2. **Primary colours as functional accents** — red = accent/action, blue = secondary/info, yellow = warning, green = ok. No gold or purple as identity marks.
3. **Controlled imperfection** — subtle noise, asymmetric spacing hooks, human easing. Machines are smooth; the design has texture.

## Token layers

| Layer | Purpose | Example |
| --- | --- | --- |
| Palette ramps | Colour-named; expandable swatches | `--mw-red-500`, `--mw-blue-300` |
| Semantic roles | Colour-agnostic; what components use | `--accent`, `--warning`, `--focus-ring` |
| Sacred-geometry scales | φ/Fibonacci spacing and type | `--space-md`, `--font-size-lg` |
| Panel palettes | Theme-independent (for shell variants) | `--mw-panel-dark-bg` |
| Chaos/motion | Noise, asymmetry, transitions | `--noise-overlay`, `--transition-base` |

See [Design tokens](./tokens) for full usage, and [Components](./components) for the component API.

## Light / dark mode

`useColorMode` from `@meddleware/ui` manages the `data-theme="dark"` attribute on `<html>` and persists to localStorage. All semantic tokens flip automatically.

To avoid a flash of the wrong theme while the app loads, apply the saved (or default) mode before the first paint with `@meddleware/ui/theme-init.js`, a tiny same-origin script for the page's `<head>` (so a strict CSP needs no hash). Vite apps get it, the `color-scheme` and `theme-color` tags from `themeInit()` in `@meddleware/frontend-config/vite`.

```vue
<script setup>
import { AppHeader, ColorModeControl, useColorMode } from '@meddleware/ui'
const { mode } = useColorMode()
</script>

<template>
  <AppHeader variant="dark">
    <template #actions>
      <ColorModeControl v-model="mode" />
    </template>
  </AppHeader>
</template>
```
