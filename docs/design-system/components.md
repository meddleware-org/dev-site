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
