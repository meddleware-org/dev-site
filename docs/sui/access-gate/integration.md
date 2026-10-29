# Access Gate — Integration guide

Examples use `gate` (an `AccessGateConfig`), the ids from `accessGateDeployment(network)`
(`originalId`, `publishedAt`, `platformConfigId`), a Core-API Sui `client`, and an executor `exec`
that signs and executes transactions — see the [SDK setup](./).

## Buying a pass

```ts
import { buildPurchaseTx, fetchAccessNfts } from '@meddleware/access-gate-client'

const { digest } = await exec.signAndExecute(buildPurchaseTx(gate, priceMist))
await exec.waitForTransaction(digest)

const passes = await fetchAccessNfts(client, address, gate.nftType, gate.gateId)
// [{ objectId, gateId, usesRemaining }] — usesRemaining is null for an unlimited pass
```

Read the current price from the gate (`fetchGate(client, gateId, originalId)` → `priceMist`)
rather than hard-coding it. A paused gate refuses purchases (`access_gate` abort 1).

## Proving access to a gateway

The wallet signs the gateway's challenge; the gateway checks the signature, that the nonce is fresh
and unused, and that the address owns a pass for the gate. The challenge and proof come from
`@meddleware/access-gate-gateway-client`. The signed message (`access-gate-gateway:access:v3`) is bound to the gateway's
origin, the gate and the network, so `buildAccessProof` requires all three: a proof made for one
gateway, gate or network is useless at any other ([the message](./gateway#routes)).

```ts
import { fetchChallenge, buildAccessProof } from '@meddleware/access-gate-gateway-client'

const challenge = await fetchChallenge(GATEWAY)            // GET /v1/challenge → { nonce, expiresAt }
const token = await buildAccessProof({
  address,
  challenge,
  sign: (message) => wallet.signPersonalMessage({ message }), // → { signature }
  gateway: GATEWAY,                                          // the origin the gateway serves
  gateId: gate.gateId,                                       // the gate it guards
  network: 'testnet',
})

await fetch(`${GATEWAY}/protected/path`, { headers: { Authorization: `Bearer ${token}` } })
```

The token is `base64(JSON { address, nonce, signature, consumeDigest? })` and valid for one request
with that nonce (the challenge TTL defaults to 300 s). Pass only a `GATEWAY` you trust to be the
origin the user means to prove access to: the origin is part of what the wallet signs.

### Single-use gateways

A gateway in single-use mode also requires an on-chain `consume` bound to the challenge nonce, and
redeems each consume once:

```ts
import { buildConsumeTx } from '@meddleware/access-gate-client'
import { fetchChallenge, buildAccessProof } from '@meddleware/access-gate-gateway-client'

const challenge = await fetchChallenge(GATEWAY)
const consume = await exec.signAndExecute(buildConsumeTx(gate, passId, challenge.nonce))
await exec.waitForTransaction(consume.digest)
const token = await buildAccessProof({
  address,
  challenge,
  sign: (message) => wallet.signPersonalMessage({ message }),
  gateway: GATEWAY,
  gateId: gate.gateId,
  network: 'testnet',
  consumeDigest: consume.digest,
})
```

`consume` takes the pass by value, so only its holder can spend it; the emitted
`AccessConsumedEvent` records the nonce and the consumer, which is what the gateway matches.
Exhausted passes are deleted if the gate auto-burns, otherwise kept as receipts.

For a Walrus upload relay, `createGatedAccess` in `@meddleware/walrus-storage-client/flow` wraps this: it
persists the consume digest before the upload, so an interrupted upload never spends a second use.

## Operating gates

Operators create and manage gates with the same library (the `access-gate-ui` console is built on
it):

```ts
import {
  buildCreateGateTx, fetchOwnedGates, buildSetPausedTx, buildAirdropTx, buildMakeGateFreeTx,
  buildMakeGateImmutableTx, fetchPlatformConfig, minimumPaidPriceMist, gateCommissionMist,
} from '@meddleware/access-gate-client'

// Platform terms: commission floor → minimum paid price (0.005 SUI by default), free-gate fee
const platform = await fetchPlatformConfig(client, platformConfigId, originalId)
const minPrice = minimumPaidPriceMist(platform.minCommissionMist)

await exec.signAndExecute(
  buildCreateGateTx(publishedAt, platformConfigId, {
    priceMist: minPrice, paymentRecipient: address, defaultUses: 0n, soulbound: true,
    autoBurnAtZero: false, nftName: 'Member pass', nftImageUrl: 'https://…', nftDescription: '…',
    // policy: { freezeRequiresUnpaused: true, lockCommissionOnFreeze: false,
    //           pauseBlocksDecryption: true, pauseBlocksAccess: false },
    // A free gate instead: priceMist: 0n, freeGateFeeMist: platform.freeGateFeeMist
  }),
)

const gates = await fetchOwnedGates(client, address, originalId) // every gate this address administers
const g = gates[0]
const ctx = { packageId: publishedAt, gateId: g.gateId, adminCapId: g.adminCapId, platformConfigId }
await exec.signAndExecute(buildSetPausedTx(ctx, true))
// Airdrops pay the commission a sale at the current price would carry.
await exec.signAndExecute(buildAirdropTx(ctx, friendAddress, gateCommissionMist(g, platform)))
```

- **Pricing:** a paid price must be at least the platform minimum (abort 11); going free pays the
  one-off free-gate fee (`buildMakeGateFreeTx(ctx, fee)`, or `set_price(0)` once it is paid —
  otherwise abort 12).
- **Policy** (optional, immutable): restrictions recorded on the gate at creation — no freezing
  while paused, commission locked at freeze, pause blocks Seal decryption, pause blocks pass use
  (`consume` and gateways). Omitted flags default to off.
- **Freeze** (`buildMakeGateImmutableTx(ctx)`) is irreversible: it destroys the `AdminCap`, ending
  all settings and airdrops; sales and uses continue.

## Events

```ts
import { listAccessGateEvents } from '@meddleware/access-gate-client'

const page = await listAccessGateEvents(client, {
  originalId,
  kinds: ['AccessMinted', 'AccessConsumed'], // default: all seven
  gateId: g.gateId,                         // optional
  limit: 20,
  // indexer: { url: 'https://sui-indexer.meddleware.dev', network: 'testnet' }, // optional
})
// page.events — newest first, typed per kind (AccessConsumed carries `consumer` and `nonce`)
// page.cursor — pass back as `cursor` for older events
```

Events are decoded from their BCS bytes and matched at the original id, so another package's
same-named events are ignored. The optional read-indexer is for display only: a first page falls
back to the full node when it fails, and nothing may authorise from it.

## Error handling

Transactions that abort come back as `FailedTransaction`; read the module and code from
`status.error.MoveAbort` ([PTB patterns](/sui/ptb-patterns#error-handling)), or pass the error (or
the failed status) to `abortMessage(error, originalId)`, which returns the message for an
`access_gate` abort and `null` for anything else (`ACCESS_GATE_ABORTS` holds the table). The codes:

| Code | Meaning |
| --- | --- |
| 1 | gate paused (purchase) |
| 2 | payment below price |
| 3 | `consume` on an unlimited pass |
| 4 | pass has no uses left |
| 5 | pass or cap belongs to another gate |
| 6 | gate frozen (settings, airdrop) |
| 7 | commission above 10% (platform) |
| 8 | nonce shorter than 8 bytes |
| 9 | platform treasury set to `@0x0` |
| 10 | freeze refused: gate paused and its policy requires unpaused |
| 11 | paid price below the platform minimum (or 0 via `create_gate`) |
| 12 | price 0 before the free-gate fee is paid |

Code 1 also covers `consume` on a paused gate whose policy has `pause_blocks_access`, and 2 an
underpaid free-gate fee or airdrop commission.

Gateway HTTP errors (`401`, `403`, `409`, `429`, `502`) are described in
[Deploy the gateway](./gateway#responses).
