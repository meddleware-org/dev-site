import type { DefaultTheme } from 'vitepress'
import { baseConfig } from '@meddleware/vitepress-theme/config'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

// Developer documentation for the Meddleware platform. Integration guides, design-system usage,
// self-host runbooks, and Sui development patterns. User-facing product docs live at docs.meddleware.co.uk.
// Output is pinned to the repo-root dist/ so the Dockerfile's `COPY --from=build /app/dist` works unchanged.

// Sidebar groups for the canonical on-chain docs imported from the Sui Move package repos by
// scripts/gen-onchain.mjs (generated, git-ignored). Absent (e.g. `vitepress dev` without the
// prebuild step) → no on-chain groups; the rest of the site is unaffected.
const onchainSidebarFile = fileURLToPath(new URL('./generated/onchain-sidebar.json', import.meta.url))
const onchainSidebar: DefaultTheme.SidebarItem[] = existsSync(onchainSidebarFile)
  ? JSON.parse(readFileSync(onchainSidebarFile, 'utf8'))
  : []

const nav: DefaultTheme.NavItem[] = [
  {
    text: 'Web',
    items: [
      { text: 'Getting started', link: '/getting-started/' },
      { text: 'Design system', link: '/design-system/' },
    ],
  },
  {
    text: 'Blockchain',
    items: [
      { text: 'Active', items: [{ text: 'Sui', link: '/sui/' }] },
      { text: 'Coming soon', items: [{ text: 'More blockchains', link: '/blockchain/' }] },
    ],
  },
  { text: 'API reference', link: 'https://docs.meddleware.co.uk/blockchain/sui/' },
  // TODO white-label: { text: 'Operator guides', link: '/operator/' }
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
  '/sui/': [
    {
      text: 'Sui',
      items: [
        { text: 'Overview', link: '/sui/' },
        { text: 'Environment setup', link: '/sui/environment' },
        { text: 'PTB patterns', link: '/sui/ptb-patterns' },
      ],
    },
    {
      text: 'Walrus Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/walrus-storage/' },
        { text: 'Integration guide', link: '/sui/walrus-storage/integration' },
        { text: 'Self-host a relay', link: '/sui/walrus-storage/relay-self-host' },
        // TODO white-label: { text: 'White-label operator guide', link: '/sui/walrus-storage/operator' }
      ],
    },
    {
      text: 'Sealed Storage',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/sealed-storage/' },
        { text: 'Integration guide', link: '/sui/sealed-storage/integration' },
        { text: 'Writing policies', link: '/sui/sealed-storage/policies' },
        // TODO white-label: { text: 'White-label operator guide', link: '/sui/sealed-storage/operator' }
      ],
    },
    {
      text: 'Access Gate',
      collapsed: true,
      items: [
        { text: 'SDK setup', link: '/sui/access-gate/' },
        { text: 'Integration guide', link: '/sui/access-gate/integration' },
        { text: 'Deploy the gateway', link: '/sui/access-gate/gateway' },
        // TODO white-label: { text: 'White-label operator guide', link: '/sui/access-gate/operator' }
      ],
    },
    // TODO: DAO — governance patterns parked in drafts/dao-governance.md until governance
    // returns: { text: 'DAO', collapsed: true, items: [{ text: 'Governance patterns', link: '/sui/dao/' }] }
    // Canonical on-chain docs (generated from the Move packages — scripts/gen-onchain.mjs).
    ...onchainSidebar,
  ],
}

// The site's language, URLs, colours, search, syntax themes and build settings are the shared VitePress config; `docs/` is the source
// directory and the repo-root `dist/` the output (the Dockerfile copies it into the static server).
export default baseConfig({
  configUrl: import.meta.url,
  title: 'Meddleware Dev',
  description:
    'Integration guides, design system usage, and Sui development patterns for the Meddleware platform.',
  nav,
  sidebar,
})
