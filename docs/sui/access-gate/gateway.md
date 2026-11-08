---
title: "Deploy the access-gate gateway"
description: "The NFT-gated reverse proxy for any HTTP service. The wire protocol, the three implementations, the configuration, deployment on Cloudflare Workers or in a container, and what each response means."
---

# Deploy the access-gate gateway

[`access-gate-gateway`](https://github.com/meddleware-org/access-gate-gateway) is a generic **NFT-gated reverse proxy**: put it in front
of any HTTP service (an upload relay, a website, an API) and only holders of an `access_gate` pass get through. It issues challenge
nonces, verifies wallet-signed access proofs and pass ownership on-chain, rate-limits per address, and proxies authorised requests to
the upstream. It issues no sessions or tokens of its own: every request carries a fresh proof.

## Implementations

The decision logic exists **once**, in the Rust crate `access-gate-gateway-core` (proof decoding, Sui signature verification, the
allow or deny decision, the Sui reads, the nonce, rate and redemption state machines, the header, path and configuration policy and the
request flow). A gateway is a thin adapter that supplies only I/O. All implementations serve the same wire protocol and are tested
against the same [conformance vectors](https://github.com/meddleware-org/access-gate-gateway/tree/main/conformance).

| Implementation | Directory | Distributed as | State (nonces, rates, redemptions) | Request bodies |
| --- | --- | --- | --- | --- |
| Cloudflare Worker in Rust | `worker/` | built from source (`worker-build`); the repository's `deploy-worker-rust.yml` workflow | SQLite-backed Durable Objects | streamed with a byte cap |
| Cloudflare Worker in TypeScript (superseded; the rollback until retired) | `gateway-workers/` | npm `@meddleware/access-gate-gateway`, `wrangler deploy` | Durable Objects | streamed with a byte cap |
| Rust / Axum server | `gateway-rust/` | crates.io `access-gate-gateway`, Docker `meddleware/access-gate-gateway` | in memory, or Redis/Dragonfly for more than one replica | **buffered in memory** |

The live Meddleware gateway is the Rust Worker (live since 2026-10-20). The Rust/Axum server is kept at parity and CI-green for
self-hosting but is not deployed by Meddleware. All of them query the chain over Sui **gRPC**.

### Choosing an implementation

- **A large-upload upstream (such as a Walrus relay) needs a streaming gateway:** the Cloudflare Worker. The Rust/Axum server collects
  the request body in full before forwarding it and the upstream response before returning it, so its peak memory is about
  `MAX_CONCURRENT_REQUESTS × (2 × MAX_BODY_BYTES + MAX_RESPONSE_BYTES)`. It is for small-body upstreams (a tip-config read, a small
  API), where it gives the lowest latency on your own hardware and Redis-backed state for scale-out.
- **Cloudflare Workers** need no infrastructure of your own. Note the body limit is the lower of `MAX_BODY_BYTES` and the zone's
  Cloudflare plan limit (100 MB on the Free and Pro plans), which is why Meddleware sets `MAX_BODY_BYTES=100000000`.

## The wire protocol

The decoding rules and the conformance vectors are owned by
[`@meddleware/access-gate-gateway-client`](https://github.com/meddleware-org/access-gate-gateway-client#wire-protocol); clients build
proofs with `buildAccessProof` (see [proving access to a gateway](./integration#proving-access-to-a-gateway)).

| Route | Auth | Behaviour |
| --- | --- | --- |
| `GET /v1/challenge` | none | `{ "nonce": "…", "expiresAt": … }`: a fresh single-use nonce (1 to 128 characters of `A-Z a-z 0-9 . _ ~ -`; the Workers prefix it with a region tag) |
| `GET /healthz` | none | liveness |
| `PUBLIC_PATHS` (default `/v1/tip-config`) | none | proxied without a proof; read-only (other methods get `405` with `Allow`); the Workers rate-limit these per client IP and edge-cache `GET`s |
| everything else | access proof | verified, then proxied to `UPSTREAM_URL` |

The proof travels as `Authorization: Bearer <token>` (or `X-Access-Proof`). The token is `base64(JSON { address, nonce, signature,
consumeDigest? })` in a fixed field order, and the decoder is strict: canonical **padded** standard base64 (no unpadded token, inner
whitespace, URL-safe alphabet or non-zero trailing bits), well-formed UTF-8 without a byte-order mark, and JSON nested at most 127
levels with no unpaired surrogate and no number that overflows; only whitespace at either end of the token is ignored. `consumeDigest`
is present only for single-use gateways and is a base58 transaction digest that decodes to exactly 32 bytes.

The `signature` is a Sui personal message (ed25519, secp256k1 or secp256r1; multisig, zkLogin and passkey fail closed) over this
text, protocol **`access-gate-gateway:access:v3`**, ASCII, one `key:value` line each:

```text
access-gate-gateway:access:v3
origin:<canonical gateway origin>
gate:<0x + 64 lower-case hex gate id>
network:<localnet|devnet|testnet|mainnet>
nonce:<nonce>
consume:<base58 digest>      (single-use gateways only)
```

The gateway rebuilds the message from its **own** `GATEWAY_ORIGIN`, `GATE_ID` and `NETWORK`, so a proof made for another gateway, gate,
network or consume is useless here. It consumes the nonce immediately (single-use replay protection) and verifies, for the signature,
that it recovers the claimed address, that the nonce is fresh and unused, and that the address owns a pass of the gate; in single-use
mode it instead checks the on-chain consume by digest (the consume's sender, gate and nonce, recent enough: `CONSUME_MAX_AGE_SECS`)
and redeems it once. If the gate's immutable policy has `pause_blocks_access`, pausing the gate denies every holder (`403`) until it is
unpaused; in single-use mode that check runs before the consume is redeemed, so no use is lost.

## Configuration

Every value is validated at startup: a bad or missing required value is a refusal to serve (the Workers answer `500 gateway
misconfigured` and log the reason), never a weaker mode. The shared variables:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `UPSTREAM_URL` | yes | none | Base URL of the protected service. A secret: never logged, no embedded credentials |
| `GATEWAY_ORIGIN` | yes | none | This gateway's canonical public origin (`https://host`, no path, lower-case); signed into every proof, so it must equal the hostname clients call |
| `NETWORK` | yes | none | `localnet`, `devnet`, `testnet` or `mainnet`; signed into every proof |
| `SUI_RPC_URL` | yes | testnet fullnode (Workers) | Sui fullnode (gRPC-web); use a node you trust, and a mainnet one in production |
| `NFT_TYPE` | yes | none | `<access_gate original id>::access_gate::AccessNFT` or `::SoulboundAccessNFT`; any other type is rejected at startup |
| `GATE_ID` | yes | none | The gate whose passes are accepted; also read live, so a paused gate with `pause_blocks_access` denies its holders |
| `SINGLE_USE` | | `false` | Require a `consumeDigest` naming a successful `consume` by the proof address on `GATE_ID`; each digest is redeemable once |
| `PUBLIC_PATHS` | | `/v1/tip-config` | Comma-separated unauthenticated paths |
| `RATE_LIMIT_PER_MIN` | | `30` | Per-address requests per minute (`0` disables) |
| `CHALLENGE_RATE_LIMIT_PER_MIN` | | `30` | Per-client-IP budget for `GET /v1/challenge` |
| `GATED_PREAUTH_RATE_LIMIT_PER_MIN` | | `120` | Per-client-IP budget for gated requests, checked before signature verification |
| `MAX_BODY_BYTES` | | `262144` | Request body cap (256 KiB); raise it for uploads |
| `CHALLENGE_TTL_SECS` | | `300` | Nonce lifetime |
| `OWNERSHIP_CACHE_TTL_MS` | | `0` | Cache ownership checks (`0` checks every request; never applied to single-use consume checks) |
| `UPSTREAM_TIMEOUT_SECS` | | `600` | Total deadline of one upstream exchange (`504` past it) |
| `RPC_TIMEOUT_SECS` | | `15` | Deadline of each Sui RPC call |
| `REDEMPTION_LEASE_TTL_SECS` | | `900` | Single-use: lease on an in-flight redemption; must exceed `UPSTREAM_TIMEOUT_SECS` |
| `REDEMPTION_RETENTION_SECS` | | `2592000` | Single-use: how long a spent consume digest is remembered (30 days) |
| `CONSUME_MAX_AGE_SECS` | | `432000` | Single-use: oldest accepted consume (5 days, inside public fullnodes' transaction retention); at most the retention |
| `UPSTREAM_AUTH_HEADERS` | | none | JSON array `[{"name":…,"value":…}]` of headers added to upstream requests (a secret, for example a Cloudflare Access service token); invalid JSON aborts startup |
| `SUI_RPC_AUTH_HEADER` | | none | `Name: value` header added to Sui RPC calls (a secret, for an authenticated node) |
| `ALLOWED_ORIGINS` | | none | Comma-separated canonical browser origins granted CORS; unset grants none |
| `ALLOW_INSECURE_HTTP` | | none | `1` permits `http://` for `UPSTREAM_URL`, `SUI_RPC_URL`, `GATEWAY_ORIGIN` and `ALLOWED_ORIGINS` (localnet, an in-cluster upstream) |

The table summarises the shared core; the READMEs hold the complete tables and may add settings:
[Rust Worker](https://github.com/meddleware-org/access-gate-gateway/blob/main/worker/README.md),
[Rust/Axum](https://github.com/meddleware-org/access-gate-gateway/blob/main/gateway-rust/README.md#configuration-environment-variables),
[TypeScript Worker](https://github.com/meddleware-org/access-gate-gateway/blob/main/gateway-workers/README.md#full-configuration-reference).

Implementation-specific settings:

- **Workers:** `NONCE_SHARD` (`region` by default, or `global`), `NONCE_MAX_ENTRIES`, `PUBLIC_RATE_LIMIT_PER_MIN` (120),
  `PUBLIC_CACHE_TTL_SECS` (60), and the optional scheduled quota guard (`QUOTA_GUARD_ENABLED`, `WORKERS_PLAN`). The Rust Worker accepts
  only the Durable Object backend (`NONCE_BACKEND=kv` is a startup error).
- **Rust/Axum:** `BIND_ADDR`, `REDIS_URL`, `TRUSTED_PROXY_HOPS`, `MAX_CONCURRENT_REQUESTS` (64), `MAX_RESPONSE_BYTES`, the connection and
  read timeouts, `NONCE_PRUNE_INTERVAL_SECS`, and `ALLOW_VOLATILE_REDEMPTIONS`.

## Deploy on Cloudflare Workers

The Rust Worker is built from source with `worker-build` and deployed with Wrangler; the repository's `worker/README.md` pins the
toolchain and documents the shadow-deploy, cutover and rollback runbook Meddleware follows. The configuration lives in
`worker/wrangler.toml`: the public values (`GATEWAY_ORIGIN`, `NETWORK`, `NFT_TYPE`, `GATE_ID`, the limits) in `[vars]`, which are
overwritten on every deploy and so hold public values only, and the credentials as secrets:

```bash
git clone https://github.com/meddleware-org/access-gate-gateway.git
cd access-gate-gateway/worker
npm ci
rustup target add wasm32-unknown-unknown
cargo install worker-build --version 0.8.7 --locked   # must match the pinned wasm-bindgen crate
# edit wrangler.toml: [[routes]] pattern + zone, and [vars]:
#   GATEWAY_ORIGIN = "https://gate.example.com"   (the route's hostname)
#   NETWORK        = "testnet"
#   NFT_TYPE       = "0x<access_gate original id>::access_gate::SoulboundAccessNFT"
#   GATE_ID        = "0x<gate id>"
wrangler deploy                              # runs the [build] command (worker-build --release), then uploads the Worker
wrangler secret put UPSTREAM_URL             # https://your-origin.example.com
wrangler secret put UPSTREAM_AUTH_HEADERS    # only if the origin is Access-locked
curl https://gate.example.com/v1/challenge   # → {"nonce":"…","expiresAt":…}
```

Until the required values are set the Worker answers `500 gateway misconfigured`. The superseded TypeScript Worker deploys with
`npm run deploy` from `gateway-workers/` and takes the same variables.

A Worker runs at the edge, so `UPSTREAM_URL` must be publicly routable. Lock that origin so only the gateway can reach it, for
example a Cloudflare Access application allowing only a service token, whose headers the gateway sends through
`UPSTREAM_AUTH_HEADERS`. Without this, anyone can call the origin directly and skip the pass check.

## Deploy with Docker (Rust/Axum)

```bash
docker run -p 8080:8080 \
  -e GATEWAY_ORIGIN=https://gate.example.com \
  -e NETWORK=testnet \
  -e UPSTREAM_URL=http://api:8081 -e ALLOW_INSECURE_HTTP=1 \
  -e SUI_RPC_URL=https://fullnode.testnet.sui.io:443 \
  -e NFT_TYPE=0x<access_gate original id>::access_gate::AccessNFT \
  -e GATE_ID=0x<gate id> \
  meddleware/access-gate-gateway
```

`ALLOW_INSECURE_HTTP=1` is needed only for an `http://` upstream inside your own network; otherwise every URL must be `https://`. Run
one replica with the in-memory nonce store, or set `REDIS_URL` before scaling out, otherwise a nonce could be accepted once per
replica. With `SINGLE_USE=true` the server requires `REDIS_URL` (spent consumes must survive a restart; `ALLOW_VOLATILE_REDEMPTIONS`
is for development only). Set `TRUSTED_PROXY_HOPS` to the number of reverse proxies in front of it, or the client IP is the TCP peer.
The image is distroless and its signature and SBOM attestations can be verified with cosign (see the repository README).

## Responses

Every gateway failure is a JSON body `{ "error": "…" }`, with `code` on a `409`. The statuses and the text per outcome are pinned in
`vectors.json` and exported by `@meddleware/access-gate-gateway-client` (`GATEWAY_STATUS`, `GATEWAY_CONFLICT_CODES`,
`parseGatewayError`):

| Status | Meaning |
| --- | --- |
| `401` | no access proof |
| `403` | malformed proof, bad signature, unknown, expired or reused nonce, missing or unusable consume (single-use), the gate is paused, or the address holds no matching pass |
| `405` | the method is not forwarded, or not allowed on a public path |
| `409` | single-use: `code` is `redeemed` (that consume was already spent) or `leased` (a request using it is in flight; released again if the upstream fails) |
| `413` | body above `MAX_BODY_BYTES` |
| `429` | rate limit exceeded |
| `502` | the upstream or the chain lookup failed (an upstream redirect is also refused as `502`) |
| `503` | the gateway's own state store is unavailable, or (Rust/Axum) it is overloaded |
| `504` | the upstream did not answer within `UPSTREAM_TIMEOUT_SECS` |
| `508` | the request already carries this gateway's `Via: 1.1 access-gate-gateway` marker: it looped back |

Anything else comes from the upstream. If the upstream answers 2xx but the redemption commit then fails, the client gets `502` and the
consume is released, so the user may upload twice but never loses a paid use.

## Trust model

- The gateway, not the chain, enforces nonce freshness and single-use redemption; run one logical nonce store per gateway.
- Ownership is checked live unless `OWNERSHIP_CACHE_TTL_MS` is set; with caching, a pass sold or burned keeps working until the entry
  expires.
- A gateway trusts its Sui fullnode; point `SUI_RPC_URL` at a node you trust.
- Every upstream request carries `Via: 1.1 access-gate-gateway` (any client `Via` is dropped), and `Host` and `Authorization` are not
  forwarded.

## Build and test

From the repository root (the Cargo workspace):

```bash
cargo fmt --check
cargo clippy --all-targets --locked --workspace -- -D warnings
cargo test --locked --workspace          # core, gateway-rust and the Worker glue
(cd worker && npm ci && bash scripts/build.sh all && npm test)   # the Rust Worker's workerd suites
node scripts/sync-vectors.mjs --check    # the repository's copy of the conformance vectors equals the published client's
```

After a protocol change, release `@meddleware/access-gate-gateway-client` (the protocol's home), bump it in the gateway repository
and run `node scripts/sync-vectors.mjs`.
