# Sui development

Guides for building on Meddleware's Sui Move packages, TypeScript SDKs and hosted services.

## In this section

| Topic | Description |
| --- | --- |
| [Environment setup](./environment) | CLI networks, addresses, faucet, localnet, SDK client |
| [PTB patterns](./ptb-patterns) | Building, simulating and executing transactions; handling aborts |
| [Walrus Storage](./walrus-storage/) | Upload and manage Walrus blobs; the NFT-gated upload relay |
| [Sealed Storage](./sealed-storage/) | Encrypt to on-chain Seal policies; store ciphertext on Walrus |
| [Access Gate](./access-gate/) | Sell and verify NFT access passes; deploy the access-gate gateway |

## Contract layout

Each Move package lives in its own repository under
[github.com/meddleware-org](https://github.com/meddleware-org). Its on-chain reference (objects,
functions, events, abort codes) is maintained with the package and imported into this site.

| Repository | Move package | Modules | Depends on | On-chain docs |
| --- | --- | --- | --- | --- |
| [`access-gate-sui`](https://github.com/meddleware-org/access-gate-sui) | `access_gate` | `access_gate` — gates, passes (`AccessNFT` / `SoulboundAccessNFT`), purchase with platform commission, single-use `consume`, gate policies | Sui framework only | [overview](/sui/onchain/access-gate/overview) · [dev guide](/sui/onchain/access-gate/dev-guide) · [API](/sui/onchain/access-gate/api-reference) |
| [`sealed-storage-sui`](https://github.com/meddleware-org/sealed-storage-sui) | `sealed_storage` | `nft_gate` and `timelock` (Seal `seal_approve*` policies); `sealed_content` (discovery registry, not a policy) | `access_gate` (git, commit-pinned) | [overview](/sui/onchain/sealed-storage/overview) · [dev guide](/sui/onchain/sealed-storage/dev-guide) · [API](/sui/onchain/sealed-storage/api-reference) |
| [`token-issuance-template-sui`](https://github.com/meddleware-org/token-issuance-template-sui) | `sui_token_template` | `sui_token_template` — one coin per publish via the coin registry | Sui framework only | [overview](/sui/onchain/token-issuance/overview) · [dev guide](/sui/onchain/token-issuance/dev-guide) · [API](/sui/onchain/token-issuance/api-reference) |

```text
access_gate            ← passes, gates, commission (PlatformConfig)
   ▲
   └── sealed_storage   ← nft_gate reads a Gate + pass; timelock reads Clock 0x6

sui_token_template     ← not a shared deployment: each token is its own package,
                         published from the user's wallet by the token issuance
```

### Testnet deployments

| Package | Original ID (types, events) | Published at (call targets) | Shared objects |
| --- | --- | --- | --- |
| `access_gate` | `0xd7ddaa94b74330979b2b618fc81206d160a264f1c9ca148a77fa2144301388c9` | same (v1) | `PlatformConfig` `0x3f81489df58233d96798f34ad44de325e1b4df7e4d615affe72ca181969ee7b5` |
| `sealed_storage` | `0x0c8f73490b14836e6a7a724fb46b242cb061d04a5f193fd637159997f8a1773d` | same (v1) | `PolicyConfig` `0xee0403ba15c250223527150d147f29bedfb1ec46bb2282c341be462ff0ad7d1a` |

Type strings, event filters and Seal identities use the original ID; Move calls use the latest
published-at. Every gated call also passes the package's shared version object (`PlatformConfig`,
`PolicyConfig`): it names the only package version allowed to act, so an upgrade can retire old code
everywhere at once. All of these are exported by the client packages
(`@meddleware/access-gate-client/deployments`, `@meddleware/sealed-storage-client/deployments`), generated from
each package's `Published.toml` and `deployments.json`.

Mainnet: not yet published. A compatible upgrade keeps the original ID, so existing gates, passes and
ciphertexts stay valid and only the call target moves; the upgrade then calls `migrate` on the version
object. A
breaking change is a new package with a new original ID; what was created on the old one stays bound
to it.

Superseded testnet packages (`access_gate` `0x1a81ca…` and `0x0bedd0…`, `sealed_storage` `0x42cc18…`
and `0x9f0563…`, replaced on 2026-10-02 by the version-gated packages) keep serving what was created on
them; new gates and content use the IDs above.

::: info Platform terms
Every gate of `access_gate` pays the platform: 0.2% of each sale, never less than 0.0005 SUI and
never more than 10% (so a paid pass costs at least 0.005 SUI), a one-off fee to make a gate free, and
the same commission on airdrops. The terms live in `PlatformConfig` — see the
[API reference](/sui/onchain/access-gate/api-reference#commission-and-fees).
:::

## SDK packages

| Package | Purpose |
| --- | --- |
| [`@meddleware/access-gate-client`](https://www.npmjs.com/package/@meddleware/access-gate-client) | `access_gate` client: pass/gate/platform reads, typed events, transaction builders (create, purchase, consume, admin), abort messages, deployed ids per network (`/deployments`) |
| [`@meddleware/access-gate-gateway-client`](https://www.npmjs.com/package/@meddleware/access-gate-gateway-client) | Gateway wire protocol: challenge + access proof (no dependencies) |
| [`@meddleware/sealed-storage-client`](https://www.npmjs.com/package/@meddleware/sealed-storage-client) | `SealController` (threshold encrypt/decrypt, session keys), policy registry with `nft-gate` and `time-lock` providers, `sealed_content` pointers and listing, deployed ids (`/deployments`) |
| [`@meddleware/walrus-storage-client`](https://www.npmjs.com/package/@meddleware/walrus-storage-client) | Walrus client factory, upload flows, lifetime extension, attributes, owned-blob queries, relay access tokens; the upload orchestrator (`/flow`) and an HTTP publisher/aggregator client (`/http`) |
| [`@meddleware/wallet-adapter`](https://www.npmjs.com/package/@meddleware/wallet-adapter) | Vue 3 wallet-standard composable shared across tool views: connect, sign messages, execute PTBs |
| [`@meddleware/walrus-storage-kit`](https://www.npmjs.com/package/@meddleware/walrus-storage-kit) | Vue 3 UI for the upload relay: relay selection, tip estimate, NFT-gate access, upload widget |
| [`@meddleware/ui`](https://www.npmjs.com/package/@meddleware/ui) / [`@meddleware/design-tokens`](https://www.npmjs.com/package/@meddleware/design-tokens) | Components and tokens — see the [design system](/design-system/) |

All SDKs target `@mysten/sui` v2 and gRPC (public fullnodes no longer serve JSON-RPC).

## Services

| Service | Source | Hosted instance |
| --- | --- | --- |
| access-gate gateway (NFT-gated reverse proxy; Cloudflare Workers or Rust) | [`access-gate-gateway`](https://github.com/meddleware-org/access-gate-gateway) | in front of the Walrus relay |
| Walrus upload relay (Mysten `walrus-upload-relay`, tip-charging) | upstream binary | `https://sui-walrus-storage-relay-testnet.meddleware.dev` (via the gateway; `/v1/tip-config` is public) |

## Testnet vs mainnet

Every address on this site is **testnet** unless stated otherwise. User-facing reference tables are
at [docs.meddleware.co.uk](https://docs.meddleware.co.uk/blockchain/sui/).

::: tip Using the Sui MCP
If you have the `sui-docs` MCP configured (`https://sui.mcp.kapa.ai`), consult it for current Sui
framework types, SDK patterns and deprecation notices before writing Move or TypeScript.
:::
