---
title: "Environment setup"
description: "Configure the Sui CLI networks, addresses and faucet, run a localnet, publish a package, and create a gRPC client for the SDKs."
---

# Environment setup

## Active network

The Sui CLI stores network configuration in `~/.sui/sui_config/client.yaml`. To switch networks:

```bash
sui client switch --env testnet
sui client envs   # list all configured environments
```

## Active address

```bash
sui client active-address   # show the current active address
sui client addresses         # list all known addresses
sui client switch --address <ADDRESS>
```

## Gas and the testnet faucet

Fund a testnet address from the faucet:

```bash
# Via CLI
sui client faucet --address <ADDRESS>

# Or navigate to https://faucet.sui.io/ and paste the address
```

Check balance:

```bash
sui client balance
```

## Localnet

For contract development and integration testing, a local network is the fastest iteration loop:

```bash
# Start a local network with a built-in faucet
sui start --with-faucet
# → Fullnode: http://127.0.0.1:9000
# → Faucet: http://127.0.0.1:9123

# Add the localnet environment (first time only)
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet

# Fund the active address from the local faucet
sui client faucet
```

### Publishing packages to localnet

Clone the package you need (for example `access_gate`) and publish it with `test-publish`. Since Sui CLI 1.80 (the repositories use
1.81), `sui client publish` only runs against environments declared in the package's `Move.toml`; `test-publish` publishes to any
environment and resolves dependencies to ephemeral addresses:

```bash
git clone https://github.com/meddleware-org/access-gate-sui.git
cd access-gate-sui
sui move test --build-env testnet          # hermetic unit tests
sui client test-publish --build-env localnet --gas-budget 200000000
```

Keep the published package ID and the created object IDs (for `access_gate`: `PlatformConfig`) —
you pass them to the SDK. `test-publish` records the localnet pin in `Move.lock`; discard that change
(`git checkout -- Move.lock`) rather than committing it. The packages' own `scripts/publish.sh`
wrap this with safety checks and write the IDs to an env file.

## TypeScript SDK — network configuration

`@mysten/sui` v2 talks to fullnodes over gRPC (gRPC-web in the browser) with `SuiGrpcClient`:

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'

type Network = 'localnet' | 'testnet' | 'mainnet'
const network = (import.meta.env.VITE_NETWORK ?? 'testnet') as Network

const BASE_URLS: Record<Network, string> = {
  localnet: 'http://127.0.0.1:9000',
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
}

const client = new SuiGrpcClient({ network, baseUrl: BASE_URLS[network] })

// Reads go through the shared Core API — the same on the gRPC and GraphQL clients.
const { object } = await client.core.getObject({ objectId, include: { json: true } })
```

Every Meddleware SDK accepts a client with this Core API (`ClientWithCoreApi`); in a Vue app,
[`@meddleware/wallet-adapter`](/libraries/wallet-adapter)'s `getSuiClient(network, url)` returns a shared instance and `rpcUrlFor(network)`
the public endpoint for a network.

| Network | Public gRPC endpoint | Chain identifier (first four bytes of the genesis digest) |
| --- | --- | --- |
| `testnet` | `https://fullnode.testnet.sui.io:443` | `4c78adac` |
| `mainnet` | `https://fullnode.mainnet.sui.io:443` | `35834a8a` |
| `localnet` | `http://127.0.0.1:9000` | changes with every `--force-regenesis` |

The wallet adapter reads the chain identifier of the node once and refuses to sign when it does not match the selected network.

::: warning JSON-RPC is gone
Public fullnodes stopped serving JSON-RPC in September 2026. `SuiClient` / `getFullnodeUrl` from
`@mysten/sui/client` no longer exist in v2. gRPC renders Move struct fields flat under `json`, and
may render framework addresses in long form (`0x000…0002::coin::Coin`) — compare types tolerantly.
:::

## Useful CLI commands

```bash
# Object details
sui client object <OBJECT_ID>

# Call a Move function
sui client call \
  --package <PACKAGE_ID> \
  --module <MODULE> \
  --function <FUNCTION> \
  --args <ARG1> <ARG2> \
  --gas-budget 10000000

# Build and run an ad-hoc PTB from the shell
sui client ptb --move-call <PACKAGE_ID>::<MODULE>::<FUNCTION> <ARG1> <ARG2>
```

Events are not queryable from the CLI. Read them from a transaction (`include: { events: true }`), list them with the Core API's
`client.core.listEvents` (which `listAccessGateEvents` and `listSealedContent` wrap, with BCS decoding), or use the
[read indexer](./indexer) for history. Public fullnodes keep only a short window of events and transactions (about 5½ days on testnet
when measured on 2026-10-08), so a system that needs a reliable list must read live object state instead of replaying a creation event.
