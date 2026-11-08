---
title: "Writing Seal policies"
description: "How Seal access policies work as Move functions, the built-in nft_gate and timelock policies and their identity layouts, and how to write and register your own policy."
---

# Writing policies

Seal access policies are **Move functions**, not objects: a Seal key server releases a key share only
if the policy's `seal_approve*` entry function **succeeds in a dry run** with the requester as sender.
The `sealed_storage` package (`sealed-storage-sui`) ships the built-in policies; its on-chain reference
is maintained with the package and imported into this site:

- [On-chain overview](/sui/onchain/sealed-storage/overview)
- [Developer integration](/sui/onchain/sealed-storage/dev-guide) — approve PTBs, identity layouts,
  discovery, normative rules
- [On-chain API reference](/sui/onchain/sealed-storage/api-reference) — every function, abort code and
  layout

## Built-in policies

| Module | Entry function | Access condition | Identity layout |
| --- | --- | --- | --- |
| `nft_gate` | `seal_approve(id, &PolicyConfig, &Gate, &AccessNFT)` / `seal_approve_soulbound(id, &PolicyConfig, &Gate, &SoulboundAccessNFT)` | caller holds a valid, non-exhausted pass for that gate | `[32-byte gate id][nonce]` |
| `timelock` | `seal_approve(id, &PolicyConfig, &Clock)` | on-chain clock ≥ `unlock_ms` | `[8-byte big-endian unlock_ms][nonce]` |

`sealed_content::publish` is **not** a policy — it is a permissionless discovery registry.

Every entry takes the package's shared `PolicyConfig` (from `sealPoliciesDeployment(network)`) and
aborts unless it names the current package version, so an upgrade can retire old policy code for every
key server at once. The client passes it for you.

There is nothing to create or deploy per policy: you encrypt under an identity with
`@meddleware/sealed-storage-client`, and at decryption time the client builds the approve transaction for the
key servers.

## Writing a custom policy

A new policy is a **new module** (existing modules are never edited) exposing its own `seal_approve*` entry function, plus a matching
provider in the client. The key servers dry-run the call, so the identity comes first and the version object second, then the
policy's own objects; that is the argument order `SealPolicyProvider.buildApprove` appends.

```move
module my_policies::allowlist;

use sui::vec_set::VecSet;

const VERSION: u64 = 1;
const E_NOT_ALLOWED: u64 = 1;
const E_BAD_ID: u64 = 2;
const E_WRONG_VERSION: u64 = 3;

/// The shared version gate: an upgrade bumps VERSION and migrates this object.
public struct Config has key { id: UID, version: u64 }
public struct Allowlist has key { id: UID, members: VecSet<address> }

/// Dry-run by the Seal key servers with the requester as sender. MUST be side-effect free:
/// immutable references only — no transfers, object creation, mutation or events.
entry fun seal_approve(id: vector<u8>, config: &Config, list: &Allowlist, ctx: &TxContext) {
    assert!(config.version == VERSION, E_WRONG_VERSION);
    // Namespace the identity to this object so content for list A cannot unlock with list B.
    assert!(id.length() >= 32, E_BAD_ID);
    let lid = object::id_bytes(list);
    let mut i = 0;
    while (i < 32) { assert!(id[i] == lid[i], E_BAD_ID); i = i + 1; };
    assert!(list.members.contains(&ctx.sender()), E_NOT_ALLOWED);
}
```

The client side is a `SealPolicyProvider`: the same identity layout, the same call, and the form metadata a generic UI renders.

```ts
import {
  concatBytes,
  objectIdBytes,
  randomBytes,
  type SealPolicyProvider,
} from '@meddleware/sealed-storage-client'

interface AllowlistParams {
  listId: string
}

const allowlistProvider: SealPolicyProvider<AllowlistParams> = {
  type: 'allowlist',
  // [32-byte list id][16-byte nonce]: the namespace prefix is what the Move function checks
  buildId: ({ listId }) => concatBytes(objectIdBytes(listId), randomBytes(16)),
  verifyId(idBytes, { listId }) {
    const want = objectIdBytes(listId)
    if (idBytes.length !== 48 || !want.every((b, i) => idBytes[i] === b)) {
      throw new Error('allowlist id does not belong to this list')
    }
  },
  buildApprove(tx, target, idBytes, { listId }) {
    tx.moveCall({
      target: `${target.publishedAt}::allowlist::seal_approve`,
      arguments: [tx.pure.vector('u8', Array.from(idBytes)), tx.object(target.policyConfigId), tx.object(listId)],
    })
  },
  describe: () => ({
    type: 'allowlist',
    label: 'Allowlist',
    help: 'Only addresses on the list can decrypt.',
    encryptFields: [{ name: 'listId', label: 'List', kind: 'objectId', required: true }],
    decryptFields: [{ name: 'listId', label: 'List', kind: 'objectId', required: true }],
  }),
}
```

Register it with `registry.register(allowlistProvider)` (a type that is already registered is refused; `{ replace: true }` replaces one on
purpose). `SealPolicyTarget` carries `{ publishedAt, policyConfigId }`: for a policy in your own package, build a `SealController`
whose `originalId`, `publishedAt` and `policyConfigId` are your package's, because Seal binds identities and session keys to the
original id of the package they are encrypted under. A provider may also implement `parseParams` so `parseSealedManifest(raw,
registry)` validates a manifest's params at import, and `suggest` to offer values from chain state.

Rules every policy MUST follow:

- The function name starts with `seal_approve` and its first argument is the identity `vector<u8>`.
- Side-effect free (it is dry-run, not executed); abort to deny.
- Length-check every identity byte you read, and keep the layout bit-for-bit identical to the client encoder: commit a shared
  conformance vector tested on both sides.
- Namespace identities to the controlling object so one object's access never unlocks another's content.
- Membership, not consumption: approval cannot spend anything, and a released key stays usable.
- If the package will ever be upgraded, gate every entry on a versioned shared object (as `sealed_storage::config` does) so an upgrade
  can retire the old code; older versions stay callable on-chain otherwise.

The built-in `nft_gate` and `timelock` providers are the reference: `tests/abi-table.ts` in `sealed-storage-client` pins their
`seal_approve*` signatures against the published package, and a provider that ships in the default registry must be added there.

## Policy lifecycle

- Encryption binds the ciphertext to a package id and identity; it cannot be re-pointed afterwards.
- An upgradeable policy package can change who may decrypt **all** existing ciphertext. Meddleware's release lifecycle for
  `sealed_storage` moves its `UpgradeCap` to a multisig straight after publishing and burns it on a planned date after a verification
  window (the package's `CUSTODY.md`); on testnet the deploy key still holds it. Do the same, or burn it, before relying on your own
  policy package in production.
- Key servers decide with the policy code that is current when they dry-run, so `migrate` on the version object retires a faulty
  version for every key server at once.

::: tip Key servers
Which key servers a ciphertext needs is fixed when it is encrypted; the testnet committee and the mainnet servers the apps are
configured for are listed in [SDK setup](./#key-server-committees).
:::
