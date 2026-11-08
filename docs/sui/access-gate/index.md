---
title: "Access Gate SDK"
description: "Install and configure @meddleware/access-gate-client and the gateway client, the key concepts of gates and passes, and the first reads and transactions."
---

# Access Gate: SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/) | [Generated API reference →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/api/) | [Gateway wire API →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/wire-api/)

An **access gate** is an on-chain pass system: anyone can create a gate (price, payout address,
pass flavour), anyone can buy a pass, and a service — a relay, a website, a Seal policy — admits
holders. Each purchase pays the platform commission (`PlatformConfig`, ≤ 10%) and the rest to the
gate's recipient, in one transaction.

Two packages:

- [`@meddleware/access-gate-client`](https://www.npmjs.com/package/@meddleware/access-gate-client)
  — the `access_gate` client: typed reads, typed events, transaction builders, abort messages and
  the deployed ids per network.
- [`@meddleware/access-gate-gateway-client`](https://www.npmjs.com/package/@meddleware/access-gate-gateway-client) — the
  gateway wire protocol: fetch a challenge and build the access proof an
  [access-gate gateway](./gateway) verifies.

## Install

```bash
npm install @meddleware/access-gate-client @mysten/sui
npm install @meddleware/access-gate-gateway-client   # only to prove access to a gateway
```

`@mysten/sui` (`^2.33.2`) is a peer dependency of the client, which talks to a full node over gRPC through the Core API
(`SuiGrpcClient`). The client has two entries: the main one and `/deployments`. The gateway client has no dependencies and declares
`engines.node >=24`.

## Key concepts

| Term | Meaning |
| --- | --- |
| `Gate` | Shared object: price, payment recipient, pass flavour, pause and freeze state, immutable policy |
| `AdminCap` | Owned capability for one gate: settings, airdrops, freeze. Whoever holds it owns the gate |
| `AccessNFT` / `SoulboundAccessNFT` | The pass. Soulbound passes have no `store` ability, so they cannot be transferred |
| Unlimited vs single-use | `default_uses = 0` is valid while held; `N` gives `N` uses, each spent on-chain by the holder with `consume`. A gate cannot switch between the two (abort 16) |
| `PlatformConfig` | Shared object with the platform treasury, commission rate and floor, free-gate fee and the package version |
| `PlatformAdminCap` | Owned by the platform: authority over `PlatformConfig` and `migrate` |
| Challenge / proof | A gateway issues a nonce; the wallet signs the `access-gate-gateway:access:v3` message, which binds the gateway origin, gate id, network and nonce (and the consume digest on single-use gateways); the proof token is sent as `Authorization: Bearer …` |

## Configure a gate

The deployed ids come from the package, per network. There are two package ids, equal until the
package is upgraded: transactions call the latest **`publishedAt`**; types and events are matched
at the **`originalId`**.

```ts
import { accessNftType, type AccessGateConfig } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

const { originalId, publishedAt, platformConfigId } = accessGateDeployment('testnet')

const gate: AccessGateConfig = {
  packageId: publishedAt,
  gateId: GATE_ID,
  platformConfigId,
  nftType: accessNftType(originalId, /* soulbound */ true), // …::SoulboundAccessNFT or ::AccessNFT
  soulbound: true, // optional cross-check: buildConsumeTx throws if it disagrees with nftType
}
```

`accessGateDeployment(network)` throws when no deployment is recorded for the network; an app uses that to say a tool is not available
there instead of guessing ids.

## Quick start

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { ownsAccessNft, buildPurchaseTx } from '@meddleware/access-gate-client'

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })

// Does this wallet hold a USABLE pass for the gate? (exact type match; unlimited, or single-use with uses left; stops at the first match)
const hasAccess = await ownsAccessNft(client, address, gate.nftType, gate.gateId)

// If not, buy one (the wallet signs; overpayment is refunded on-chain)
if (!hasAccess) await exec.signAndExecute(buildPurchaseTx(gate, priceMist))
```

The contract itself — objects, events, abort codes and the replay rules for single-use passes — is
documented with the Move package: [on-chain overview](/sui/onchain/access-gate/overview),
[developer integration](/sui/onchain/access-gate/dev-guide) and
[API reference](/sui/onchain/access-gate/api-reference).

## SDK surface

| Area | Exports of `@meddleware/access-gate-client` |
| --- | --- |
| Reads | `fetchAccessNfts`, `fetchAccessNftById`, `ownsAccessNft`, `isUsablePass`, `fetchOwnedGates`, `fetchGate`, `fetchAdminCaps`, `fetchPlatformConfig`, `ownsPlatformAdminCap`, and the parsers `parseGate`, `parseAdminCap`, `parsePlatformConfig`, `parseOwnedAccessNft`. Every parser compares the object's full type with the expected `<originalId>::access_gate::<Name>` and returns `null` for a missing or mistyped field, never a default. Owned-object reads follow the cursor to the last page and throw past `MAX_OWNED_PAGES` (100) |
| Types and ids | `accessNftType`, `accessGateType`, `accessGateEventType`, `isAccessGateType`, `normalizeAccessNftType`, `ACCESS_GATE_MODULE`; the `deployments` entry |
| Transactions | `buildPurchaseTx`, `buildConsumeTx`, `buildCreateGateTx`, `buildSetPriceTx`, `buildSetPaymentRecipientTx`, `buildSetPausedTx`, `buildSetDefaultUsesTx`, `buildSetAutoBurnAtZeroTx`, `buildSetNftNameTx`, `buildSetNftImageUrlTx`, `buildSetNftDescriptionTx`, `buildAirdropTx`, `buildMakeGateFreeTx`, `buildMakeGateImmutableTx` |
| Policy and money | `DEFAULT_GATE_POLICY`, `validateGatePolicy`, `isRestrictivePolicy`, `platformCommissionTerms`, `commissionForPrice`, `minimumPaidPriceMist`, `gateCommissionMist`, `BPS_DENOMINATOR`, `MAX_COMMISSION_BPS` |
| Events | `listAccessGateEvents`, `parseAccessGateEvent`, `readIndexerEvents`, `eventGateId`, `ACCESS_GATE_EVENT_KINDS`, `STALE_AFTER_MS`, `CLOCK_SKEW_TOLERANCE_MS` |
| Errors | `abortMessage(error, originalId)`, `ACCESS_GATE_ABORTS` |

See the [integration guide](./integration) for proving access to a gateway, operating gates and reading events, and
[Deploy the gateway](./gateway) to protect your own service.
