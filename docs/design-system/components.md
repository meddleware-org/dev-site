---
title: "Components"
description: "The @meddleware/ui Vue 3 components: the layout shell and AppToolShell, colour mode, primitives, forms, data and status components, composables, utilities and runtime endpoint configuration."
---

# Components

`@meddleware/ui` exports a Vue 3 component library. All components are styled exclusively via CSS custom properties from `@meddleware/design-tokens` — no hardcoded values.

## Installation

```bash
npm install @meddleware/ui @meddleware/design-tokens
```

`vue ^3.5.0` is a peer dependency — supply your own.

## Layout shell

The three shell components share an identical prop API:

```vue
<AppHeader variant="dark" />
<AppSidebar variant="light" />
<AppFooter variant="transparent" :docs-url="DOCS_URL" :dev-url="DEV_URL" />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `'dark' \| 'light' \| 'transparent'` | `'dark'` (`AppHeader`, `AppSidebar`), `'transparent'` (`AppFooter`) | Colour scheme for the shell component (theme-independent — `'dark'` renders correctly on a light page) |
| `colors` | `PanelColors` | — | Per-instance override of any `--mw-panel-*` token |
| `docsUrl` | `string` | — | `AppFooter` only — "Documentation" link href |
| `devUrl` | `string` | — | `AppFooter` only — "Developer docs" link href |

Below 45em the sidebar becomes a drawer (the Popover API): give `AppSidebar` an `id` and pass it as `AppHeader`'s `sidebar-id`, and the header shows a menu button that opens it. `UiAppShell` is the page frame around them: a skip link, the header, an optional sidebar, `<main>` and the footer.

### Slots

`AppHeader`, `AppSidebar` and `AppFooter` expose named slots for custom content (`AppHeader`: `brand`, the default slot and `actions`, rendered directly with no wrapper; `AppSidebar`: `head`, the default slot inside the labelled `nav`, `body` and `foot`; `AppFooter`: `start`, the default slot and `end`):

```vue
<AppHeader variant="dark">
  <template #brand><!-- the name or logo (plain text or a link) --></template>
  <!-- the default slot: content between the brand and the actions -->
  <template #actions>
    <ColorModeControl v-model="mode" />
  </template>
</AppHeader>

<AppSidebar id="primary-nav" variant="light">
  <template #head><!-- sidebar header --></template>
  <template #default>
    <SidebarItem label="Overview" :active="true" />
    <SidebarItem label="Settings" />
  </template>
  <template #body><!-- content below the navigation --></template>
  <template #foot><!-- sidebar footer --></template>
</AppSidebar>
```

### App tool shell

`AppToolShell` is the frame every standalone Meddleware tool app shares (access gate, Walrus Storage, Sealed Storage, Token Issuance, Treasury):
the page shell (`UiAppShell`), a dark `AppHeader` with the tool's name, the actions the tool needs next to the colour-mode control, one
visually hidden page heading, and the `AppFooter` with the documentation and developer links and the copyright line. The tool itself is the
default slot.

```vue
<script setup lang="ts">
import { AppToolShell } from '@meddleware/ui'
import { WalletModal } from '@meddleware/wallet-adapter'
</script>

<template>
  <AppToolShell title="Access Gate" slug="access-gate" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions><WalletModal /></template>
    <AccessGateView />
  </AppToolShell>
</template>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | required | The tool's name: the brand in the header and the page's visually hidden `<h1>` |
| `slug` | `string` | required | The tool's page name on the documentation sites; the default footer links are `https://docs.meddleware.co.uk/blockchain/sui/<slug>/` and `https://meddleware.dev/sui/<slug>/` |
| `docsUrl`, `devUrl` | `string` | from `slug` | Override either footer link; an app passes its `VITE_DOCS_URL` and `VITE_DEV_URL` build values |
| `defaultMode` | `'light' \| 'dark' \| 'system'` | `'dark'` | The colour mode a first visit gets; a saved choice always wins |

Slots: the default slot (the tool), `actions` (rendered before the `ColorModeControl`) and `brand` (replaces the title text in the header).
Because the default footer links follow the slug, a tool needs a page at `/sui/<slug>/` on this site: `walrus-storage`, `sealed-storage`,
`access-gate`, `token-issuance` and `treasury` all have one.

## Colour mode

```ts
import { useColorMode } from '@meddleware/ui'
import type { ColorMode } from '@meddleware/ui'

const { mode } = useColorMode()   // ColorMode: 'light' | 'dark' | 'system'
mode.value = 'dark'               // sets data-theme="dark" on <html>, persists to localStorage
```

`ColorModeControl` is a presentational toggle — bind with `v-model`:

```vue
<ColorModeControl v-model="mode" />
```

## Primitives

| Component | Props | Notes |
| --- | --- | --- |
| `UiButton` | `variant` (`primary`, `secondary`, `ghost`, `danger`, `link`), `size` (`md`, `sm`), `busy`, `disabled`, `href` | A `<button>` (an `<a>` with `href`); `busy` shows a spinner, sets `aria-busy` and blocks clicks |
| `UiCard` | `title`, `as` (`section`, `article`, `li`), `level` (heading rank), `plain`, `href` | `--surface` background, `--border`, `--radius`; `href` makes the whole card a link through its title |
| `UiBadge` | `tone` (`ok`, `warn`, `danger`, `info`, `neutral`, `accent`), `symbol` | Body-colour text with the tone as the border and a symbol, so meaning never rests on colour alone |
| `UiNotice` | `type` (`info`, `warning`, `error`, `ok`), `message`, `as` (`p`, `div`) | `error` is an alert, the others are polite status messages |
| `UiInput`, `UiTextarea`, `UiSelect` | native control attrs | Styled with scale tokens; the edge is `--control-border` (3:1 on every canvas) and `--focus-ring` shows on focus |
| `SidebarItem` | `label`, `icon?`, `active?`, `disabled?`, `href?` | Navigation item for `AppSidebar`; a real link with `href` |
| `CopyableAddress` | `address`, `truncate?`, `chars?`, `label?` | Copy-to-clipboard with icon; slot for link |
| `ExplorerLink` | `href`, `value?` | External block-explorer link; compose inside `CopyableAddress` |

### Forms, data and status

| Component | Notes |
| --- | --- |
| `UiTextField`, `UiSelectField`, `UiCheckField`, `UiDateTimeField`, `UiFileField` | A control with its label, hint and error associated (`id`, `aria-invalid`, `aria-describedby`); `UiDateTimeField` exchanges ISO instants in a chosen time zone |
| `UiDataTable` | `<th>` cells in the `head` slot (never a `<tr>`), rows in the default slot, `rows` and `empty` for the empty state, `caption` for the name; scrolls inside its own focusable box |
| `UiStatGrid` / `UiStatRow` | A description list of label/value pairs |
| `UiStepper`, `UiMeter`, `UiPager`, `UiLiveStatus`, `UiEmptyState` | A wizard or progress list, a labelled `<meter>`, previous/next paging, an always-mounted status region, "nothing here yet" |
| `UiDialog` | The native `<dialog>`, dismissed by Escape and a click outside; a dialog with no control in it takes a tab stop so a long one can be scrolled from the keyboard |
| `UiFieldHint` | A "?" button whose tip opens on hover and focus and closes with Escape without moving either (WCAG 1.4.13) |

### Copy + link pattern

```vue
<CopyableAddress :address="addr">
  <ExplorerLink :href="suiExplorerUrl('account', addr, 'testnet')" :value="addr" />
</CopyableAddress>
```

### Explorer helper

```ts
import { suiExplorerUrl, walruscanBlobUrl } from '@meddleware/ui' // both live in @meddleware/web-utils and are re-exported

suiExplorerUrl('txblock', txDigest, 'testnet')
// → https://testnet.suivision.xyz/txblock/<txDigest>
walruscanBlobUrl('testnet', blobId)
// → https://walruscan.com/testnet/blob/<blobId>
```

Supported kinds: `'account'`, `'object'`, `'txblock'` (SuiVision). Network defaults to `'testnet'` (`'mainnet'` and `'devnet'` also). Every id is encoded into one path segment. Bind a URL in a template only through `safeHref`, `safePath`, `safeIcon`, `suiExplorerUrl` or `walruscanBlobUrl`: `@meddleware/eslint-config` fails the lint otherwise.

### Console and tool components

| Component | Notes |
| --- | --- |
| `UiAppShell` | the page frame: a skip link, the `header` slot, an optional `sidebar`, the `<main>` landmark and the `footer` slot; `mainId` names the landmark, `contained` limits the content to the tool width |
| `UiToolIntro` | the one-line description at the top of a tool view, styled uniformly |
| `UiPanel` | a titled content `<section>` (`title`, `level` 2 to 6 for the heading rank) |
| `UiToolbar`, `UiToolbarButton` | a WAI-ARIA toolbar (one tab stop; Left, Right, Home and End move between buttons) emitting `action`; the button also works standalone |
| `AppTabNav`, `UiTabPanel` | the WAI-ARIA tabs pattern for views on one page: `tabs`, `v-model`, a shared `idPrefix`, `variant` (`underline`, `raised`), `size`, `allPanels`; `tabIds` builds the ids |
| `UiSegmentedControl` | a radio-group selection between labelled options (`options`, `v-model`, `label`, `layout`); the selected option carries a check mark as well as the fill |
| `UiFormField` | a labelled field wrapper (`id`, `label`, `error`, `hint`) with a `label-suffix` slot for a `UiFieldHint` |
| `UiCodeBlock` | a block of code or data: a `<figure>` named by a visually hidden caption, holding a focusable `<pre>` (`code`, `label`, `wrap`) |
| `UiAmount` | a SUI or WAL amount written exactly from its base units in a `<data>` element (`value`, `symbol`, `exact`) |
| `UiCopyButton` | copies `value` and announces it politely; nothing is claimed when the clipboard is unavailable |
| `UiSkipLink` | "skip to content" pointing at `#main` (or `href`) |
| `UiStatusBar`, `UiStatusDot` | the console status bar (`network`, `healthy`, `epoch`, `lastRefresh`) and a health dot that is always paired with words |
| `UiActivityFeed`, `UiActivityItem` | a vertical event list; an item takes `type`, `time` and `datetime` (rendered as `<time>` when given) |
| `StatusWidget` | a compact link showing the platform's overall status, polled from `apiUrl`, claiming nothing until the first answer |
| `CopyrightLine`, `SidebarGroup` | the footer copyright and legal links (`organisationName`, `year`, `rightsStatement`, `symbolVariant`, `legalBase`); a labelled group of sidebar items (`level` 1 or 2) |

### Composables

| Composable | Purpose |
| --- | --- |
| `useColorMode(default?)` | the colour mode (`light`, `dark`, `system`), persisted; see above |
| `useSeason()` | applies the season (`data-season`) from the calendar |
| `useNow(intervalMs?)` | a ticking `Ref<number>` of the current time |
| `usePager(load, describeError?)` | cursor paging state for a list (`Pager`, `PageOf`) |
| `useStatusSnapshot({ url, intervalMs?, timeoutMs? })` | polls the platform status endpoint (at least every 15 s, only while the tab is visible) and renders exactly what it returns; an invalid response is an error, never "healthy" |
| `useStickyOffset(target, property)` | publishes the height of a sticky element as `--mw-header-offset` or `--mw-sticky-extra`, so focus and scroll never land behind it (WCAG 2.4.11) |

### Runtime endpoint configuration

A static app is built once and configured per deployment. `loadRuntimeConfig()` reads a same-origin `/runtime-config.json` that overrides
the **endpoints** of machine-facing services, and only those: `VITE_INDEXER_URL`, `VITE_WALRUS_RELAY_TESTNET` and `VITE_WALRUS_RELAY_MAINNET`
(`RUNTIME_ENDPOINT_KEYS`). Ids, fees and addresses, anything that moves money, stay build-time values. A missing, non-JSON or invalid file
(or an SPA fallback page served in its place; the read is capped at 16 KiB with a 3 s timeout) leaves the build-time values in force, and
unknown keys and invalid values are dropped. A value must be `https:` (`http:` only on localhost and 127.0.0.1) with no credentials,
query or fragment.

```js
// main.ts: load once, before the app's modules are imported
import { loadRuntimeConfig } from '@meddleware/ui'
await loadRuntimeConfig()
await import('./boot')

// config.ts: read every endpoint through withRuntimeEnv
import { withRuntimeEnv } from '@meddleware/ui'
export const INDEXER_URL = withRuntimeEnv(import.meta.env).VITE_INDEXER_URL || ''
```

## CSS utilities (`reset.css`)

Import `@meddleware/ui/reset.css` once to get element-level defaults (in the `mw.reset` cascade layer) and opt-in utility classes. Components bring their own CSS, imported with the component; `@meddleware/ui/base.css` (the reset plus every component) still works for the old single import.

| Class | Effect |
| --- | --- |
| `.mw-noise` | Applies `--noise-overlay` as a `::before` layer — controlled imperfection |
| `.mw-spinner` | Sigil-like ring loader animation (settles on `prefers-reduced-motion`) |
| `.mw-hand-drawn` | Empty positioned hook — drop an `<svg>` or `<canvas>` inside for bespoke illustration |
| `.mw-mono` | Monospace font via `--mw-font-mono` |
| `.mw-visually-hidden` | Text for assistive technology only |

All animations respect `prefers-reduced-motion`.
