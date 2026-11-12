---
title: "Brand mark and shared assets"
description: "The Meddleware brand mark (the Kopimi K), BrandMark, the shared favicon set in @meddleware/ui/brand, how apps and VitePress sites get it, the vendoring rule for third-party assets, and the de-enshittification rules every repository follows."
---

# Brand mark and shared assets

Every Meddleware app and documentation site carries the same company mark and the same favicon set, and none of them keeps a copy of its
own. The files live in one place, [`@meddleware/ui`](./components), and the shared tooling puts them where a site needs them.

## The mark

The company mark is the Kopimi "K", an isometric block K. It is public domain: Wikimedia Commons records it as coming from Piratbyrån's
kopimi.com, with no author named. It replaces any stand-in logo (a diamond glyph, a hexagon, a letter on a square). A tool's emoji is the
tool's icon, not the company mark, and stays.

The footer's Kopimi symbol (`CopyrightLine`) is a separate element and is unchanged: it links to the self-hosted Kopimi document on `meddleware.co.uk` (the default `legalBase`), not to the mark.

## `BrandMark`

`BrandMark` from `@meddleware/ui` draws the mark as an inline SVG.

```vue
<script setup lang="ts">
import { BrandMark } from '@meddleware/ui'
</script>

<template>
  <a href="/"><BrandMark /> Access Gate</a>
  <BrandMark label="Meddleware" />
</template>
```

| Prop | Type | Description |
| --- | --- | --- |
| `label` | `string` | An accessible name for a mark that stands alone. Without it the mark is decorative (`aria-hidden`): put the name beside it |

- It is drawn in `currentColor`, so it takes the accent, or any colour, of its context in either colour mode. It has no background: the
  white tops of the original drawing are real holes in the shape.
- It is `1em` tall and wide (`display: inline-block`, aligned with the text). A container can set `--mw-brand-size` to size it otherwise.
- [`AppToolShell`](./components#app-tool-shell) shows it beside the tool's name; the `brand` slot replaces both.

## The shared files: `@meddleware/ui/brand/*`

`@meddleware/ui` publishes the favicon set under `@meddleware/ui/brand/*`:

| File | What it is |
| --- | --- |
| `favicon.svg` | the mark in the accent of the visitor's colour mode, on a transparent background |
| `favicon.ico` | a raster fallback |
| `apple-touch-icon.png` | the fallback for iOS home screens |
| `icon-192.png`, `icon-512.png` | the web-manifest icons |

The raster files show the light accent inside a white outline, so they read on a light or a dark tab. They are generated from the vendored
source file by `npm run build:brand` in the `@meddleware/ui` repository; the build never downloads anything.

## How an app or a site gets the icons

An app or site never keeps `favicon.*`, `apple-touch-icon.png` or a `<link rel="icon">` of its own.

- **A Vite app**: `meddlewareApp({ plugins, name: 'Access Gate' })` from `@meddleware/frontend-config/vite` includes `brandIcons({ name })`. It
  serves the files in development, emits `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and
  `site.webmanifest` at the site root of the build, and injects the `<link>` tags into `index.html`. `name` is the app's name in the
  manifest (default `Meddleware`). `npx mw-sync --check` fails when an app has `public/favicon.svg`, `public/favicon.ico` or
  `public/apple-touch-icon.png`; `--write` deletes them.
- **A VitePress site** (this one): `baseConfig` of [`@meddleware/vitepress-theme`](/libraries/vitepress-theme) does the same: the head carries the
  SVG icon, the 48 px `.ico`, the touch icon and the manifest link; the files and a `site.webmanifest` named after the site's title are copied into
  the output when the build ends; and a development middleware serves them. The theme's layout puts `BrandMark` before the site title in the
  navigation bar. The site keeps no `docs/public/favicon.svg` and no icon link in its `config.ts`. The theme loads no web font: text uses the
  system stacks of the design tokens (`--mw-font-sans`, `--mw-font-mono`).

The manifest's colours are the dark background token, and its `display` is `browser`: the sites are pages, not installed apps.

## Vendoring rule for third-party assets

An asset that is not ours (the mark is the example) is vendored, never fetched at build time or at run time from its original host.

- Only public-domain assets are vendored.
- The source file is committed exactly as downloaded. A README next to it records the source URL, the licence, the date of retrieval and
  the SHA-256 of the file. For the mark that is `src/brand/README.md` in the `@meddleware/ui` repository.
- Everything derived from it (the path data `BrandMark` draws, the favicon files) is produced by a script in the same repository, and a check
  fails when the derived files no longer match.

## De-enshittification rules

These hold for every repository, including this one:

- **No web fonts.** Text uses the system stacks of the design tokens. A built site has no `.woff2` file and no font preload.
- **No third-party hosts.** No CDN script, style, image or font, no analytics or tracking of any kind, no external image host in markup or CSS.
  The Content-Security-Policy of the `docs` profile enforces it for this site: `img-src 'self' data:`, `font-src 'self' data:`,
  `connect-src 'self'`. The only third-party calls a Meddleware app makes are to the chain services it exists to use (Sui, Walrus and Seal
  endpoints), which are protocol requirements.
- **`DO_NOT_TRACK: "1"` in CI.** Every workflow file sets it in its top-level `env`, so tools that honour it stay quiet.
- **Telemetry is off.** The platform's components run with their telemetry switched off; the maintainers' document for this is named
  `PRIVACY_BY_DEFAULT` (it is private).

`tests/dist-brand.test.mjs` in this repository checks the built site against the first two rules and against the icon set: the files, one SVG icon
link per page, the mark in the navigation bar, no font file and no font preload, and no script, stylesheet or image from another origin.
