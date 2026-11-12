---
title: "vitepress-theme"
description: "The Meddleware VitePress theme and site configuration, and the build scripts both documentation sites share: on-chain page import, on-chain id check, llms-full.txt and the audit-free dist check."
---

# vitepress-theme

[`@meddleware/vitepress-theme`](https://www.npmjs.com/package/@meddleware/vitepress-theme) is the VitePress theme and site configuration
of the documentation sites (this one and docs.meddleware.co.uk). It is the default VitePress theme with every colour, surface and font
taken from [`@meddleware/design-tokens`](/design-system/tokens), so a site follows the colour mode and the seasons and keeps the tokens'
WCAG AAA contrast (7:1 for text and labels), plus a footer and the configuration the sites share.

Peers: `vitepress` (exactly `2.0.0-alpha.21`, because the theme patches two of its components), `vue`, `@meddleware/ui`,
`@meddleware/design-tokens` and, for `mw-check-onchain-ids`, `typescript`. It declares `engines.node >=24`.

## Use

```js
// docs/.vitepress/theme/index.ts
export { default } from '@meddleware/vitepress-theme'
```

```js
// docs/.vitepress/config.ts
import { baseConfig } from '@meddleware/vitepress-theme/config'

export default baseConfig({
  configUrl: import.meta.url, // docs/ is the source directory, ../dist the output
  title: 'Meddleware Dev',
  description: '…',
  nav: [{ text: 'Guide', link: '/guide' }],
  sidebar: { '/': [{ text: 'Guide', items: [{ text: 'Overview', link: '/' }] }] },
  // appearance: 'dark' (default) | true | false, head: [...], extra: { ...anything else VitePress takes }
})
```

A site that needs more extends the theme: `{ extends: MeddlewareTheme, enhanceApp({ app }) { … } }`; this site registers its
`NetworkNotice` component that way.

`baseConfig` sets the language (`en-GB`), clean URLs, the favicon set and web manifest of the company mark (from `@meddleware/ui/brand/*`; the site keeps no icon of its own, see [Brand mark and shared assets](/design-system/brand)), the browser-chrome colour (from the tokens), local search, the GitHub
link, the high-contrast syntax themes and `ssr.noExternal` for `@meddleware/*`, which ship Vue components that import their own CSS.
`themeConfig`, `vite` and `markdown` in `extra` are merged one level down.

| Part | What it does |
| --- | --- |
| `theme.css` | maps every `--vp-*` colour onto a token role; tone blocks and badges keep body-colour text with the tone as the border; nothing is purple; keeps a focused sidebar item out from under the navigation bar (`scroll-padding-block` on `.VPSidebar`, WCAG 2.4.11) |
| `MeddlewareLayout.vue` | the default layout plus the company mark (`BrandMark`) before the title in the navigation bar, and `AppFooter` and `CopyrightLine` (a `contentinfo` landmark) |
| `landmarks.js` | a Vite plugin that gives home, `page` and 404 pages a `<main>` and turns the mid-page doc footer into a `div`; exact edits that fail the build if VitePress changes |
| `index.ts` | imports the tokens, the seasons and `@meddleware/ui/reset.css`, and sets the season from the calendar |

## Site scripts

The build-time scripts are bins, run from the site's root (the directory with its `package.json`):

| Bin | What it does |
| --- | --- |
| `mw-gen-onchain` | imports the canonical on-chain docs of the Move packages (`access-gate-sui`, `sealed-storage-sui`, `token-issuance-template-sui`) into `docs/<outBase>` and writes `docs/.vitepress/generated/onchain-sidebar.json`. Reads the installed packages, or `ONCHAIN_DOCS_ROOT=<dir>` (sibling checkouts). A missing package writes a placeholder and still exits 0; a missing or malformed configuration exits 1 |
| `mw-check-onchain-ids` | exits 1 when a hand-written page carries a 32-byte `0x…` id that is not a current testnet id of `@meddleware/access-gate-client` or `@meddleware/sealed-storage-client` (or an allow-listed one), or a reference page lacks a required id. Fails closed: unreadable clients or configuration fail the check |
| `mw-gen-llms-full <site-url> "<title>"` | writes `dist/llms-full.txt` ([llmstxt.org](https://llmstxt.org/)): every published page's Markdown in one file; audit, `public/`, `.vitepress/` and generated `api` and `wire-api` pages are left out. Run after `vitepress build` |
| `mw-check-dist-no-audit [distDir]` | exits 1 when the built site contains an audit page. `findAuditPages` is exported as `@meddleware/vitepress-theme/check-dist-no-audit` |

`mw-gen-onchain` and `mw-check-onchain-ids` read a `"meddleware"` section of the site's `package.json`; this site's is:

```json
"meddleware": {
  "kind": "app",
  "csp": "docs",
  "lhci": true,
  "site": {
    "id": "dev",
    "outBase": "sui/onchain",
    "otherSite": { "id": "docs", "origin": "https://docs.meddleware.co.uk", "base": "blockchain/sui/onchain" }
  },
  "onchainIds": {
    "required": { "sui/index.md": ["accessGate.originalId", "accessGate.platformConfigId", "accessGate.publishedAt", "sealPolicies.originalId", "sealPolicies.policyConfigId"] },
    "otherIds": [{ "id": "0x…64 lower-case hex digits", "reason": "why this is not a deployment" }]
  }
}
```

- `site.id` is this site's id in the on-chain manifests' `sites` lists (each package's `docs/onchain/manifest.json` assigns pages to `docs`,
  `dev` or both); `outBase` is the subtree under `docs/` the imported pages go in, and the one `mw-check-onchain-ids` does not scan;
  `otherSite` is where pages this site leaves out are linked.
- `required` names ids by their dotted path in the clients' testnet deployments (`accessGate.originalId`, `sealPolicies.policyConfigId`, …)
  and must name at least one page. `otherIds` allows ids that are not package deployments, each with its reason (this site lists the Seal
  key servers). `skipDirs` (optional) names directories skipped at any depth besides `node_modules`, `.vitepress` and `audit`.

The `kind`, `csp` and `lhci` entries belong to `mw-sync` in [frontend-config](./frontend-config#mw-sync).

## Development

`npm run build:site` builds the fixture site in `docs/`; `npm run test:e2e` runs axe (WCAG 2.2 AA and AAA) over it in every colour mode ×
season (`E2E_BROWSERS=all` for five browsers); `npm run shots` captures the screenshot matrix.
