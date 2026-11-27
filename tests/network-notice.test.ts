// Tests of the network sentence and the notice component that prints it.
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { networkSentence } from '../docs/.vitepress/theme/network'
import record from '../docs/.vitepress/network.json'

// The site says where the tools run in one place, from docs/.vitepress/network.json (written by `mw-network-status` from the deployment records and
// checked in CI). These tests hold the wording, and the component that prints it.
describe('networkSentence', () => {
  // Says mainnet is coming until every record has a mainnet deployment.
  it('says mainnet is coming until every record has a mainnet deployment', () => {
    for (const mainnet of ['coming', 'partial']) {
      expect(networkSentence({ testnet: { status: 'live' }, mainnet: { status: mainnet } })).toBe('Live on Sui testnet; mainnet is coming.')
    }
  })
  // Names mainnet only when it is live.
  it('names mainnet only when it is live', () => {
    expect(networkSentence({ testnet: { status: 'live' }, mainnet: { status: 'live' } })).toBe('Live on Sui testnet and mainnet.')
    expect(networkSentence({ testnet: { status: 'partial' }, mainnet: { status: 'live' } })).toBe('Live on Sui mainnet.')
  })
  // Does not claim a network the records lack.
  it('does not claim a network the records lack', () => {
    expect(networkSentence({})).toBe('Not live on any Sui network yet.')
    expect(networkSentence({ testnet: { status: 'coming' }, mainnet: { status: 'coming' } })).toBe('Not live on any Sui network yet.')
  })
  // Matches the committed records today.
  it('matches the committed records today', () => {
    expect(networkSentence(record)).toBe(record.mainnet.status === 'live' ? 'Live on Sui testnet and mainnet.' : 'Live on Sui testnet; mainnet is coming.')
  })
})

describe('NetworkNotice', () => {
  afterEach(() => vi.doUnmock('../docs/.vitepress/network.json'))

  /** Render the notice as it reads when the records say `mainnet` has this status. */
  async function render(mainnet: string): Promise<string> {
    vi.resetModules()
    vi.doMock('../docs/.vitepress/network.json', () => ({ default: { testnet: { status: 'live' }, mainnet: { status: mainnet } } }))
    const { default: NetworkNotice } = await import('../docs/.vitepress/theme/NetworkNotice.vue')
    return renderToString(createSSRApp(NetworkNotice))
  }

  // Prints the testnet-only sentence while mainnet is coming.
  it('prints the testnet-only sentence while mainnet is coming', async () => {
    expect(await render('coming')).toContain('Live on Sui testnet; mainnet is coming.')
  })
  // Prints both networks once mainnet is live.
  it('prints both networks once mainnet is live', async () => {
    expect(await render('live')).toContain('Live on Sui testnet and mainnet.')
  })
  // Renders a paragraph, not a heading or a div.
  it('renders a paragraph, not a heading or a div', async () => {
    expect(await render('coming')).toMatch(/^<p class="network-notice"><strong>/)
  })
})
