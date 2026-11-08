---
title: "Walrus Storage SDK"
description: "Install and configure @meddleware/walrus-storage-client, upload and read Walrus blobs in the browser and in Node.js, and the types it returns."
---

# Walrus Storage: SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/) | [Generated API reference →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/api/)

[`@meddleware/walrus-storage-client`](https://www.npmjs.com/package/@meddleware/walrus-storage-client) wraps `@mysten/walrus`: a
configured client factory, upload flows that work with wallet pop-ups, lifetime extension, on-chain blob attributes, owned-blob
queries, and access tokens for gated upload relays.

## Install

```bash
npm install @meddleware/walrus-storage-client @mysten/walrus @mysten/sui
```

`@mysten/sui` (`^2.33.2`) and `@mysten/walrus` (`~1.2.32`) are peer dependencies; the package declares `engines.node >=24`. It ships
TypeScript source plus declarations.

| Entry | Contents |
| --- | --- |
| `@meddleware/walrus-storage-client` | `createWalrusClient`, the upload flows, lifetime, attributes, cost, owned blobs, relay access helpers, constants |
| `…/flow` | The upload orchestrator `runBlobUpload`, gated relay access (`createGatedAccess`), error conventions, persisted consume and certificate records. It never imports the package root statically, so the wasm client stays out of an app's eager bundle |
| `…/http` | `storeBlobViaPublisher` and `readBlob`: no wallet, wasm or `@mysten/walrus` |
| `…/node` | `uploadLocalFile` (reads a file from disk) |

## Create a client

```ts
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url' // browser (Vite) only
import { createWalrusClient } from '@meddleware/walrus-storage-client'

const walrus = createWalrusClient({
  network: 'testnet',          // 'testnet' | 'mainnet' (default 'testnet')
  wasmUrl: walrusWasmUrl,      // required in the browser; ignored in Node.js
  // rpcUrl: 'https://…',            // default: the public Sui fullnode (DEFAULT_RPC_URLS)
  // uploadRelayHost: 'https://…',   // default: the public Mysten relay for the network; https only (http for localhost)
  // uploadRelayAuthToken: token,    // Bearer token for a gated relay (see the integration guide)
  // uploadRelayMaxTipMist: 5_000_000, // refuse a relay tip above this (default 0.005 SUI)
  // disableUploadRelay: true,       // write directly to the storage nodes (Node.js; browsers cannot)
})
```

The client is a Sui gRPC client extended with Walrus (`walrus.walrus.*`); pass it wherever a Sui client is needed. A browser needs an
upload relay (a direct write to storage nodes fails from a browser). `disableUploadRelay` overrides both an explicit
`uploadRelayHost` and the default.

Exported constants: `DEFAULT_RPC_URLS`, `PUBLIC_UPLOAD_RELAY_HOSTS` (the public Mysten relays), `WALRUS_AGGREGATOR_HOSTS`,
`TESTNET_WALRUS_PACKAGE_CONFIG`, `MAINNET_WALRUS_PACKAGE_CONFIG`, `DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST`,
`MAX_SINGLE_RESERVATION_EPOCHS` and `LONG_TERM_EPOCHS`.

## Storage lifetime

Walrus is **not** permanent storage: every blob expires after its reserved epochs (about 2 weeks each). One reservation covers at most
`MAX_SINGLE_RESERVATION_EPOCHS` (53, Walrus's `max_epochs_ahead`); reaching `LONG_TERM_EPOCHS` (200, about 7.7 years) needs periodic
renewal with `extendBlobLifetime`. Extend **before** expiry. Blobs are registered permanent (not deletable) unless you pass
`deletable: true`; only set that when cleanup is guaranteed before expiry. `assertEpochs(epochs, max)` validates an epoch count (an
integer from 1 to the network's maximum) before any wallet prompt.

## Upload in the browser

Uploading takes two wallet signatures, register then certify, around the upload to storage nodes. `createBlobUploadFlow` stores the raw
bytes, so `…/v1/blobs/<blobId>` serves the file itself (use it for images and anything linked directly); `createUploadFlow` stores a
quilt of named files instead, whose blob id does not resolve to a raw file.

```ts
import { createBlobUploadFlow, walrusBlobUrl } from '@meddleware/walrus-storage-client'

const flow = createBlobUploadFlow(walrus, bytes)
await flow.encode()

const registerTx = flow.register({ epochs: 53, owner: address, deletable: false })
const { digest } = await exec.signAndExecute(registerTx)   // wallet approval 1
await exec.waitForTransaction(digest)
await flow.upload({ digest })                               // to storage nodes (via the relay)

const cert = await exec.signAndExecute(flow.certify())      // wallet approval 2
await exec.waitForTransaction(cert.digest)
const { blobId } = await flow.getBlob()
console.log(walrusBlobUrl('testnet', blobId))
```

`exec` is any executor that signs and executes a `Transaction`: in Meddleware apps, `buildExecutor()` from
[`@meddleware/wallet-adapter`](/libraries/wallet-adapter). An app that wants progress reporting, retries on the same registration and
the existing-copy precheck uses `runBlobUpload` instead; see the [integration guide](./integration).

## Upload from Node.js

```ts
import { createWalrusClient, MAX_SINGLE_RESERVATION_EPOCHS } from '@meddleware/walrus-storage-client'
import { uploadLocalFile } from '@meddleware/walrus-storage-client/node'

const walrus = createWalrusClient({ network: 'testnet' })
const { blobId, blobObjectId } = await uploadLocalFile(walrus, 'assets/icon.png', 'icon.png', keypair, {
  epochs: MAX_SINGLE_RESERVATION_EPOCHS,
})
```

`uploadBytes(client, contents, identifier, signer, options)` and `uploadImageBytes(client, contents, signer, options)` are the
in-memory variants (a quilt and a raw blob). The options are `{ epochs?, deletable?, tags? }`; `epochs` defaults to the network's
maximum. The signer pays gas and the WAL for storage.

## Read a blob

Blobs are public: read them from any Walrus aggregator. `readBlob` adds a timeout, a size cap (100 MiB by default; `maxBytes` to
change it), refuses redirects and asks the aggregator for its strict consistency check; `walrusBlobUrl` gives a plain URL for
`<img src>` and links. **The aggregator is trusted for the bytes it returns**: no blob id is re-derived locally. Sealed content is
protected by its own authenticated encryption; for plaintext that matters, verify it by other means.

```ts
import { WALRUS_AGGREGATOR_HOSTS, walrusBlobUrl } from '@meddleware/walrus-storage-client'
import { readBlob } from '@meddleware/walrus-storage-client/http'

const bytes = await readBlob(blobId, { aggregator: WALRUS_AGGREGATOR_HOSTS.testnet })
const href = walrusBlobUrl('testnet', blobId)
```

## Result types

What the functions return, as the package declares it:

```ts
// uploadBytes, uploadImageBytes, uploadLocalFile
type UploadResult = {
  blobId: string        // Walrus content-addressed blob id: the stable handle used to read the blob back
  blobObjectId: string  // the on-chain Walrus Blob object id (what extend, attributes and certify act on)
}

// fetchOwnedWalrusBlobs
type OwnedBlob = {
  objectId: string   // the on-chain Blob object id
  blobId: string     // aggregator-URL-compatible blob id
  size: number       // bytes
  startEpoch: number
  endEpoch: number   // storage expires at this epoch
  certified: boolean
  deletable: boolean // blobs are registered permanent by default
}

// estimateStorageCost: bigint amounts in WAL base units (FROST, 10^-9 WAL)
interface StorageCost {
  storageCost: bigint // per-epoch storage cost × epochs: the part an extension pays
  writeCost: bigint   // one-time write cost, paid on registration and not on extend
  totalCost: bigint   // storageCost + writeCost
}

// runBlobUpload (/flow)
interface BlobUploadResult {
  blobId: string
  url: string         // aggregator URL that serves the raw bytes
  digest?: string     // the certify transaction digest
}

// storeBlobViaPublisher (/http)
interface PublishResult {
  blobId: string
  kind: 'newlyCreated' | 'alreadyCertified'
  endEpoch?: number
  blobObjectId?: string // for newlyCreated
}
```

With a publisher, `newlyCreated` means a `Blob` object was sent to `sendObjectTo`, whose lifetime that address controls;
`alreadyCertified` means the content was already stored, **no object was created for you**, and the blob lives only until `endEpoch`,
which may be sooner than the epochs you asked for. The publisher stores the blob permanent, refuses redirects and caps its response at
64 KiB; endpoints must be https.

## Errors

`RetryableWalrusClientError` (re-exported from `@mysten/walrus`) is thrown while Sui changes epoch and the client's cached state is
stale: call `walrus.walrus.reset()` and retry with a fresh flow. More in the [integration guide](./integration#errors).

See the [integration guide](./integration) for lifetime management, owned-blob listing, attributes and uploads through the gated relay,
and [Self-host a relay](./relay-self-host) to run your own.
