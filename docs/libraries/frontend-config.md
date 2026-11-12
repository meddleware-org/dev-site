---
title: "frontend-config"
description: "Every bin and export of @meddleware/frontend-config: the Vite, Vitest, ESLint, stylelint, Playwright and Lighthouse configuration, the Content-Security-Policy profiles, mw-sync, mw-network-status and the CI tools."
---

# frontend-config

[`@meddleware/frontend-config`](https://www.npmjs.com/package/@meddleware/frontend-config) is the shared frontend tooling of every
Meddleware app and library: a repository's config files are one-liners, and every repository is held to the same accessibility and
browser-support bar. Install it as a dev dependency.

```bash
npm install --save-dev @meddleware/frontend-config
```

Optional peers per subpath: `eslint` ^10 (for `/eslint`), `stylelint` ^17, `html-validate` ^11, `postcss` ^8 and `@playwright/test` ~1.64.
The lint plugins are dependencies of this package and are resolved from it, so a consumer needs none of them.

## Exports

| Subpath | What it gives you |
| --- | --- |
| `/browserslist-config` | the browser support promise, as a browserslist shared config |
| `/eslint` | `vueApp({ name, sui?, ignores?, controlComponents?, labelComponents?, extra? })`: Vue and TypeScript, `eslint-plugin-vuejs-accessibility`, `eslint-plugin-compat`, optionally the Sui boundary from `@meddleware/eslint-config` |
| `/stylelint` | `stylelintConfig({ tokens?, compat?, browsers?, rules? })`: standard config, no hex colours, token-only colour and `z-index`, `@double-great/stylelint-a11y`, `stylelint-no-unsupported-browser-features` |
| `/html-validate` | `htmlValidateConfig({ elements?, rules? })`: recommended, `html-validate:a11y` and Vue, with `@meddleware/ui` components described as the native element they render |
| `/postcss` | Autoprefixer for the repository's browserslist |
| `/vite` | `meddlewareApp`, `themeInit`, `brandIcons`, `viteTarget`, `assertE2eOnlyInE2eMode` |
| `/vitest` | `vueTestConfig`, `inlineMeddleware`, `installDialogShim` |
| `/playwright` | `definePlaywrightConfig({ port, kind?, command?, browsers?, testDir?, extra? })` |
| `/axe`, `/look`, `/a11y`, `/shots` | `expectAccessible`; `looks`, `applyLook`, `offline`, `VIEWPORTS`, `THEMES`, `SEASONS`; `defineA11ySuite`; `defineShots` |
| `/lighthouserc` | `lighthouseConfig({ port, paths?, … })` (accessibility must score 100) |
| `/wallet` | `connectMockWallet(page)`, `exposeSigner(page, signer)`, `E2E_ADDRESS`: the Playwright side of the mock wallet |
| `/bundle` | `scanBundle(dist, { also })` |
| `/csp` | `buildCsp`, `cspForProfile`, `PROFILES`, `scriptHashesOf` |
| `/tsconfig/vue-app.json` | the compiler options of a Vue app |

The bins: `mw-sync`, `mw-network-status`, `mw-audit-gate`, `mw-third-party-licenses`, `mw-check-csp-inline` and `check-prod-bundle`.

## The configuration of an app

A tool app's whole build and test configuration is three short files.

```js
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

export default meddlewareApp({ plugins: [vue()] })
```

`meddlewareApp({ plugins, theme?, wallet?, name?, config? })` returns the complete Vite configuration of a tool app: the browserslist build
target (`viteTarget()`), the colour mode and season before first paint (`themeInit`, default colour mode `dark`), the favicon set and web manifest of
the company mark (`brandIcons({ name })`, see [Brand mark and shared assets](/design-system/brand)), the e2e-build guard
(`assertE2eOnlyInE2eMode`, which makes `VITE_E2E=1` outside `--mode e2e` a build error), and, unless `wallet: false`, `@meddleware/wallet-adapter`
excluded from dependency pre-bundling (it ships TS and `.vue` source and holds the shared wallet singleton, so pre-bundling would run two
singletons in dev). Anything else (`base`, `build.rollupOptions`, `server`, …) goes in `config`; its `build` is merged.

`themeInit({ default, scriptPath?, colors? })` is also available on its own: it serves `@meddleware/ui`'s `theme-init.js`, emits it into
the build and loads it first in `<head>` (the saved or default colour mode and the season applied before first paint, a same-origin
file so the CSP needs no hash and no `'unsafe-inline'`), and adds `color-scheme` and the browser-chrome `theme-color` tags from the tokens.

```js
// vitest.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

export default defineConfig(vueTestConfig({ plugins: [vue()] }))
```

`vueTestConfig({ plugins, test? })` is the whole Vitest configuration of a Vue repository: jsdom, `tests/**/*.test.ts`, a single copy of
Vue for the code under test and `@vue/test-utils`, and the UI packages processed through Vite (`inlineMeddleware`: `ui`,
`wallet-adapter`, `walrus-storage-kit`, `design-tokens`, because they import their own `.css` files, which Node cannot import).
`installDialogShim()` (call it in `beforeAll`) adds the `<dialog>` modality jsdom lacks, for a test that renders `UiDialog`.

```json
// tsconfig.json
{ "extends": "@meddleware/frontend-config/tsconfig/vue-app.json", "include": ["src", "tests", "env.d.ts"] }
```

The base sets `strict`, `Bundler` module resolution, `verbatimModuleSyntax`, `isolatedModules`, `jsx: preserve`, `noEmit` and
`types: ["node"]`; the repository keeps only its `include`.

```js
// eslint.config.ts
import { vueApp } from '@meddleware/frontend-config/eslint'
export default vueApp({ name: 'treasury-ui', sui: true })
```

```js
// stylelint.config.js
import { stylelintConfig } from '@meddleware/frontend-config/stylelint'
export default stylelintConfig()
```

```js
// postcss.config.js
export { default } from '@meddleware/frontend-config/postcss'
```

```json
// package.json
"browserslist": ["extends @meddleware/frontend-config/browserslist-config"]
```

### The support promise

`last 2` versions of Chrome, Chrome for Android, Edge, Firefox, Firefox for Android, Safari, iOS Safari and Samsung Internet, plus Firefox
ESR, minus dead browsers. It is deliberately not `last 2 versions`, which also selects Opera Mini, KaiOS, Baidu and QQ: every app is a Vue
single-page app and the wallet apps need browser extensions, so those engines cannot run them. Features newer than the oldest listed
browser still need `@supports` or progressive enhancement; the compat linters enforce it.

## Content-Security-Policy profiles

Every app image serves a Content-Security-Policy handed to `static-server` as the Dockerfile's `ARG CSP`. The profiles live here so the
policy is written once; `mw-sync` checks each Dockerfile against its profile. A policy never has `'unsafe-inline'` for scripts.

| Profile | For | Differences from the base |
| --- | --- | --- |
| `static` | the landing page | same-origin only |
| `static-strict` | the status page, the public roadmap | same-origin only; `base-uri` and `form-action` are `'none'` |
| `console` | an administrative console | same-origin only; never framed (`frame-ancestors 'none'`) |
| `chain` | a chain-facing tool | `connect-src 'self' https:`, `img-src … blob: https:`, `worker-src 'self' blob:` |
| `chain-wasm` | a chain-facing tool that runs WebAssembly (Walrus, Move bytecode) | `chain`, plus `'wasm-unsafe-eval'` in `script-src` |
| `docs` | a VitePress site | same-origin connections, same-origin and `data:` images, blob workers; the `sha256` hashes of the two inline bootstrap scripts are kept from the current policy |

`buildCsp({ wasm?, chain?, worker?, strict?, frameAncestors?, scriptHashes? })` builds a policy, `cspForProfile(name, current?)` the
policy of a named profile (keeping the script hashes of `current` for `docs`), `scriptHashesOf(csp)` reads them, and `PROFILES` is the
table. Every policy ends with `upgrade-insecure-requests`; `default-src`, `object-src 'none'` and the same-origin `font-src` are fixed.

## `mw-sync`

```bash
npx mw-sync --check   # fail (exit 1) when a file differs; say which and how to fix
npx mw-sync --write   # overwrite the files with the templates and the profile's policy
```

The repository declares what it is in `package.json`:

```json
"meddleware": { "kind": "app", "csp": "chain-wasm", "lhci": true }
```

- `kind: "app"`: `.github/dependabot.yml`, `.dockerignore`, `postcss.config.js` and `stylelint.config.js` equal the package's `templates/`, and the app has no `public/favicon.svg`, `public/favicon.ico` or `public/apple-touch-icon.png` (the icons come from `brandIcons`; `--write` deletes them).
- `csp`: the Dockerfile's `ARG CSP="…"` equals that profile's policy.
- `lhci: true`: `.github/audit-allowlist.json` equals the dated allowlist for the Lighthouse CI tool chain (one expiry, reviewed together).

CI runs `npx mw-sync --check` next to the dependency audit.

## `mw-network-status`

```bash
mw-network-status --out docs/.vitepress/network.json     # write the file
mw-network-status --check docs/.vitepress/network.json   # CI: fail when the committed file differs from the records
mw-network-status                                        # print to stdout
```

Which networks Meddleware is deployed on, from the deployment records of the installed `@meddleware/access-gate-client` and
`@meddleware/sealed-storage-client` (read as text, because the clients ship TypeScript source): `{ testnet, mainnet }`, each
`{ status: 'live' | 'partial' | 'coming', live: string[], missing: string[] }` (the same rule as `networkAvailability` in
[web-utils](./web-utils#network-availability)). The file is committed and CI checks it, so "mainnet is coming" becomes "live" by the
records alone: bumping a client that gains a `mainnet` record fails the check until the file is regenerated. This site's `NetworkNotice`
component prints a sentence from it, and no page states which network is live in prose.

## Build and test configuration

- **`definePlaywrightConfig({ port, kind?, … })`** runs Chromium locally and five projects in CI (Chromium, Firefox, WebKit, a Pixel 7 and an
  iPhone 14 viewport); `E2E_BROWSERS=all` runs all five locally (`npx playwright install chromium firefox webkit` first). `kind` is `app`
  (`npm run build`, then `vite preview`), `gallery` or `vitepress` (`vitepress preview docs` of an already built site). `SHOTS=1` keeps a
  screenshot run on Chromium and runs only `e2e/screens.spec.ts`.
- **`expectAccessible(page, options)`** fails on any `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` or axe best-practice
  violation; WCAG AAA is `aaa: 'gate'`, `'report'` or `'off'`.
- **`defineA11ySuite(states, { aaa })`** is the sweep every app runs in one call: each state in every colour mode × season at AA and AAA,
  a 320 px reflow, 200% text size, forced colours, reduced motion and a keyboard pass.
- **`defineShots(states)`** writes one screenshot per state × look, for looking at the UI.
- **`check-prod-bundle [dist] [--also TEXT]… [--also-regex PATTERN]…`** fails when the e2e harness (the mock-wallet hooks, or an app's own
  stand-in marker) is found in a production build. Run it after the production build, in CI and in the Dockerfile.
- **`mw-audit-gate`** is the CI dependency gate: `npm audit` at high and critical minus the dated, reasoned entries of
  `.github/audit-allowlist.json` (an entry with no reason or an expired date fails).
- **`mw-third-party-licenses [--check]`** writes `dist/THIRD_PARTY_LICENSES` from the lockfile's production packages and their installed
  licence texts; `--check` fails when none can be written.
- **`mw-check-csp-inline <policy or @Dockerfile> [dist]`** fails when a built page has an inline script the policy does not allow by
  `sha256`, or when the policy allows `'unsafe-inline'` scripts.

### Keeping the e2e harness out of production

An app's e2e build (`vite build --mode e2e`) registers a mock wallet and a stub chain. Three things keep that out of every other build:
the app's entry loads it only when `import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1'` (both static, so the block is
removed); `assertE2eOnlyInE2eMode(mode)` fails a build with `VITE_E2E` set in any other mode; and `check-prod-bundle dist` scans the built
files for the harness's hooks. The Playwright side is `@meddleware/frontend-config/wallet`; the page side is
[`@meddleware/wallet-adapter/testing`](./wallet-adapter#testing-entry).
