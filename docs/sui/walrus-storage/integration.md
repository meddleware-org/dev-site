# Walrus Storage — Integration guide

All examples use a client from [`createWalrusClient`](./#create-a-client) and an executor `exec`
that signs and executes a `Transaction` (in a Vue app: `buildExecutor()` from
`@meddleware/wallet-adapter`).

## Uploading through the NFT-gated relay

Meddleware's relay, `https://sui-walrus-storage-relay-testnet.meddleware.dev`, is the Mysten
`walrus-upload-relay` behind an [access-gate gateway](/sui/access-gate/gateway). Uploads need a
wallet-signed access proof; `GET /v1/tip-config` is public.

The testnet gateway runs in **single-use** mode: each upload spends one use of an access pass, so
the proof must carry the digest of an on-chain `consume` bound to the gateway's challenge nonce.
`@meddleware/walrus-storage-client/flow` runs the whole upload, including that step:

```ts
import type { Transaction } from '@mysten/sui/transactions'
import { consumeStorageKey, createGatedAccess, runBlobUpload } from '@meddleware/walrus-storage-client/flow'
import { buildConsumeTx } from '@meddleware/access-gate-client'

const RELAY = 'https://sui-walrus-storage-relay-testnet.meddleware.dev'

const access = createGatedAccess<Transaction>({
  storage: localStorage,
  key: consumeStorageKey('testnet', gateConfig.gateId, address),
  relayHost: RELAY,
  address,
  gateId: gateConfig.gateId,   // signed into every proof, with the network
  network: 'testnet',
  nftId: passId,
  singleUse: usesRemaining !== null, // an unlimited pass only signs
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
- **Register is never resumed** (see Tips below).
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

`gateConfig` is the `AccessGateConfig` of the gate the relay checks — `relayGateConfig(network,
{ gateId, soulbound, priceMist })` from
[`@meddleware/walrus-storage-kit`](https://www.npmjs.com/package/@meddleware/walrus-storage-kit) builds it with
Meddleware's deployment — and `passId` a pass the wallet holds for it (see
[Access Gate](/sui/access-gate/)).

### Tips

The relay charges a tip on each upload, paid inside the register transaction. Read the schedule from
`GET /v1/tip-config` (`parseTipFromConfig` in `@meddleware/walrus-storage-kit` extracts it), and cap what
the client will pay with `uploadRelayMaxTipMist`. The tip and a per-attempt nonce are embedded in the
register transaction, so a failed attempt is retried with a **fresh** flow — never by resuming an old
registration.

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

Costs are in WAL base units; an extension pays only the storage part.

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

## Errors

- **Epoch transitions:** uploads can fail with `RetryableWalrusClientError` (re-exported by
  `@meddleware/walrus-storage-client`) while Walrus changes epoch — retry with a fresh flow.
- **Gateway responses:** `401` — no proof; `403` — bad proof or signature, stale or reused nonce,
  no matching consume, or the wallet holds no valid pass; `409` — that consume was already redeemed
  for an upload, or one is in progress (a failed upload releases it for retry); `429` — per-address
  rate limit; `413` — body above the gateway's `MAX_BODY_BYTES`; `502` — the gateway could not reach
  a Sui fullnode.
- **Reservation too long:** more than 53 epochs in one reservation aborts on-chain; extend instead.
