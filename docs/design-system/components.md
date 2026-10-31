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
| `variant` | `'dark' \| 'light' \| 'transparent'` | `'transparent'` | Colour scheme for the shell component (theme-independent — `'dark'` renders correctly on a light page) |
| `colors` | `PanelColors` | — | Per-instance override of any `--mw-panel-*` token |
| `docsUrl` | `string` | — | `AppFooter` only — "Documentation" link href |
| `devUrl` | `string` | — | `AppFooter` only — "Developer docs" link href |

Below 45em the sidebar becomes a drawer (the Popover API): give `AppSidebar` an `id` and pass it as `AppHeader`'s `sidebar-id`, and the header shows a menu button that opens it. `UiAppShell` is the page frame around them: a skip link, the header, an optional sidebar, `<main>` and the footer.

### Slots

`AppHeader` and `AppSidebar` expose named slots for custom content:

```vue
<AppHeader variant="dark">
  <template #logo><!-- custom logo --></template>
  <template #nav><!-- nav links --></template>
  <template #actions>
    <ColorModeControl v-model="mode" />
  </template>
</AppHeader>

<AppSidebar variant="light">
  <template #head><!-- sidebar header --></template>
  <template #default>
    <SidebarItem label="Overview" :active="true" />
    <SidebarItem label="Settings" />
  </template>
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
| `UiSelect` | native `<select>` attrs | Styled with scale tokens; `--focus-ring` on focus |
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
| `UiDialog` | The native `<dialog>`, dismissed by Escape and a click outside |

### Copy + link pattern

```vue
<CopyableAddress :address="addr">
  <ExplorerLink :href="suiExplorerUrl('account', addr, 'testnet')" :value="addr" />
</CopyableAddress>
```

### Explorer helper

```ts
import { suiExplorerUrl } from '@meddleware/ui'

const url = suiExplorerUrl('txblock', txDigest, 'testnet')
// → https://suiscan.xyz/testnet/tx/<txDigest>
```

Supported kinds: `'account'`, `'object'`, `'txblock'`. Network defaults to `'testnet'`.

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
