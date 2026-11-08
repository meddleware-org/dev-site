---
title: "Sealed Storage SDK"
description: "Install and configure @meddleware/sealed-storage-client, the Seal key-server committees for testnet and mainnet, the encrypt, store and decrypt flow, and the manifest format."
---

# Sealed Storage: SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/) | [Generated API reference →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/api/)

Sealed Storage encrypts data client-side with [Seal](https://seal-docs.wal.app/) threshold
encryption and stores the ciphertext on Walrus. A Seal key server releases its key share only if an
on-chain policy (`sealed_storage::<module>::seal_approve*`) succeeds in a dry run with the requester
as sender, so only addresses that satisfy the policy can decrypt.

[`@meddleware/sealed-storage-client`](https://www.npmjs.com/package/@meddleware/sealed-storage-client) is the client half:

- **Policy providers** — one per Move policy module. Each builds the Seal identity for new content
  and the approve call for decryption. Built in: `nft-gate` (holders of an access-gate pass) and
  `time-lock` (anyone, after a time).
- **`PolicyRegistry`** — the set of providers an app offers (`createDefaultRegistry()` registers
  both built-ins).
- **`SealController`** — threshold `encrypt` / `decrypt` over a key-server committee, and the
  per-address session key (one wallet signature, cached until it expires).

## Install

```bash
npm install @meddleware/sealed-storage-client @mysten/seal @mysten/sui
```

`@mysten/seal` (`^1.4.18`) and `@mysten/sui` (`^2.33.2`) are peer dependencies, so the app provides one copy of each;
`@meddleware/access-gate-client` is a dependency (the `nft-gate` provider reads gates through it). The package declares
`engines.node >=24` and has three entries: the main one, `/controller` (`SealController`, so an app can lazy-load `@mysten/seal`) and
`/deployments`.

## Create a controller

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { createDefaultRegistry } from '@meddleware/sealed-storage-client'
import { SealController } from '@meddleware/sealed-storage-client/controller' // also on the main entry; the subpath lets apps lazy-load @mysten/seal
import { sealPoliciesDeployment } from '@meddleware/sealed-storage-client/deployments'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

const suiClient = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })

// originalId: identities are bound to it (never changes); publishedAt: the latest version, the
// target of seal_approve calls; policyConfigId: the shared version gate every seal_approve reads.
// All three come from the package's recorded deployments.
const { originalId, publishedAt, policyConfigId } = sealPoliciesDeployment('testnet')
// The access_gate package that sealed_storage links: with it set, `encrypt('nft-gate', …)` reads the gate
// first and refuses one that is not a Gate of that package, or whose passes are transferable.
const accessGateOriginalId = accessGateDeployment('testnet').originalId

const registry = createDefaultRegistry(accessGateOriginalId)

const seal = new SealController(
  {
    suiClient,
    originalId,
    publishedAt,
    policyConfigId,
    accessGateOriginalId,
    threshold: 2,
    serverConfigs: [
      // The testnet key servers listed under "Key-server committees" below
      { objectId: '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98', weight: 1,
        aggregatorUrl: 'https://seal-aggregator-testnet.mystenlabs.com' },
      { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
      { objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', weight: 1 },
    ],
  },
  registry,
)
```

::: warning Seal to soulbound gates only
With `accessGateOriginalId` set, `encrypt('nft-gate', …)` **refuses a gate that mints transferable
passes** (`allowTransferableGates: true` opts in). The holder of a transferable pass can freeze or
share it, after which anyone can present it and the policy approves — the content is then effectively
public. Seal to a soulbound gate, and leave `accessGateOriginalId` unset only if you check this
yourself: without it the controller does not read the gate.
:::

### Key-server committees

Decryption uses a **t-of-n** committee of key servers. Encryption targets every configured server; decryption needs `threshold` of
them (weighted by `weight`) to release key shares, after the on-chain policy has approved the requester. The threshold must lie in
`[1, total weight]`. A short-lived **session key** (`sessionTtlMin`, default 10 minutes), signed once per address with one wallet
personal-message signature, authorises the release and is cached until it expires (`controller.clearSession(address?)` drops it).
Each ciphertext records the servers and threshold it was encrypted under, so changing servers affects new content only; see
[re-sealing](./integration#re-seal-onto-new-key-servers).

A committee behind an aggregator (`aggregatorUrl`) counts as **one** server: its own threshold is internal and the key-server URL
verification (`verifyKeyServers`, on by default for independent servers) is off for it. `verifyKeyServers` is one switch for the whole
configuration, so a mixed setup runs without URL verification for the independent servers too (`controller.verifiesKeyServers` tells
you). An API key (`apiKeyName` and `apiKey`, for a permissioned server or an authenticated aggregator) is **public** once it ships in
a browser bundle, so never rely on one for secrecy; the Meddleware apps use keyless servers.

**Testnet** (the defaults `sealed-storage-ui` uses; threshold 2):

| Server object id | What it is |
| --- | --- |
| `0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98` | Mysten's decentralised testnet committee, reached through the aggregator `https://seal-aggregator-testnet.mystenlabs.com` (one server) |
| `0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75` | a Mysten Open-mode key server |
| `0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8` | a Mysten Open-mode key server |

**Mainnet, not yet used: no mainnet `sealed_storage` deployment.** The committee the apps are configured for once there is one: three
independent Open-mode servers (keyless, no aggregator) at threshold 2, so no single operator can decrypt and one may be down. Their
`/v1/service` endpoints were checked on 2026-11-07 (workspace decision D24); a full mainnet encrypt and decrypt has not been, because
the package does not exist on mainnet.

| Operator | Server object id | URL |
| --- | --- | --- |
| Overclock | `0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6` | `https://seal-mainnet-open.overclock.run` |
| NodeInfra | `0x1afb3a57211ceff8f6781757821847e3ddae73f64e78ec8cd9349914ad985475` | `https://open-seal-mainnet.nodeinfra.com` |
| H2O Nodes | `0x4a65b4ff7ba8f4b538895ee35959f982a95f0db7e2a202ec989d261ea927286a` | `https://seal.sui-mainnet.h2o-nodes.com` |

Open mode has no client isolation and no key export, and the operators publish no terms: if one withdraws, content sealed under it
must be re-sealed while the others still answer; two leaving at once would lock content sealed under them.

These ids are checked: `npm run check:onchain-ids` fails on any 32-byte id in a page that is neither a deployment id of the installed
clients nor listed, with its reason, under `meddleware.onchainIds.otherIds` in the site's `package.json`, and a test keeps this table,
the sample above and that list equal.

## The flow

1. **Encrypt** — `seal.encrypt(policyType, params, bytes)` returns `{ id, ciphertext }`. `id` (hex)
   is the Seal identity; it contains a random nonce, so it cannot be recomputed later.
2. **Store** — upload `ciphertext` to Walrus and keep a **manifest** that points to it.
3. **Decrypt** — `seal.decrypt(policyType, params, id, ciphertext, { address, signPersonalMessage })`
   builds the policy's approve transaction, obtains key shares from the committee and decrypts
   locally.

## The manifest

`SealedManifest` is the interchange format between encrypting and decrypting apps. It contains no
secrets and can be stored anywhere:

```ts
interface SealedManifest {
  policyType: string              // 'nft-gate' | 'time-lock' | …
  id: string                      // Seal identity (hex, no 0x) — required verbatim to decrypt
  blobId: string                  // Walrus blob id of the ciphertext
  network: string                 // where the policy package + key servers live
  params?: Record<string, unknown> // non-secret policy params, e.g. { gateId }
  label?: string
}
```

Validate untrusted manifests with `parseSealedManifest(raw, registry)` (throws `SealedManifestError`; the
registry also validates the policy's `params`), then
check `network` matches your app.

## SDK surface

| Export | What it is |
| --- | --- |
| `SealController` (`/controller`) | `encrypt(type, params, data)` → `{ id, ciphertext }`; `decrypt(type, params, id, ciphertext, { address, signPersonalMessage })`; `explainRefusal(type, params, id, { address })`; `clearSession(address?)`; `verifiesKeyServers`. No policy logic lives here |
| `PolicyRegistry`, `createDefaultRegistry(accessGateOriginalId)` | register providers (`register(provider, { replace? })`, `list()`); the default registry holds `nft-gate` and `time-lock` |
| `createNftGateProvider`, `timeLockProvider` | the built-in `SealPolicyProvider`s; each builds the Seal identity for new content (`buildId`), the approve call (`buildApprove`), checks an identity (`verifyId`) and may validate manifest params (`parseParams`) |
| `parseSealedManifest(raw, registry)`, `SealedManifestError` | validate an untrusted manifest |
| `buildPublishSealedContentTx`, `buildPublishSealedContentTransaction`, `listSealedContent`, `parseSealedContentEvent`, `sealedContentEventType`, `SEALED_CONTENT_LIMITS` | the discovery registry (see the [integration guide](./integration#publish-a-discovery-pointer-optional)) |
| `POLICY_ABORTS`, `classifyPolicyAbort`, `describePolicyAbort`, `parseMoveAbort` | abort codes of the `sealed_storage` modules, read by `(module, code)` |
| `explainApproveRefusal`, `refusalMessage`, `REASON_NOT_OWNER` | why a decrypt was refused, from a simulation of the approve call |
| `gateOperators`, `assertLinkedGate` | the addresses to trust as authors of a gate's content (its `payment_recipient` plus addresses you vouch for); a check that a gate belongs to the linked `access_gate` package |
| `describeCiphertext`, `sealedUnderServers` (`/controller`) | read the servers and threshold a ciphertext was sealed to, for re-sealing |
| `hexToBytes`, `bytesToHex`, `objectIdBytes`, `u64beBytes`, `randomBytes`, `concatBytes` | the byte helpers the providers build identities with |

Safety defaults: `decrypt` refuses a ciphertext whose header names a different identity or policy package than expected,
`checkShareConsistency` is on, and a gate that mints transferable passes is refused unless `allowTransferableGates` is set.

See the [integration guide](./integration) for end-to-end code and [Writing policies](./policies)
for adding a policy.

