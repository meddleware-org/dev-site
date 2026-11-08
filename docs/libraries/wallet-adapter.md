---
title: "wallet-adapter"
description: "The shared Sui wallet adapter for Vue 3 apps: the module-singleton useWallet, the network selector, the executor, createToolWallet, the components and the testing entry."
---

# wallet-adapter

[`@meddleware/wallet-adapter`](https://www.npmjs.com/package/@meddleware/wallet-adapter) is a module-singleton composable built on
`@mysten/wallet-standard`, so every tool view rendered in one window shares **one wallet connection and one network selection**. It
ships TypeScript and `.vue` source (no build step) and is network-agnostic and wallet-agnostic: the caller passes the RPC URL, and any
wallet-standard extension works.

```bash
npm install @meddleware/wallet-adapter
```

Peer dependencies: `@mysten/sui` (`^2.33.1`), `@mysten/wallet-standard` (`>=0.21.0 <0.22`), `vue` (`^3.5.0`), `@meddleware/ui` and
`@meddleware/design-tokens` (the components use them). It depends on `@meddleware/web-utils`. Two entries: `.` and `./testing`.

## `useWallet`

```ts
import { useWallet } from '@meddleware/wallet-adapter'

const { wallets, currentWallet, account, connecting, error, connect, disconnect, signPersonalMessage, buildExecutor, getSuiClient } =
  useWallet({ requiredFeatures: ['sui:signTransaction'] })

if (wallets.value[0]) await connect(wallets.value[0])

const exec = await buildExecutor('testnet', 'https://fullnode.testnet.sui.io:443')
const { digest } = await exec.signAndExecute(tx)  // throws if the transaction failed on-chain
await exec.waitForTransaction(digest)             // signAndExecute does not wait for indexing: wait before dependent reads

const client = getSuiClient('testnet', 'https://fullnode.testnet.sui.io:443') // memoised per network and URL
```

| Member | Notes |
| --- | --- |
| `wallets` | the wallets that can connect (`standard:connect`); `requiredFeatures` filters **this caller's** list only (another caller still sees every connectable wallet), and each operation is also feature-guarded at call time |
| `currentWallet`, `account`, `connecting`, `error` | readonly reactive connection state |
| `connect(wallet)`, `disconnect()` | one connection attempt at a time; a wallet that rejects its own disconnect never becomes an unhandled rejection |
| `signPersonalMessage(message: Uint8Array)` | resolves `{ signature }` (base64). It takes the **bytes directly**, so it can be passed as the `sign` callback of the gateway and Seal helpers: `sign: (message) => signPersonalMessage(message)` |
| `buildExecutor(network, rpcUrl, { client? })` | an `Executor` bound to the connected account |
| `getSuiClient(network, rpcUrl)` | the memoised `SuiGrpcClient`; the URL must be `https` (`http` only for localhost and 127.0.0.1) |

### The executor

<!-- sample: skip — a type sketch of the exported Executor interface -->

```ts
interface Executor {
  address: string
  signAndExecute(tx: Transaction): Promise<{ digest: string }>                       // throws on an on-chain failure
  signAndExecute<I extends TransactionInclude>(tx: Transaction, opts: { include: I }): Promise<ExecutedTransaction<I>>
  waitForTransaction(digest: string): Promise<unknown>
}
// ExecutedTransaction: { digest, success, result }: it does NOT throw on an on-chain failure, so check `success`
```

Before signing, `buildExecutor` checks that the wallet can sign transactions, that the connected account lists `sui:<network>`, and
(once per network and URL) that the node's chain identifier matches the network (`testnet` `4c78adac`, `mainnet` `35834a8a`); an executor
also refuses to sign after the network was switched since it was built. Execution returns once the node has the transaction, not once
it is indexed.

## The network selector

```ts
import { useNetwork, rpcUrlFor, selectBuiltNetwork, MW_NETWORKS } from '@meddleware/wallet-adapter'

const { network, rpcUrl, explorerNetwork, localnetRpc, setNetwork, setLocalnetRpc } = useNetwork()

setNetwork('mainnet')                    // 'testnet' | 'mainnet' | 'localnet'; anything else throws
setLocalnetRpc('http://127.0.0.1:9000')  // only http://localhost or http://127.0.0.1
rpcUrlFor('testnet')                     // the one table of endpoints, for a network other than the selected one
selectBuiltNetwork(import.meta.env.VITE_NETWORK) // a standalone build selects its own network
```

- `network` and `rpcUrl` are readonly; the choice (and the localnet URL) persists in `localStorage` (`mw:network`, `mw:localnet-rpc`)
  and storage failures never break the app.
- `explorerNetwork` is `'mainnet'` when mainnet is selected and `'testnet'` otherwise (the explorer has no localnet, and nothing of ours
  is deployed there), the value the explorer-link helpers of `@meddleware/ui` take.
- `selectBuiltNetwork(built)` selects `built` when it is `testnet` or `mainnet` and ignores anything else (unset, a typo), so a stored
  choice survives. Embedded in the dashboard, the host's selector rules and this is not called.
- Switching network invalidates executors built earlier.

## `createToolWallet`

A tool declares only what it needs; the connection and network stay shared by every tool in the window:

```js
// src/wallet.ts of a tool
import { createToolWallet } from '@meddleware/wallet-adapter'

export const { useWallet, getSuiClient, buildExecutor, signAndExecute, signPersonalMessage } = createToolWallet({
  requiredFeatures: ['sui:signTransaction'], // only wallets that can sign transactions are offered to THIS tool
})
```

`useWallet()` of a tool returns the connection state plus `signPersonalMessage`, `signAndExecute`, `getSuiClient()` and
`buildExecutor()`, all bound to the network selected **at the time of the call**.

## Components

| Component | Props | Notes |
| --- | --- | --- |
| `WalletModal` | `label` (default "Connect wallet"), `block`, `requiredFeatures` | a trigger button that opens the picker in a native dialog; attributes are forwarded to the trigger |
| `WalletGuard` | `message`, `requiredFeatures` | renders its default slot when a wallet is connected, otherwise a splash with the connect button |
| `WalletSelector` | `wallets` | the picker list (duplicate names are disambiguated) |

## Testing entry

`@meddleware/wallet-adapter/testing` is for component tests, end-to-end builds and screenshots; an app imports it only from its e2e
entry, behind a build flag, so every other build drops it (`check-prod-bundle` from
[frontend-config](./frontend-config#build-and-test-configuration) fails a production bundle that carries it).

```ts
if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1') {
  const { installE2eWallet } = await import('@meddleware/wallet-adapter/testing')
  installE2eWallet()
}
```

| Export | What it is |
| --- | --- |
| `installE2eWallet(options?)` | the mock wallet registered with wallet-standard (so the app's own discovery and connect flow run), a stub client for each network, and `window` hooks for a test (`__e2eAddress`, `__registerMockWallet`, `__unregisterMockWallet`). Uses the Node signer a Playwright test exposed with `exposeSigner` |
| `createMockWallet(options)`, `installMockWallet(options)` | a wallet-standard wallet (name, address, chains, features, a `delegate` that signs for real, `rejectConnect`); `installMockWallet` registers it |
| `createStubClient({ executed, owned, balances, objects })` | a stand-in for the gRPC client: execute, wait, list owned objects, balances and read objects by id |
| `okTransaction(digest, extra?)` | a success result in the client's shape |
| `setSuiClientOverride(network, client)`, `MOCK_ADDRESS` | replace the client `getSuiClient` returns for a network (exported only here, not from the production entry) |

## Tests

`npm test` is hermetic. `GRPC_TESTNET=1 npm run test:integration` reads a real full node (the chain identifiers the executor checks and
the execution path `buildExecutor` uses, signing with a throwaway key); fund the key from the faucet and pass it as
`WALLET_ADAPTER_FUNDED_KEY`, or run against a local network.
