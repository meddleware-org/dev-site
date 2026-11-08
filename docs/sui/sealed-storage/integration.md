---
title: "Sealed Storage integration guide"
description: "Encrypt to an access gate or a time lock, store the ciphertext on Walrus, decrypt, publish and list discovery pointers, explain refusals and re-seal onto new key servers."
---

# Sealed Storage: integration guide

Examples use the `seal` controller and `registry` from the [SDK setup](./), a Walrus client `walrus` from
[`createWalrusClient`](/sui/walrus-storage/), and an executor `exec` that signs and executes
transactions (in Vue: `@meddleware/wallet-adapter`).

## Encrypt to an access gate and store on Walrus

```ts
import { createBlobUploadFlow } from '@meddleware/walrus-storage-client'
import type { SealedManifest } from '@meddleware/sealed-storage-client'

// 1. Encrypt locally: anyone holding a valid pass for `gateId` will be able to decrypt. The
//    controller (SDK setup) refuses a gate that mints transferable passes: seal to a soulbound gate.
const { id, ciphertext } = await seal.encrypt('nft-gate', { gateId }, plaintextBytes)

// 2. Store the ciphertext (register → upload → certify; see Walrus Storage)
const flow = createBlobUploadFlow(walrus, ciphertext)
await flow.encode()
const reg = await exec.signAndExecute(flow.register({ epochs: 53, owner: address, deletable: false }))
await exec.waitForTransaction(reg.digest)
await flow.upload({ digest: reg.digest })
const cert = await exec.signAndExecute(flow.certify())
await exec.waitForTransaction(cert.digest)
const { blobId } = await flow.getBlob()

// 3. Keep the manifest — it is all a reader needs
const manifest: SealedManifest = { policyType: 'nft-gate', id, blobId, network: 'testnet', params: { gateId } }
```

Sealing to a gate whose passes are **transferable** is refused unless the controller was created with
`allowTransferableGates: true`: a holder can freeze or share such a pass, and the content becomes
effectively public. The check needs `accessGateOriginalId` in the controller config (see
[Create a controller](./#create-a-controller)).

A time lock instead: `seal.encrypt('time-lock', { unlockMs: Date.parse('2027-01-01') }, bytes)`.

## Decrypt

```ts
import { parseSealedManifest, SealedManifestError } from '@meddleware/sealed-storage-client'
import { WALRUS_AGGREGATOR_HOSTS } from '@meddleware/walrus-storage-client'
import { readBlob } from '@meddleware/walrus-storage-client/http'

const m = parseSealedManifest(untrustedJson, registry) // `registry` from the SDK setup: it also validates the policy's params
if (m.network !== 'testnet') throw new Error('Manifest is for another network')

// Timeout, size cap (100 MiB by default) and the aggregator's strict consistency check.
const ciphertext = await readBlob(m.blobId, { aggregator: WALRUS_AGGREGATOR_HOSTS.testnet })

// nft-gate needs the reader's pass: its object id, and whether the gate is soulbound
const plaintext = await seal.decrypt(
  m.policyType,
  { ...m.params, nftId: passId, soulbound },
  m.id,
  ciphertext,
  { address, signPersonalMessage: (message) => wallet.signPersonalMessage({ message }) },
)
```

The first decrypt for an address asks the wallet for one personal-message signature (the Seal
session key); later decrypts reuse it until it expires. Find the reader's pass with
`fetchAccessNfts(client, address, nftType, gateId)` from `@meddleware/access-gate-client`.

## Publish a discovery pointer (optional)

`sealed_content::publish` records an on-chain pointer (gate, blob, identity, label) so unlock UIs can
list what a gate protects. It is **not** a policy and grants nothing. Strings are bounded in bytes (`SEALED_CONTENT_LIMITS`: label
256, blob id 128, Seal id 256), and the builders refuse a longer one before the wallet opens:

```ts
import { Transaction } from '@mysten/sui/transactions'
import { buildPublishSealedContentTx } from '@meddleware/sealed-storage-client'

const tx = new Transaction()
// { publishedAt, policyConfigId } from sealPoliciesDeployment(network)
buildPublishSealedContentTx(tx, { publishedAt, policyConfigId }, { gateId, blobId, sealId: id, label: 'Chapter 1' })
await exec.signAndExecute(tx)
```

**Anyone can publish a pointer under any gate with any label** (the contract does not validate `gate_id`, and there is no update or
delete). A pointer is not proof of who made the content, and **Seal gives confidentiality, not authenticity**: a pass holder decrypts
anything sealed to the gate's namespace successfully. A UI lists only the pointers of the gate's owner, with `gateOperators`:

```ts
import { gateOperators, listSealedContent } from '@meddleware/sealed-storage-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

const publishers = await gateOperators(client, gateId, accessGateDeployment('testnet').originalId, [address])
const page = await listSealedContent(client, {
  originalId,        // the sealed_storage original id
  gateId,
  publishers,        // only pointers published by these addresses
  limit: 50,         // at most 200
  // indexer: { url: 'https://sui-indexer.meddleware.dev', network: 'testnet' }, // optional, display only
})
page.pointers // newest first: { contentId, gateId, blobId, sealId, label, publisher, txDigest, checkpoint }
page.cursor   // pass back as `cursor` for older pointers; page.skipped counts rows that did not decode
```

Pointers are decoded from the event's BCS bytes and must be this package's `SealedContentPublished`. With `indexer`, the first page is
read from the [read indexer](/sui/indexer) and falls back to the full node if the indexer fails, times out or is stale; the reason is in
`page.indexerError`. A public full node keeps only a short window of events, so on its own the listing is not the full history.

## Why was a decrypt refused

**A key server's refusal does not carry the abort.** The public testnet committee answers `NoAccessError` for every policy abort and
`InvalidParameterError` when the requester does not own an address-owned pass, so `classifyPolicyAbort(error)` finds nothing in the error
of `decrypt`. `SealController.explainRefusal` simulates the same approve transaction as the requester, one read-only RPC that never signs
and never spends, and returns the real reason:

```ts
import { NoAccessError, InvalidParameterError } from '@mysten/seal'

try {
  await seal.decrypt('nft-gate', { gateId, nftId: passId, soulbound }, id, bytes, { address, signPersonalMessage: (message) => wallet.signPersonalMessage({ message }) })
} catch (e) {
  if (!(e instanceof NoAccessError || e instanceof InvalidParameterError)) throw e
  const why = await seal.explainRefusal('nft-gate', { gateId, nftId: passId, soulbound }, id, { address })
  // why.kind: 'refused' (why.reason such as 'E_GATE_PAUSED', 'E_EXHAUSTED', 'E_WRONG_GATE', 'E_TOO_EARLY', 'E_WRONG_VERSION',
  //           'NOT_OWNER'), 'allowed' (the policy approves: the key servers were the problem) or 'unknown'
  console.error(why.message)
}
```

The answer is the chain's view through the full node your client uses, an estimate for the UI; the key servers decide. A controller
keeps the keys it has fetched, so a pause or an exhausted pass reaches only a controller created afterwards. Without a controller,
`explainApproveRefusal(client, approveTx, { sender, policyPackageIds })` explains a transaction you built yourself.

## Re-seal onto new key servers

A ciphertext can only be decrypted by the key servers it was sealed to. To move content to a new server set (for example when a
provider withdraws), decrypt it with a controller configured for the servers its header records, then encrypt the plaintext with the
current one:

```ts
import { describeCiphertext, sealedUnderServers, SealController } from '@meddleware/sealed-storage-client/controller'

const info = describeCiphertext(bytes) // { id, packageId, threshold, servers }
const currentServers = [{ objectId: '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98', weight: 1 }]
if (!sealedUnderServers(info, currentServers, 2)) {
  const old = new SealController(
    { suiClient, originalId, publishedAt, policyConfigId, threshold: info.threshold, serverConfigs: info.servers },
    registry,
  )
  const plaintext = await old.decrypt('nft-gate', { gateId, nftId: passId, soulbound }, info.id, bytes, { address, signPersonalMessage: (message) => wallet.signPersonalMessage({ message }) })
  const next = await seal.encrypt('nft-gate', { gateId }, plaintext)
  // store next.ciphertext and write a new manifest with next.id; the old ciphertext still needs its old servers
}
```

## What access means

- **Membership, not consumption.** Decrypting never spends a single-use pass; an exhausted
  (zero-use) pass cannot decrypt.
- **No revocation.** A released key stays usable, and a decrypted file stays decrypted. Transferring
  a pass moves future access with it.
- **Pause.** If the gate was created with the policy `pause_blocks_decryption`, a paused gate denies
  new decryptions (`nft_gate` abort 4) until it is unpaused — tell the user it is paused rather than
  that their pass is invalid. Otherwise pausing only stops sales.

## Errors

| Where | Meaning | Handling |
| --- | --- | --- |
| `nft_gate` abort 1 | identity not namespaced to this gate | wrong manifest/gate pairing |
| `nft_gate` abort 2 | pass is for another gate | pick the pass for `params.gateId` |
| `nft_gate` abort 3 | pass has no uses left | buy another pass |
| `nft_gate` abort 4 | gate paused and its policy blocks decryption | retry after the gate owner unpauses |
| `timelock` abort 2 | before the unlock time | show the unlock date |
| `SealedManifestError` | malformed manifest | reject the input |
| `config` abort 1 | the called package version has been retired | rebuild against the current `publishedAt` |
| `NoAccessError`, `InvalidParameterError` (`@mysten/seal`) | a key server refused | call `explainRefusal` for the reason |
| key-server / network errors | committee unavailable or below threshold | retry; decryption fails closed |

Codes repeat across modules — always key on `(module, code)` ([PTB patterns](/sui/ptb-patterns#error-handling)).
