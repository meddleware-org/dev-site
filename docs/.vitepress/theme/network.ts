// Where the tools run, in one sentence, from docs/.vitepress/network.json. `mw-network-status` writes that file from the deployment
// records of the installed clients and CI checks it (`npm run check:network`), so the sentence changes when the records do and never
// by editing a page. Same wording as the landing page.

/** The part of the file this reads: each network's status (`live`, `partial` or `coming`). */
export interface NetworkRecord {
  testnet?: { status?: string }
  mainnet?: { status?: string }
}

/** True once every tool has a deployment record on the network. */
const isLive = (net: { status?: string } | undefined): boolean => net?.status === 'live'

/** The one sentence the site uses for where the tools run. A network that is only partly deployed counts as not live yet. */
export function networkSentence(record: NetworkRecord): string {
  // Whether each network is live.
  const testnet = isLive(record.testnet)
  const mainnet = isLive(record.mainnet)
  // Both.
  if (testnet && mainnet) return 'Live on Sui testnet and mainnet.'
  // Testnet only.
  if (testnet) return 'Live on Sui testnet; mainnet is coming.'
  // Mainnet only (a partly deployed testnet counts as not live).
  if (mainnet) return 'Live on Sui mainnet.'
  // Neither.
  return 'Not live on any Sui network yet.'
}
