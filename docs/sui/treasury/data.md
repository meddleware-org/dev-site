---
title: "Treasury on-chain data"
description: "The access_gate objects and events the Treasury console reads, with the JSON each object renders as over gRPC, the BCS event layouts, pruning, and the read-indexer fallback."
---

# Treasury on-chain data

These are **on-chain** objects and events of the `access_gate` package ([API reference](/sui/onchain/access-gate/api-reference)); the
Treasury console and every client only read them. The ids come from `@meddleware/access-gate-client/deployments`
(`accessGateDeployment(network)`: `originalId` for types and events, `publishedAt` for calls, `platformConfigId`). Struct fields
come back from a gRPC full node flat under `json` with these rules: a `u64` as a decimal string, a `bool` as a boolean, an address or
id as a hex string, an `Option` as the value or `null`. The client's strict readers (`u64Field`, `idField`, …) return `null` for a
missing or mistyped field and a parser then returns `null` for the whole object, so a missing price can never read as a free gate.

## `PlatformConfig`

The shared object holding platform-wide settings (the values below are illustrative; read the live ones).

```json
{
  "version": "2",                    // the only package version allowed to act (raised by `migrate`)
  "treasury": "0x…",                 // address that receives commission
  "commission_bps": "20",            // commission in basis points (20 = 0.20%)
  "min_commission_mist": "500000",   // floor on a paid purchase's commission
  "free_gate_fee_mist": "1000000000" // one-off fee for a free (price 0) gate
}
```

A paid purchase's commission is `price × commission_bps / 10000`, raised to `min_commission_mist` and never more than 10% of the price
(`commissionForPrice`, `minimumPaidPriceMist`, `gateCommissionMist` mirror it). The contract caps `commission_bps` at **1000 (10%)**.
`fetchPlatformConfig` returns `{ version, treasury, commissionBps, minCommissionMist, freeGateFeeMist }` as `bigint`s.

## `Gate`

A shared object representing one access class. The client parses every field below (a gate with a missing or mistyped one is
rejected):

```json
{
  "admin_cap_id": "0x…",
  "price_mist": "1000000000",       // price in MIST (1 SUI = 1e9 MIST); "0" is a free gate
  "payment_recipient": "0x…",
  "default_uses": "0",              // "0" = unlimited passes; N = single-use passes with N uses
  "soulbound": true,
  "auto_burn_at_zero": false,
  "paused": false,
  "frozen": false,
  "nft_name": "My Community Pass",
  "nft_image_url": "https://…",
  "nft_description": "…",
  "policy": {
    "freeze_requires_unpaused": false,
    "lock_commission_on_freeze": false,
    "pause_blocks_decryption": false,
    "pause_blocks_access": false
  },
  "locked_commission": null,        // { "bps": "20", "min_mist": "500000" } once frozen under a locking policy
  "free_fee_paid": false
}
```

The Treasury console shows `nft_name`, `price_mist`, `paused` and `frozen`. `fetchGate(client, gateId, originalId)` returns the camel-cased
`GateState`, or `null` when the object is not a `Gate` of that package.

## `AdminCap`

The owned capability that authorises managing one gate:

```json
{ "gate_id": "0x…" }   // the Gate this cap administers
```

### Why gates are found through AdminCaps

Full nodes prune old events, including the one-time `GateCreatedEvent`, so counting gates from events under-reports. Reading
`treasury → AdminCap objects → Gate` always reflects live state: `fetchAdminCaps(client, owner, originalId)` pages through the owner's
`<originalId>::access_gate::AdminCap` objects (exact type match, every page, an error past `MAX_OWNED_PAGES`), and `fetchOwnedGates`
merges each with its `Gate`, reading at most ten gates at a time (`GATE_FETCH_CONCURRENCY`).

## Access NFTs

A pass renders its gate and its kind inside `data`:

```json
{ "data": { "gate_id": "0x…", "variant": { "@variant": "SingleUse", "uses_remaining": "8" } } }
```

The variant is `{ "@variant": "UnlimitedPass" }` for an unlimited pass. `fetchAccessNfts` returns `{ objectId, gateId, variant }` with
`variant` as `{ kind: 'unlimited' }` or `{ kind: 'singleUse', remaining: bigint }`; an unknown tag or a count that is not a `u64` is
`null`, never "unlimited" and never a fabricated 0.

## Events

The Activity tab and the counters read these `access_gate` events:

| Kind (`listAccessGateEvents`) | Move struct | Meaning | Address shown |
| --- | --- | --- | --- |
| `AccessMinted` | `AccessMintedEvent` | a pass was bought or airdropped | `recipient` |
| `AccessConsumed` | `AccessConsumedEvent` | a use of a pass was spent | `consumer` |

The other kinds are `GateCreated`, `AccessBurned`, `GateFrozen`, `GateMadeFree`, `PlatformConfigUpdated` and `PlatformMigrated`. Each
page entry also carries `txDigest`, `eventIndex`, `checkpoint` and `sender`.

### BCS layouts

Events are decoded from their **BCS bytes**, never the node's JSON rendering (which can vary between transports). The layouts mirror the
Move structs field for field; for the two the console uses:

```text
AccessMintedEvent    { nft_id: address, gate_id: address, soulbound: bool, initial_uses: u64,
                       recipient: address, commission_mist: u64, timestamp_ms: u64 }
AccessConsumedEvent  { nft_id: address, gate_id: address, nonce: vector<u8>, consumer: address,
                       uses_after: u64, timestamp_ms: u64 }
```

The decode is strict: the parser re-serialises what it read and compares, so a field appended by a later package upgrade throws
instead of being silently lost (`@mysten/bcs` ignores trailing bytes). An event is **accepted only if its type is exactly an
`access_gate` event of the deployment's original id** (normalised comparison), so a same-named event from another package is ignored.
Results are listed newest first.

### Pruning and the read indexer

A public full node keeps only a short window of events (about 5½ days on testnet when measured on 2026-10-08). When the console is
given a [read indexer](/sui/indexer) it reads the first page from it (display data only; the rows are decoded and type-checked like
node events), and falls back to the full node when the indexer fails, takes longer than 3 s or is stale (a head page whose `polledAt`
is missing, `null` or older than 60 s). `page.indexedFromCheckpoint` says where the indexer's coverage starts, and `page.indexerError`
why it was skipped. Nothing may authorise from indexer rows: each carries its `transactionDigest` and `checkpoint` so it can be checked
against a node.

## Treasury balance

The balance is the treasury address's total SUI, read with the gRPC `GetBalance` call (`client.core.getBalance`). Its `balance` field is
`coinBalance + addressBalance`: coin objects plus the address balance, so funds delivered with `send_funds` are counted. It is a
`bigint` string in MIST; format it exactly with `UiAmount` or `formatCoinAmount` from [`@meddleware/web-utils`](/libraries/web-utils).
