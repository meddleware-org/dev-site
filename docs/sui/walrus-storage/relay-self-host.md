---
title: "Self-host a Walrus relay"
description: "Run Mysten's Walrus upload relay with a tip schedule, put an access-gate gateway in front of it, lock the origin and verify the setup."
---

# Self-host a Walrus relay

A Walrus **upload relay** encodes a blob and fans it out to the storage nodes on the client's behalf,
so a browser uploads once instead of to every node. Meddleware runs Mysten's
[`walrus-upload-relay`](https://docs.wal.app/) and puts an [access-gate gateway](/sui/access-gate/gateway)
in front of it, so only holders of an access pass can upload.

## Architecture

```text
Browser (walrus-storage-client, uploadRelayHost = gateway)
  │
  ▼
access-gate gateway  (Cloudflare Worker or Rust)
  │  GET /v1/challenge · verifies the access proof (+ consume in single-use mode)
  │  public: /v1/tip-config
  │  adds origin credentials (e.g. Cloudflare Access service token)
  ▼
walrus-upload-relay  (container; tip-charging)
  │
  ▼
Walrus storage nodes
```

The relay itself holds no key and pays nothing: the user's register transaction pays storage and
the relay's tip. Storage fees are paid by the uploader's wallet, not by whoever runs the relay.

## 1. Run the relay

Use the upstream image `docker.io/mysten/walrus-upload-relay`, pinned by digest. It takes two config files and two addresses:

```text
walrus-upload-relay \
  --walrus-config /etc/walrus/client_config.yaml \
  --relay-config /etc/walrus/relay.yaml \
  --server-address 0.0.0.0:57391 \
  --metrics-address 0.0.0.0:9184
```

- **Walrus client config** (`client_config.yaml`): the Walrus system and staking objects, the exchange objects, `n_shards`,
  `max_epochs_ahead` and the Sui RPC URLs for the network. Start from Mysten's canonical file for the network
  (`https://docs.wal.app/setup/client_config_testnet.yaml`) and refresh it when the Walrus contracts are redeployed.
- **Relay config** (`relay.yaml`): the tip schedule and the freshness window of the payment transaction:

  ```yaml
  tip_config: !send_tip
    address: "0x<your address>"     # receives the tips
    kind: !linear
      base: 100000                   # MIST per upload
      encoded_size_mul_per_kib: 1    # + MIST per KiB of encoded size
  tx_freshness_threshold_secs: 3600  # reject a payment transaction older than this
  tx_max_future_threshold:
    secs: 30
    nanos: 0
  ```

  `kind: !const` is a flat tip in MIST. The total of a linear tip is `base + encoded_size_mul_per_kib × floor(encoded_bytes / 1024)`;
  the encoded size includes a fixed amount of per-blob metadata (about 62 MiB on a 1000-shard committee), so even a small file has a
  tip above `base`. Keep the tip below the ceiling your clients enforce (`uploadRelayMaxTipMist`, default 5,000,000 MIST).

The relay reads its config only at start: restart it after any change (in Kubernetes, generate the ConfigMaps with a content hash so
edits roll the pods). Size memory for the largest blob you accept: the relay holds roughly **4.5×** the blob in memory while
encoding. The relay serves HTTP on `--server-address` (`57391` here) and Prometheus metrics on `--metrics-address` (`9184`).

## 2. Put the gateway in front

Deploy an access-gate gateway ([deployment guide](/sui/access-gate/gateway)) with:

| Setting | Value for a relay |
| --- | --- |
| `UPSTREAM_URL` | the relay's origin URL |
| `GATEWAY_ORIGIN` / `NETWORK` | the gateway's public origin (`https://host`) and the Sui network; both are signed into every proof, so clients must call exactly that origin |
| `NFT_TYPE` / `GATE_ID` | the pass type and the gate your users buy (both required) |
| `PUBLIC_PATHS` | `/v1/tip-config` (clients read the tip before paying) |
| `MAX_BODY_BYTES` | at least your largest upload (the default 256 KiB is far too small). Meddleware sets `100000000` (10^8 bytes), the request-body limit of a Cloudflare zone on the Free and Pro plans, so an oversized upload gets the gateway's own JSON `413` instead of the platform's |
| `UPSTREAM_TIMEOUT_SECS` | the total deadline of one exchange (default 600); the redemption lease (`REDEMPTION_LEASE_TTL_SECS`, 900) must exceed it |
| `SINGLE_USE` | `true` to spend one pass use per upload |

Raise the body limit on every proxy in the path too (e.g. an NGINX ingress defaults to 1 MiB and
answers `413` above it), and allow a proxy read timeout long enough for large uploads.

An upload relay takes large bodies, so the gateway in front of it must **stream** them: use the Cloudflare Worker gateway (the Rust
Worker, or the superseded TypeScript Worker), which streams the body upstream with a byte cap. The Rust/Axum server **buffers** the
request body in memory and is meant for small-body upstreams; see [Deploy the gateway](/sui/access-gate/gateway#choosing-an-implementation).

## 3. Lock the origin

A Cloudflare Worker gateway reaches the relay over the public internet, so the relay's hostname
must reject everyone except the gateway — otherwise anyone can bypass the pass check:

1. Expose the relay on its own hostname (e.g. through a Cloudflare Tunnel).
2. Protect it with a Cloudflare Access application whose only policy allows a **service token**
   (non-identity decision, fallback blocked).
3. Give the gateway the token: `wrangler secret put UPSTREAM_AUTH_HEADERS` →
   `[{"name":"CF-Access-Client-Id","value":"<id>"},{"name":"CF-Access-Client-Secret","value":"<secret>"}]` (a JSON array; invalid JSON makes the gateway fail closed).

A gateway that runs beside the relay (the Rust/Axum server, for a small-body upstream) can instead reach it on a private network
address, with `ALLOW_INSECURE_HTTP=1` for an `http://` upstream inside your own network.

## 4. Verify

```bash
curl -s  https://<gateway>/v1/tip-config                  # 200 — tip schedule (public)
curl -sI -X POST https://<gateway>/v1/blob-upload-relay     # 401 — missing access proof
curl -sI https://<relay-origin>/v1/tip-config               # 403 — origin locked
```

Then upload from an app with `uploadRelayHost` set to the gateway (see the
[integration guide](./integration)).

