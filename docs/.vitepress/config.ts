// VitePress configuration of the developer documentation site: the navigation, the sidebars and the shared base configuration. Output is pinned to the repo-root dist/ so the Dockerfile's
// `COPY --from=build /app/dist` works unchanged. User-facing product docs live at docs.meddleware.co.uk. Related: docs/.vitepress/theme/ (the theme).
// The VitePress theme types, for the navigation and the sidebar.
import type { DefaultTheme } from 'vitepress'
// The shared VitePress configuration: language, colours, search, syntax themes and build settings.
import { baseConfig } from '@meddleware/vitepress-theme/config'
// Turns a module URL into a file path.
import { fileURLToPath } from 'node:url'
// Reads the generated sidebar, if it exists.
import { existsSync, readFileSync } from 'node:fs'

// Developer documentation for the Meddleware platform: SDK and integration guides, self-hosting runbooks, shared libraries, design-system
// usage and Sui development patterns. User-facing product docs live at docs.meddleware.co.uk.
// Output is pinned to the repo-root dist/ so the Dockerfile's `COPY --from=build /app/dist` works unchanged.

// Sidebar groups for the canonical on-chain docs imported from the Sui Move package repos by
// mw-gen-onchain (generated, git-ignored). Absent (e.g. `vitepress dev` without the
// prebuild step) → no on-chain groups; the rest of the site is unaffected.
// The sidebar groups `mw-gen-onchain` writes.
const onchainSidebarFile = fileURLToPath(new URL('./generated/onchain-sidebar.json', import.meta.url))
// The groups, or none when the generated file is absent (a dev run without the prebuild step).
const onchainSidebar: DefaultTheme.SidebarItem[] = existsSync(onchainSidebarFile)
  ? JSON.parse(readFileSync(onchainSidebarFile, 'utf8'))
  : []

// The top navigation: getting started, the platform, Sui, the libraries, the design system, the API reference and the user documentation.
const nav: DefaultTheme.NavItem[] = [
    // The toolchain and local development come first.
  { text: 'Getting started', link: '/getting-started/' },
  // The platform as a whole, whatever tools it holds: the standards it speaks (kept true change by change).
    // How the platform fits together, and the standards it speaks.
  { text: 'Platform', items: [{ text: 'How it fits together', link: '/platform/' }, { text: 'Standards we use', link: '/platform/standards' }] },
  {
    text: 'Sui',
    items: [
      { text: 'Overview', link: '/sui/' },
      { text: 'Walrus Storage', link: '/sui/walrus-storage/' },
      { text: 'Sealed Storage', link: '/sui/sealed-storage/' },
      { text: 'Access Gate', link: '/sui/access-gate/' },
      { text: 'Token Issuance', link: '/sui/token-issuance/' },
      { text: 'Treasury', link: '/sui/treasury/' },
        // The read-only chain index.
      { text: 'Read indexer', link: '/sui/indexer' },
    ],
  },
    // The shared libraries and the design system.
  { text: 'Libraries', link: '/libraries/' },
  { text: 'Design system', link: '/design-system/' },
  {
      // The generated API reference lives on the user documentation site.
    text: 'API reference',
    items: [
      { text: 'Walrus client', link: 'https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/api/' },
      { text: 'Seal client', link: 'https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/api/' },
      { text: 'Access-gate client', link: 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/api/' },
      { text: 'Gateway wire protocol', link: 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/wire-api/' },
    ],
  },
    // The user documentation is a separate site.
  { text: 'User docs', link: 'https://docs.meddleware.co.uk' },
]

// The sidebars, one per section.
const sidebar: DefaultTheme.Sidebar = {
  // How the platform fits together and the standards it speaks.
  '/platform/': [
    {
      text: 'Platform',
      items: [
        { text: 'How it fits together', link: '/platform/' },
        { text: 'Standards we use', link: '/platform/standards' },
      ],
    },
  ],
  // The toolchain and local development.
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
  // The tokens, the components and the brand mark.
  '/design-system/': [
    {
      text: 'Design system',
      items: [
        { text: 'Overview', link: '/design-system/' },
        { text: 'Design tokens', link: '/design-system/tokens' },
        { text: 'Components', link: '/design-system/components' },
        { text: 'Brand mark and shared assets', link: '/design-system/brand' },
      ],
    },
  ],
  // The shared libraries.
  '/libraries/': [
    // The shared libraries.
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
  // Sui development: setup, patterns and one group per tool.
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
    // The Walrus storage SDK, integration and relay.
    {
      text: 'Walrus Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/walrus-storage/' },
        { text: 'Integration guide', link: '/sui/walrus-storage/integration' },
        { text: 'Self-host a relay', link: '/sui/walrus-storage/relay-self-host' },
      ],
    },
    // The sealed storage SDK, integration and policies.
    {
      text: 'Sealed Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/sealed-storage/' },
        { text: 'Integration guide', link: '/sui/sealed-storage/integration' },
        { text: 'Writing policies', link: '/sui/sealed-storage/policies' },
      ],
    },
    // The access gate SDK, integration and gateway.
    {
      text: 'Access Gate',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/access-gate/' },
        { text: 'Integration guide', link: '/sui/access-gate/integration' },
        { text: 'Deploy the gateway', link: '/sui/access-gate/gateway' },
      ],
    },
    // The token issuance SDK, template and deploy flow.
    {
      text: 'Token Issuance',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/token-issuance/' },
        { text: 'Template and patcher', link: '/sui/token-issuance/template' },
        { text: 'Deploy flow', link: '/sui/token-issuance/deploy' },
      ],
    },
    // The treasury's developer pages.
    {
      text: 'Treasury',
      collapsed: true,
      items: [
        { text: 'For developers', link: '/sui/treasury/' },
        { text: 'On-chain data', link: '/sui/treasury/data' },
      ],
    },
    // Canonical on-chain docs (generated from the Move packages by mw-gen-onchain).
    // The generated on-chain groups come last.
    ...onchainSidebar,
  ],
}

// The site's language, URLs, colours, search, syntax themes and build settings are the shared VitePress config; `docs/` is the source
// directory and the repo-root `dist/` the output (the Dockerfile copies it into the static server).
// The site: the shared configuration with this site's title, description, footer link, navigation and sidebar.
export default baseConfig({
  configUrl: import.meta.url,
    // The site's name and description.
  title: 'Meddleware for developers',
  description: "Build with Meddleware's open tools, plug into the standards they speak, and run your own copy.",
    // Meddleware's own funds, in public.
  footerLinks: [{ text: 'Treasury', link: 'https://treasury.meddleware.co.uk' }],
  nav,
  sidebar,
})
