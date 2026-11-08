import type { DefaultTheme } from 'vitepress'
import { baseConfig } from '@meddleware/vitepress-theme/config'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

// Developer documentation for the Meddleware platform: SDK and integration guides, self-hosting runbooks, shared libraries, design-system
// usage and Sui development patterns. User-facing product docs live at docs.meddleware.co.uk.
// Output is pinned to the repo-root dist/ so the Dockerfile's `COPY --from=build /app/dist` works unchanged.

// Sidebar groups for the canonical on-chain docs imported from the Sui Move package repos by
// mw-gen-onchain (generated, git-ignored). Absent (e.g. `vitepress dev` without the
// prebuild step) → no on-chain groups; the rest of the site is unaffected.
const onchainSidebarFile = fileURLToPath(new URL('./generated/onchain-sidebar.json', import.meta.url))
const onchainSidebar: DefaultTheme.SidebarItem[] = existsSync(onchainSidebarFile)
  ? JSON.parse(readFileSync(onchainSidebarFile, 'utf8'))
  : []

const nav: DefaultTheme.NavItem[] = [
  { text: 'Getting started', link: '/getting-started/' },
  {
    text: 'Sui',
    items: [
      { text: 'Overview', link: '/sui/' },
      { text: 'Walrus Storage', link: '/sui/walrus-storage/' },
      { text: 'Sealed Storage', link: '/sui/sealed-storage/' },
      { text: 'Access Gate', link: '/sui/access-gate/' },
      { text: 'Token Issuance', link: '/sui/token-issuance/' },
      { text: 'Treasury', link: '/sui/treasury/' },
      { text: 'Read indexer', link: '/sui/indexer' },
    ],
  },
  { text: 'Libraries', link: '/libraries/' },
  { text: 'Design system', link: '/design-system/' },
  {
    text: 'API reference',
    items: [
      { text: 'Walrus client', link: 'https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/api/' },
      { text: 'Seal client', link: 'https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/api/' },
      { text: 'Access-gate client', link: 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/api/' },
      { text: 'Gateway wire protocol', link: 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/wire-api/' },
    ],
  },
  { text: 'User docs', link: 'https://docs.meddleware.co.uk' },
]

const sidebar: DefaultTheme.Sidebar = {
  '/getting-started/': [
    {
      text: 'Getting started',
      items: [
        { text: 'Overview', link: '/getting-started/' },
        { text: 'Toolchain', link: '/getting-started/toolchain' },
        { text: 'Local development', link: '/getting-started/local-dev' },
      ],
    },
  ],
  '/design-system/': [
    {
      text: 'Design system',
      items: [
        { text: 'Overview', link: '/design-system/' },
        { text: 'Design tokens', link: '/design-system/tokens' },
        { text: 'Components', link: '/design-system/components' },
      ],
    },
  ],
  '/libraries/': [
    {
      text: 'Libraries',
      items: [
        { text: 'Overview', link: '/libraries/' },
        { text: 'wallet-adapter', link: '/libraries/wallet-adapter' },
        { text: 'web-utils', link: '/libraries/web-utils' },
        { text: 'frontend-config', link: '/libraries/frontend-config' },
        { text: 'walrus-storage-kit', link: '/libraries/walrus-storage-kit' },
        { text: 'vitepress-theme', link: '/libraries/vitepress-theme' },
      ],
    },
  ],
  '/sui/': [
    {
      text: 'Sui',
      items: [
        { text: 'Overview', link: '/sui/' },
        { text: 'Environment setup', link: '/sui/environment' },
        { text: 'PTB patterns', link: '/sui/ptb-patterns' },
        { text: 'Read indexer', link: '/sui/indexer' },
      ],
    },
    {
      text: 'Walrus Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/walrus-storage/' },
        { text: 'Integration guide', link: '/sui/walrus-storage/integration' },
        { text: 'Self-host a relay', link: '/sui/walrus-storage/relay-self-host' },
      ],
    },
    {
      text: 'Sealed Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/sealed-storage/' },
        { text: 'Integration guide', link: '/sui/sealed-storage/integration' },
        { text: 'Writing policies', link: '/sui/sealed-storage/policies' },
      ],
    },
    {
      text: 'Access Gate',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/access-gate/' },
        { text: 'Integration guide', link: '/sui/access-gate/integration' },
        { text: 'Deploy the gateway', link: '/sui/access-gate/gateway' },
      ],
    },
    {
      text: 'Token Issuance',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/token-issuance/' },
        { text: 'Template and patcher', link: '/sui/token-issuance/template' },
        { text: 'Deploy flow', link: '/sui/token-issuance/deploy' },
      ],
    },
    {
      text: 'Treasury',
      collapsed: true,
      items: [
        { text: 'For developers', link: '/sui/treasury/' },
        { text: 'On-chain data', link: '/sui/treasury/data' },
      ],
    },
    // Canonical on-chain docs (generated from the Move packages by mw-gen-onchain).
    ...onchainSidebar,
  ],
}

// The site's language, URLs, colours, search, syntax themes and build settings are the shared VitePress config; `docs/` is the source
// directory and the repo-root `dist/` the output (the Dockerfile copies it into the static server).
export default baseConfig({
  configUrl: import.meta.url,
  title: 'Meddleware Dev',
  description:
    'SDKs, integration guides, self-hosting runbooks, shared libraries and the design system for developers building on the Meddleware platform on Sui and Walrus.',
  nav,
  sidebar,
})
