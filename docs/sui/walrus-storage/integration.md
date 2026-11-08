---
title: "Walrus Storage integration guide"
description: "Upload through the gated relay with single-use access, extend and price blobs, list a wallet's blobs, set attributes, and handle the errors and the access-proof wire format."
---

# Walrus Storage: integration guide

All examples use a client from [`createWalrusClient`](./#create-a-client) and an executor `exec`
that signs and executes a `Transaction` (in a Vue app: `buildExecutor()` from
`@meddleware/wallet-adapter`).

## Uploading through the NFT-gated relay

Meddleware's relay, `https://sui-walrus-storage-relay-testnet.meddleware.dev`, is the Mysten
`walrus-upload-relay` behind an [access-gate gateway](/sui/access-gate/gateway). Uploads need a
wallet-signed access proof; `GET /v1/tip-config` is public. If a wallet has no pass, an app can fall back to the public Mysten relay
(`PUBLIC_UPLOAD_RELAY_HOSTS`), which charges its own tip and needs no proof.

The testnet gateway runs in **single-use** mode: each upload spends one use of an access pass, so
the proof must carry the digest of an on-chain `consume` bound to the gateway's challenge nonce.
`@meddleware/walrus-storage-client/flow` runs the whole upload, including that step:

```ts
import type { Transaction } from '@mysten/sui/transactions'
import { consumeStorageKey, createGatedAccess, runBlobUpload } from '@meddleware/walrus-storage-client/flow'
import { buildConsumeTx, fetchAccessNfts } from '@meddleware/access-gate-client'

const RELAY = 'https://sui-walrus-storage-relay-testnet.meddleware.dev'

// A pass the wallet holds for the gate the relay guards (see Access Gate)
const [pass] = await fetchAccessNfts(client, address, gateConfig.nftType, gateConfig.gateId)
if (!pass) throw new Error('This wallet holds no pass for the relay gate.')

const access = createGatedAccess<Transaction>({
  storage: localStorage,
  key: consumeStorageKey('testnet', gateConfig.gateId, address),
  relayHost: RELAY,
  address,
  gateId: gateConfig.gateId,   // signed into every proof, with the network
  network: 'testnet',
  nftId: pass.objectId,
  singleUse: pass.variant.kind === 'singleUse', // an unlimited pass only signs
  buildConsume: (id, nonce) => buildConsumeTx(gateConfig, id, nonce),
  signAndExecute: (tx) => exec.signAndExecute(tx),
  waitForTransaction: (digest) => exec.waitForTransaction(digest),
  sign: (message) => wallet.signPersonalMessage({ message }),
})

const { blobId, url } = await runBlobUpload({
  bytes, network: 'testnet', relayHost: RELAY, address, epochs: 53, wasmUrl,
  executor: exec, suiClient, access,
  onStatus: ({ step, detail }) => console.log(step, detail),
})
```

What the flow guarantees:

- **The consume is never wasted.** Its digest is persisted before the upload and reused if the
  upload is interrupted; it is cleared once the upload lands. If the gateway answers `409 redeemed`
  (an earlier upload already used it), one new use is spent and the upload retried on the same
  registration.
- **Register is never resumed across page loads** (see Tips below). Within the relay's freshness window a failed *upload* is retried on
  the **same registration**, up to `UPLOAD_ATTEMPTS` (3) times with a fresh access token each time, so a relay 5xx or a dropped
  connection never costs a second paid registration; when attempts run out the error carries `getUploadRetry(err)`.
- **A certify-only failure is retryable** without re-uploading: `getCertifyRetry(err)` returns the
  retry; `savePendingCertify` keeps the certificate so certify can finish after a reload.
- **Duplicates are caught before paying:** pass `findExistingCopy` and an existing owned copy aborts
  before register (`getDuplicateExisting(err)`).

For a gateway **without** single-use mode, `createRelayAccessToken` from `@meddleware/walrus-storage-client`
returns a token to pass as `createWalrusClient({ uploadRelayAuthToken })`:

```ts
import { createRelayAccessToken, createWalrusClient } from '@meddleware/walrus-storage-client'

const RELAY = 'https://sui-walrus-storage-relay-testnet.meddleware.dev' // as above

const token = await createRelayAccessToken({
  relayHost: RELAY,
  address,
  gateId: gateConfig.gateId,   // the gate the relay guards, and the network, are signed into the proof
  network: 'testnet',
  sign: (message) => wallet.signPersonalMessage({ message }),
})
const relayWalrus = createWalrusClient({ network: 'testnet', uploadRelayHost: RELAY, uploadRelayAuthToken: token })
```

`gateConfig` is the `AccessGateConfig` of the gate the relay checks: `relayGateConfig(network, { gateId, soulbound })` from
[`@meddleware/walrus-storage-kit`](/libraries/walrus-storage-kit) builds it with the published `access_gate` deployment (the price is
read from the gate on the chain), and a pass is one the wallet holds for that gate (see [Access Gate](/sui/access-gate/)).

### Tips

The relay charges a tip on each upload, paid inside the register transaction. Read the schedule from
`GET /v1/tip-config` (`parseTipFromConfig` in [`@meddleware/walrus-storage-kit`](/libraries/walrus-storage-kit) extracts it), and cap what
the client will pay with `uploadRelayMaxTipMist` (default `DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST`, 0.005 SUI; the Walrus SDK refuses an
upload whose relay tip exceeds it). The tip and a per-attempt nonce are embedded in the register transaction, so the relay rejects an
old one: after a reload or an expired registration, start a **fresh** flow rather than resuming the old registration.

## Extend a blob's lifetime

```ts
import { extendBlobLifetimeTransaction } from '@meddleware/walrus-storage-client'

const tx = await extendBlobLifetimeTransaction(walrus, blobObjectId, { epochs: 26 }) // or { endEpoch }
await exec.signAndExecute(tx)
```

`extendBlobLifetime(walrus, blobObjectId, keypair, options)` signs and executes in one call (Node.js).

## Estimate storage cost

```ts
import { estimateStorageCost } from '@meddleware/walrus-storage-client'

const { storageCost, writeCost, totalCost } = await estimateStorageCost(walrus, bytes.length, 53)
```

Costs are `bigint` amounts in WAL base units (FROST: 1 WAL is 10^9 FROST); an extension pays only the `storageCost` part. Format them
exactly with `formatCoinAmount` from [`@meddleware/web-utils`](/libraries/web-utils).

## List a wallet's blobs

```ts
import { fetchOwnedWalrusBlobs } from '@meddleware/walrus-storage-client'

const blobs = await fetchOwnedWalrusBlobs(walrus, walrus, owner)
// [{ objectId, blobId, size, endEpoch, certified }]
```

The first argument is any Sui client with the Core API (the Walrus client is one); the Blob type is
resolved from the live Walrus package, so no address is hard-coded.

## Blob attributes

On-chain key/value metadata on a `Blob` object:

```ts
import { setBlobAttributesTransaction, readBlobAttributes } from '@meddleware/walrus-storage-client'

await exec.signAndExecute(await setBlobAttributesTransaction(walrus, blobObjectId, { 'content-type': 'image/png' }))
const attrs = await readBlobAttributes(walrus, blobObjectId) // null when none are set
```

A `null` value deletes that attribute.

## Upload through an HTTP publisher

For opaque bytes such as Seal ciphertext, a Walrus publisher can store the blob and send the `Blob` object to the user, with no wallet,
wasm or `@mysten/walrus`. Walrus runs no public publisher on mainnet (a publisher pays SUI and WAL itself), so a mainnet app needs its
own authenticated publisher:

```ts
import { storeBlobViaPublisher } from '@meddleware/walrus-storage-client/http'

const stored = await storeBlobViaPublisher(bytes, {
  publisher: 'https://publisher.walrus-testnet.walrus.space',
  epochs: 5,
  sendObjectTo: address,   // the user, not the publisher, owns the Blob object
  maxBytes: 10 * 1024 * 1024,
})
if (stored.kind === 'alreadyCertified') {
  // The content was already on Walrus: no object was created for `address`, and it lives until stored.endEpoch.
}
```

## The access proof on the wire

A gated relay (and any [access-gate gateway](/sui/access-gate/gateway)) verifies a proof made of two parts. Do not hand-build them: use
`createRelayAccessToken` or `createGatedAccess`, which call `@meddleware/access-gate-gateway-client`.

- **The personal message the wallet signs** (`access-gate-gateway:access:v3`, audience-bound), ASCII, one `key:value` line each:
  `origin`, `gate`, `network`, `nonce` and, for a single-use gateway, `consume` (the base58 digest of the consume transaction). The
  gateway rebuilds it from its own origin, gate and network, so a signature is useless at any other relay, gate, network or consume.
  The grammar and the conformance vectors are in the [gateway page](/sui/access-gate/gateway#the-wire-protocol).
- **The proof token**, sent as `Authorization: Bearer <token>`: base64 of the JSON
  `{ "address": "0x…", "nonce": "…", "signature": "…", "consumeDigest": "…" }` (`consumeDigest` only for single-use gateways), strict
  canonical padded base64.

`buildAccessProofToken(proof)` encodes a proof, `personalMessage(context)` returns the exact bytes to sign, and `fetchRelayChallenge(relayHost)`
reads `GET /v1/challenge`.

## Errors

- **Epoch transitions:** uploads can fail with `RetryableWalrusClientError` (re-exported by
  `@meddleware/walrus-storage-client`) while Walrus changes epoch — retry with a fresh flow.
- **Gateway responses:** `401` — no proof; `403` — bad proof or signature, stale or reused nonce,
  no matching consume, or the wallet holds no valid pass; `409` — body `code` `redeemed` (that consume was already spent) or `leased` (one is in progress) (a failed upload releases it for retry); `429` — per-address
  rate limit; `413` — body above the gateway's `MAX_BODY_BYTES`; `502` — the gateway could not reach
  a Sui fullnode.
- **Reservation too long:** more than 53 epochs in one reservation aborts on-chain (`assertEpochs` refuses it earlier); extend instead.
- **A flow error can carry an action.** `getDuplicateExisting(err)` returns an owned copy found before registering (offer Extend, or
  Certify when it is `pending`); `getCertifyRetry(err)` re-certifies after a certify-only failure without uploading again;
  `getUploadRetry(err)` retries the upload on the same registration. `savePendingCertify`, `loadPendingCertifies` and
  `clearPendingCertify` keep an uploaded but uncertified blob's certificate in storage so certify can finish after a reload.
