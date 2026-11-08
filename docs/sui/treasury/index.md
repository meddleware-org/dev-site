---
title: "Treasury for developers"
description: "How the Treasury console is built, what it reads, how it is configured and embedded, and how to read the same facts from code with the access-gate client."
---

# Treasury for developers

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/treasury/) | [On-chain objects, events and JSON shapes →](./data)

The Treasury console ([`treasury-ui`](https://github.com/meddleware-org/treasury-ui), `@meddleware/treasury-ui`) presents the platform
treasury as an accounting view over revenue streams. Today there is one stream: the commission collected by `access_gate` on every
paid pass, plus the activity of passes sold and used. It is **read-only** and holds no custody; the commission arithmetic and the
10% cap are enforced on-chain by the `access_gate` package, and the console only reads and renders. Tabs: **Overview** (balance,
commission rate, recent activity), **Accounts** (the treasury account and its revenue sources, the gates) and **Activity** (the
paginated pass log).

## Standalone and embedded

`treasury-ui` is both a single-page app and a library:

- **Standalone:** `src/main.ts` mounts `App.vue`, which is [`AppToolShell`](/design-system/components#app-tool-shell) (title `Treasury`,
  slug `treasury`) around `TreasuryView`.
- **Embedded:** `import { TreasuryView } from '@meddleware/treasury-ui'` renders the console inline, as the dashboard does, against a
  shared [`@meddleware/wallet-adapter`](/libraries/wallet-adapter) connection and network selector. The host provides the design tokens
  and the `@meddleware/ui` reset. `@meddleware/wallet-adapter` is a peer dependency (`>=0.0.22 <0.2.0`) so every embedded tool shares
  one connection.

## Configuration

| Setting | Source | Notes |
| --- | --- | --- |
| Network | wallet-adapter's `useNetwork().network` | the one source for the client, the ids, the explorer links and the status bar. The standalone build selects `VITE_NETWORK` (`testnet` or `mainnet`) with `selectBuiltNetwork`; an embedded view follows the host's selector |
| `access_gate` ids | `@meddleware/access-gate-client/deployments` for that network | never environment variables or literals. With no record for the network the console says the treasury is not available there and names the networks that have one |
| Read indexer | `VITE_INDEXER_URL` (optional) | for event history; display data only, falls back to the full node after 3 s. A deployment may override it at run time with `/runtime-config.json` |
| Footer links | `VITE_DOCS_URL`, `VITE_DEV_URL` | handed to `AppToolShell` |

## What it reads

Chain reads go through `@meddleware/access-gate-client` and a bare gRPC client (no wallet is needed to view anything); each fact is
read once and shared by every tab.

| Fact | Read |
| --- | --- |
| Treasury address and commission | `fetchPlatformConfig(client, platformConfigId, originalId)` → `{ treasury, commissionBps }`; shown as `commissionBps / 100` percent |
| Treasury balance | `client.core.getBalance({ owner: treasury, coinType: '0x2::sui::SUI' })` → `res.balance.balance`: the SUI in coin objects **plus** the address balance, so funds sent with `send_funds` are counted |
| Revenue sources (gates) | `fetchAdminCaps(client, treasury, originalId)`, then `fetchGate` for each; a gate that cannot be read is left out rather than failing the list |
| Activity | `listAccessGateEvents` with `kinds: ['AccessMinted', 'AccessConsumed']`, newest first, `limit` up to 100 per call and at most ten calls; an `AccessMinted` shows its `recipient`, an `AccessConsumed` its `consumer` |
| Epoch | `client.getCurrentSystemState()` for the status bar; failure is non-fatal |

See [On-chain objects, events and JSON shapes](./data) for the shapes behind these reads and why gates are found through
`AdminCap`s, not events.

## The same reads from code

```ts
import { fetchAdminCaps, fetchGate, fetchPlatformConfig, listAccessGateEvents } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

const d = accessGateDeployment('testnet') // throws where no deployment is recorded

const { treasury, commissionBps } = await fetchPlatformConfig(client, d.platformConfigId, d.originalId)

const { balance } = await client.core.getBalance({ owner: treasury, coinType: '0x2::sui::SUI' })
const mist = BigInt(balance.balance) // coin objects + address balance

const caps = await fetchAdminCaps(client, treasury, d.originalId) // [{ adminCapId, gateId }]
const gates = await Promise.allSettled(caps.map((c) => fetchGate(client, c.gateId, d.originalId)))

const page = await listAccessGateEvents(client, {
  originalId: d.originalId,
  kinds: ['AccessMinted', 'AccessConsumed'],
  limit: 50,
  indexer: { url: 'https://sui-indexer.meddleware.dev', network: 'testnet' }, // optional
})
console.log(commissionBps, mist, gates.length, page.events.length, page.indexedFromCheckpoint)
```

## Failure behaviour

A network with no `access_gate` deployment record is not a fault: the console reads "The treasury is not available on `<network>`.
Switch to `<the networks that have a record>`." (the records decide, never prose). Any other failed read says the treasury cannot be
read right now and writes the technical cause to the console once (`plainFailure`); a configured indexer that cannot be used still
lists events from the node and says only recent events are listed (the cause, `indexerError`, goes to the console).

## Develop

```bash
npm ci
npm run dev         # local dev server
npm test            # Vitest: the composables with the real client parsing objects, the shared chain context, the stub data
npm run build       # type-check + vite build
npm run build:e2e   # VITE_E2E=1 vite build --mode e2e: a mock wallet and a stub chain with data (a platform config, three gates, a large balance, an epoch, 26 events over two pages)
npm run test:e2e    # the Playwright accessibility sweep over the e2e build
```

`eslint.config.ts` ends with `suiBoundary()` from `@meddleware/eslint-config`, which forbids in `src/` (outside `src/wallet.ts`) value
imports of `@mysten/sui/grpc`, `/client` and `/transactions`, building transactions, and URL bindings that do not go through
`safeHref`, `safeIcon`, `suiExplorerUrl` or `walruscanBlobUrl`. Do not disable it: add the logic to the domain client instead.
