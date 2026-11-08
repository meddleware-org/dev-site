---
title: "Read indexer"
description: "The read-only HTTP API for access_gate and sealed-content event history: routes, parameters, response shapes, caching, freshness, rate limits and how to run your own."
---

# Read indexer

[`sui-indexer`](https://github.com/meddleware-org/sui-indexer) is a lean read-indexer for Meddleware's Sui packages. It polls the
`access_gate` events and `sealed_content::SealedContentPublished` from a Sui full node over gRPC, stores them in PostgreSQL, and serves
cacheable `GET` pages. Apps use it to list history cheaply and **fall back to the full node when it is unavailable**.

**It is display-only. Nothing may use it to authorise anything.** Every row carries `transactionDigest` and `checkpoint`, so it can be
checked against a full node. Full nodes keep only a short window of events (about 5½ days on testnet when measured on 2026-10-08);
the indexer keeps what it has ingested since its first start, and says where its coverage begins.

## Where it runs

| Aspect | Detail |
| --- | --- |
| Host | `https://sui-indexer.meddleware.dev` (fronted by Cloudflare's cache, which respects the origin's `Cache-Control`) |
| Network | one per instance (`NETWORK`, default `testnet`); a path for another network is `404` (`this indexer serves testnet only`) |
| CORS | `Access-Control-Allow-Origin: *` on every response; `OPTIONS` preflight is answered, other methods get `405` |
| Packages | the `access_gate` and `sealed_storage` original ids recorded in the client packages |

## Routes

All routes are `GET` (and `HEAD`) and answer JSON. `{network}` must be the instance's network.

| Route | Returns |
| --- | --- |
| `/v1/{network}/access-gate/events?kinds&gate&before&limit` | `{ events, cursor, indexedFromCheckpoint }` (head pages also `latestCheckpoint` and `polledAt`), newest first. `kinds` is a comma list of `GateCreated`, `AccessMinted`, `AccessConsumed`, `AccessBurned`, `GateFrozen`, `GateMadeFree`, `PlatformConfigUpdated`, `PlatformMigrated`; `gate` a `0x` id; `limit` 1 to 100 (default 20) |
| `/v1/{network}/sealed-content?gate&before&limit` | the same shape for the `SealedContentPublished` events of one gate (`gate` required); `limit` 1 to 200 (default 50) |
| `/v1/{network}/gates/{id}/stats` | `{ gateId, minted, consumed, burned, commissionMist, indexedFromCheckpoint }` (`commissionMist` a decimal string) |
| `/v1/{network}/coverage` | `{ network, generation, accessGate, sealedContent }`, each `{ fromCheckpoint, latestCheckpoint, events, undecodable, gaps }` |
| `/healthz` | `200` while every stream's polls succeed (the last within five poll intervals), else `503`, with `{ ok, streams: { <stream>: { ok, lastPollAgeMs, lastError } } }`; for monitoring |
| `/readyz` | `200` while the schema is at the version the API needs and the database answers; `503` before the ingester has migrated or while the database is down |

**An event** is the full node's entry, with the BCS bytes stored verbatim:

```json
{
  "eventType": "0x<original id>::access_gate::AccessMintedEvent",
  "sender": "0x…",
  "bcs": "<base64>",
  "checkpoint": "123456",
  "transactionDigest": "…",
  "eventIndex": 0
}
```

The indexer does not decode BCS. It takes the kind from the type name and the gate and commission from the node's JSON rendering;
the apps decode `bcs` with `@meddleware/access-gate-client` and `@meddleware/sealed-storage-client`, exactly as they decode node events.

- **Cursors.** `cursor` is `<generation>.<row id>` and is passed back as `before`. A rebuilt database gets a new generation, and an
  older cursor then returns `410` (start from the newest page). Row ids follow ledger order, so a page bounded by `before` never
  changes once served; ids are ordered, not gapless.
- **Validation.** Unknown query parameters, bad ids, unknown kinds and out-of-range limits return `400`.
- **Canonical URLs.** Another spelling of the same query (a short or upper-case `gate`, `limit=05`, unsorted or repeated `kinds`, an
  upper-case id in the stats path) gets a cacheable `301` to the canonical form, so each query has one cache entry. The client packages
  already send canonical values.
- **Errors** are `{ "error": "…" }`: `503` with `no-store` while the schema does not exist yet (`index not created yet`) or the database
  is down (`database unavailable`); `429` with `Retry-After` when rate limited.

## Caching

| Response | `Cache-Control` | Notes |
| --- | --- | --- |
| Older pages (a `before` cursor) | `public, max-age=31536000, immutable` | never change; carry neither `polledAt` nor `latestCheckpoint` |
| The newest page, `/coverage`, `/gates/{id}/stats` | `public, max-age=10, s-maxage=30` | 10 s in browsers, 30 s at the edge; an `ETag` (weak comparison, so Cloudflare's weakened tags still match) answers `304` |
| `301` canonical redirect | `public, max-age=86400` | |
| `404` | `public, max-age=60` | |
| Other errors, `/healthz`, `/readyz`, `429` | `no-store` | |

Behind Cloudflare's cache the home server answers only cache misses, and a per-IP token bucket keyed on `CF-Connecting-IP` limits what
gets through (`RATE_LIMIT_PER_SEC` 10, `RATE_LIMIT_BURST` 40; IPv6 clients by /64).

## Freshness

Head pages carry `polledAt` (epoch ms of the stream's last successful poll) and `latestCheckpoint`. A stuck ingester still answers
`200` with frozen data, so the clients treat a head page whose `polledAt` is missing, `null` or older than 60 s (`STALE_AFTER_MS`, four
poll intervals of 15 s) by the client's clock as unavailable and read the full node instead; a `polledAt` up to five minutes in the
future still counts as fresh (`CLOCK_SKEW_TOLERANCE_MS`). Older pages are immutable history and are not checked.

## Using it from the SDKs

Pass an `indexer` source; the first page is read from it and falls back to the full node when it fails, takes longer than
`timeoutMs` (3 s) or is stale, with the reason in `indexerError`. A cursor stays with the source that issued it. The URL must be `https:`
(`http:` only for a loopback host).

```ts
import { listAccessGateEvents } from '@meddleware/access-gate-client'
import { listSealedContent } from '@meddleware/sealed-storage-client'

const indexer = { url: 'https://sui-indexer.meddleware.dev', network: 'testnet' }

const events = await listAccessGateEvents(client, { originalId, gateId, kinds: ['AccessMinted'], indexer })
const pointers = await listSealedContent(client, { originalId, gateId, indexer })
console.log(events.source, events.indexedFromCheckpoint, events.indexerError, pointers.source)
```

An app that lists history sets `VITE_INDEXER_URL` at build time; a deployment can override that one endpoint at run time with a
same-origin `/runtime-config.json` (see [the component library](/design-system/components#runtime-endpoint-configuration)).

## Run your own

Two processes ship in one image (`quay.io/meddleware-org/sui-indexer`, distroless), as two Deployments with separate database roles:

- **`ingest`** is the only writer. It reads `ListEvents` with Mysten's `sui-rpc` client, applies the schema migrations at startup and
  holds a `pg_try_advisory_lock` for the life of the process, so a second writer is refused. It is a singleton by design.
- **`api`** reads through a **`SELECT`-only role** (it cannot write or change the schema), has no chain access and is stateless: more
  than one replica is safe.

| Variable | Read by | Default |
| --- | --- | --- |
| `NETWORK` | both | `testnet` |
| `DATABASE_URL` | both | required. `postgres://user:password@host:5432/database?sslmode=verify-full&sslrootcert=/etc/postgres-ca/ca.crt`: `verify-full` and a CA are required, an empty password is refused, and neither the URL nor the password is logged. The ingester uses the owner role, the API the `SELECT`-only role |
| `ALLOW_INSECURE_DATABASE` | both | unset; `1` admits `sslmode=disable` and an empty password, for local tests only |
| `POLL_MS` | both | `15000` |
| `GRPC_URL` | ingest | the public Mysten full node for `NETWORK` (`https`; `http` only for localhost) |
| `ACCESS_GATE_ORIGINAL_ID`, `SEAL_ORIGINAL_ID` | ingest | the deployments recorded in the client packages |
| `REINDEX_CONFIRM` | ingest | unset: a changed package id stops startup (see below) |
| `DB_POOL_SIZE` | api | `8` (1 to 64) |
| `PORT` | api | `8080` |
| `RATE_LIMIT_PER_SEC`, `RATE_LIMIT_BURST` | api | `10`, `40` |

- **First start:** the ingester backfills from the oldest event the full node still serves. History before that is not listed;
  `indexedFromCheckpoint` says where coverage starts. A cursor that falls below what the node still serves restarts the stream at the
  node's earliest data and counts a `gap`.
- **Package changes:** changing a stream's package id would delete stored history the node may already have pruned, so the ingester
  refuses to start until `REINDEX_CONFIRM=<stream>[,<stream>]` is set. It then copies the index into a `bak_<epoch ms>` schema in the
  same transaction as the clearing, re-indexes the stream from the new package and rotates the generation.
- **Undecodable events** (no JSON rendering or field, no BCS, no position) are counted, logged and skipped.
- **Liveness:** `ingest --healthcheck` exits 0 while PostgreSQL answers and the ingester refreshed its heartbeat within `5 × POLL_MS + 30 s`;
  the API's liveness is a TCP check, so a database outage does not restart it (`/readyz` reports it).
- **Migrations** are `crates/store/migrations/*.sql`, recorded with a SHA-256 and never edited once released; each keeps the previous
  version's queries working so the old API image runs while the new ingester migrates.

```bash
DOCKER=podman bash scripts/test-postgres.sh start && . "${TMPDIR:-/tmp}/sui-indexer-test-pg/env.sh"   # a real PostgreSQL 18 with TLS
cargo fmt --check && cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo build --release --locked
DATABASE_URL='postgres://…/sui_indexer?sslmode=verify-full&sslrootcert=ca.crt' ./target/release/ingest &
DATABASE_URL='postgres://…(select-only role)…' PORT=8080 ./target/release/api
```

The tests run against a real PostgreSQL; the client contract (`tests/contract`, CI) runs the published client packages against the built
`api` binary with a seeded database.
