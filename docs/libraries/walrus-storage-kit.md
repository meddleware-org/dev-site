---
title: "walrus-storage-kit"
description: "The shared Vue 3 UI for the Walrus upload relay: relay selection and tip estimation, gate access, the upload widget and the pure relay helpers."
---

# walrus-storage-kit

[`@meddleware/walrus-storage-kit`](https://www.npmjs.com/package/@meddleware/walrus-storage-kit) is the shared Vue 3 UI for the Walrus
upload relay: relay selection and tip estimation, NFT-gate access, and a blob-upload widget. It is built on
[`@meddleware/walrus-storage-client`](/sui/walrus-storage/) (its `/flow` upload conventions) and
[`@meddleware/access-gate-client`](/sui/access-gate/), and is consumed by the Walrus Storage app (the standalone uploader) and the Token
Issuance app (icon upload), so the relay logic lives in one place.

```bash
npm install @meddleware/walrus-storage-kit
```

The package ships TypeScript and SFC source (no build step) and declares `engines.node >=24`. Import the design tokens once at the app
entry (`@meddleware/design-tokens/tokens.css`).

| Export | Kind | Purpose |
| --- | --- | --- |
| `useWalrusRelay(hosts, access?)` | composable | relay selection, the `/v1/tip-config` health check (re-checked with backoff when it fails) and the cost estimate. `hosts` is `{ operator, public }` as a value, ref or getter; both must be https (http only on loopback) or it throws |
| `useAccessGate({ network, gate, getClient })` | composable | NFT-gate ownership, the purchase terms read from the chain (`terms`), purchase and the consume builder. `gate` is a `RelayGateConfig` or `null` (null means open); a config that is not the published deployment for `network` throws |
| `relayGateConfig(network, { gateId, soulbound })` | function | the gate config, with the package and `PlatformConfig` fixed to the published `access_gate` deployment. The price is read from the gate on the chain |
| `assertPinnedGate(network, gate)` | function | throws when a hand-built config names anything but the published deployment (`useAccessGate` runs it) |
| `WalrusUpload` | component | file picker, relay selector and upload. The app injects `performUpload` (keeping `@mysten/walrus` and the wallet out of this package); pass `sessionKey` (for example `${network}:${address}`) so a change of account or network discards the file and any held retry |
| `TipConfigBadge` | component | live relay reachability and tip: a figure, "no tip", "unknown" or "above the limit" |
| `AccessGateCta` | component | the "Purchase access" prompt when gated and the wallet lacks a pass; it shows the exact payment, recipients, network and pass read from the chain, and stays disabled until they are read |
| `useGatedUpload(gate)` | composable | `accessFor(...)` returns the relay access (`createGatedAccess`) for an upload when the wallet holds a pass and the relay is not the public one, else `undefined` |
| `probeRelay`, `parseTipFromConfig`, `parseTipConfig`, `estimateTipMist`, `describeTip`, `fetchTipConfig` | functions | pure `/v1/tip-config` helpers, unit-testable, no dependencies. `describeTip` classifies a tip as `none`, `known`, `unknown` or `over-ceiling` so an unknown tip is never shown as a free relay |
| `walrusBlobUrl`, `walruscanBlobUrl`, `WALRUS_AGGREGATOR_HOSTS`, `PUBLIC_WALRUS_RELAY_HOSTS`, `MAX_SINGLE_RESERVATION_EPOCHS` | functions, constants | aggregator and explorer URLs, the public Mysten relays (the fallback host per network), `53` |
| `CORE_UPLOAD_STEPS`, `GATED_UPLOAD_STEPS`, `isUploadProgress` | constants | the stepper definitions for an upload |

## Design notes

- **Injection over import.** `WalrusUpload` takes a `performUpload(bytes, { relayHost, onStatus })` callback instead of importing
  `@mysten/walrus` or a wallet, which keeps the package light and wallet-agnostic and preserves the lazy-load boundary (the app decides
  when to pull the wasm chunk). The app wires it with `runBlobUpload` from `@meddleware/walrus-storage-client/flow`; the progress,
  result, certify-retry and existing-copy types are that subpath's.
- **Pinned deployment.** `relayGateConfig` takes the package and `PlatformConfig` from `@meddleware/access-gate-client/deployments`,
  never from the caller.
- **The chain is the authority on the price.** The prompt shows what the `Gate` and `PlatformConfig` objects say, and `purchase` reads
  them again before the wallet opens: if they differ from what was shown, or the gate is paused, no wallet prompt opens.
- **One access-gate implementation.** `useAccessGate` builds on `@meddleware/access-gate-client`, not a private copy.

## Test

```bash
npm test            # Vitest: pure helpers, composables against a fake client, the widgets mounted
npm run type-check
npm run lint
npm run test:e2e    # Playwright and axe over gallery/, every theme × season (needs Chromium)
```
