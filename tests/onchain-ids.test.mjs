import { describe, expect, it } from 'vitest'
import { checkSite } from '@meddleware/vitepress-theme/check-onchain-ids'

// The check itself (and its failure cases) is tested in @meddleware/vitepress-theme; this holds the site to it: the hand-written pages
// agree with the installed clients' testnet deployments and the three reference pages show the ids they must.
describe('the real pages against the clients\' deployments', () => {
  it('shows no stale or mistyped on-chain id', async () => {
    expect(await checkSite(new URL('..', import.meta.url).pathname)).toEqual([])
  })
})
