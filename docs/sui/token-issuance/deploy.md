---
title: "The deploy flow"
description: "The two transactions that deploy a coin, the Executor you provide, the PublishResult you get back, and the errors that mean a coin exists and must never be deployed twice."
---

# The deploy flow

`deployToken` runs the whole flow behind an `Executor`: patch the template, sign and execute the publish transaction, confirm it, then
sign and execute the finalize transaction. The module's one-time-witness `init` creates the coin's objects and sends them to the
sender; they are not results of `tx.publish`, so they can only be used after the publish executes. That is why there are two
transactions.

| Step (`DeployStep`) | What happens |
| --- | --- |
| `patching` | [patch the template](./template) for the config |
| `publishing` | sign and execute the **publish** transaction |
| `confirming` | `waitForTransaction(publish digest)` |
| `finalizing` | sign and execute the **finalize** transaction (skipped when there is nothing to do) |
| `confirming-finalize` | `waitForTransaction(finalize digest)` |
| `done` | resolved with the `PublishResult` |

## The two transactions

**Publish** (`buildPublishTransaction`): `tx.publish` of the patched module with dependencies `0x1` and `0x2`; then, by
`packagePolicy`, `0x2::package::make_immutable(UpgradeCap)` or a transfer of the `UpgradeCap` to the recipient; then the platform fee
split from the gas coin and transferred to `feeRecipient`. A fee needs a full, non-zero recipient address (0x followed by 64 hex
digits), so a misconfigured consumer can never burn the fee to `0x0` or a truncated address. `init` runs inside this transaction: it
registers the coin, mints the initial supply to the publisher and applies the supply and metadata policies.

**Finalize** (`buildFinalizeTransaction`): `0x2::coin_registry::finalize_registration<T>(0xc, receiving(Currency<T>))`, which promotes
the pending `Currency<T>` to a shared, discoverable object so wallets read the coin's decimals (without it they show raw base units),
then a transfer of whatever `init` left with the sender (the initial `Coin<T>`, the `TreasuryCap`, the `MetadataCap`) to the recipient.
It applies **no** policy: those were applied by `init`, so there is no cap left to freeze and nothing to mint. `finalizeHasWork` is
false (no transaction at all) when there is no pending currency reference and the recipient is the sender.

## Deploy a coin

`deployToken` takes an `Executor`: `signAndExecute(tx)` must return a `SuiTxResult` (digest, object changes, effects status), and
`waitForTransaction(digest)` resolves once the digest is indexed. `toSuiTxResult` maps a gRPC execution result onto it.

```ts
import { toSuiTxResult } from '@meddleware/token-issuance-client'
import { deployToken, type Executor } from '@meddleware/token-issuance-client/deploy'

const executor: Executor = {
  signAndExecute: async (tx) =>
    toSuiTxResult(await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, include: { effects: true, objectTypes: true } })),
  waitForTransaction: async (digest) => void (await client.waitForTransaction({ digest })),
}

const result = await deployToken({
  config,                          // a TokenConfig; checked with assertTokenConfig
  network: 'testnet',              // 'testnet' | 'mainnet' | 'localnet'
  sender: address,
  feeMist: 0n,                     // the platform fee, MIST, split from the gas coin
  feeTreasury: address,            // its recipient (a full non-zero address when feeMist > 0)
  gasBudget: 500_000_000n,
  executor,
  onStep: (step) => console.log(step),
})
```

In a browser the executor is the wallet. `@meddleware/wallet-adapter`'s `buildExecutor` signs and executes; ask it for the effects and
object types and adapt the result:

```ts
import { toSuiTxResult, type Executor } from '@meddleware/token-issuance-client/deploy'

const walletExecutor: Executor = {
  async signAndExecute(tx) {
    // a failed transaction is returned, not thrown: deployToken reads its status
    const { result } = await exec.signAndExecute(tx, { include: { effects: true, objectTypes: true } })
    return toSuiTxResult(result)
  },
  async waitForTransaction(digest) {
    await exec.waitForTransaction(digest)
  },
}
```

The Token Issuance app takes the fee amount and recipient
from its build configuration (`VITE_FEE_MIST`, default 2 SUI, and `VITE_FEE_TREASURY_<NETWORK>`); the client reads no environment, so
the caller supplies the network, fee, treasury, gas budget and executor.

## The result

```ts
interface PublishResult {
  network: 'testnet' | 'mainnet' | 'localnet'
  packageId: string
  coinType: string          // <packageId>::<module>::<STRUCT>, normalised
  treasuryCapId?: string    // absent for a fixed supply: the registry took the cap in init
  metadataCapId?: string    // absent for frozen metadata: init deleted the cap
  initialCoinId?: string    // the minted initial supply; absent for a zero supply
  currencyId?: string
  currencyVersion?: string  // version and digest of the pending Currency<T>, needed for finalize_registration
  currencyDigest?: string
  upgradeCapId?: string     // absent for an immutable package
  digest: string            // the publish transaction
  feeRecipient: string
  feeMist: string           // decimal MIST
}
```

`extractPublishResult(objectChanges, ctx)` produces it, and it is strict: exactly one published package, exactly one `Currency<T>` of a
coin **defined in that package** (the coin type comes from that currency, which every coin has whatever the policies), and at most one
of each other object. Every object is matched by its exact, normalised type, so a `TreasuryCap` of another coin, or of a look-alike
framework address, is never taken for the new token. `assertResultMatchesPolicy(config, result)` stops the flow if what the publish
created contradicts the policy (a fixed supply with a `TreasuryCap`, a mintable one without, frozen metadata with a `MetadataCap`, an
initial supply without a `Coin`, and the reverse).

## Failure after the publish

Once the publish has executed the coin exists, so every failure is a `PublishedError` (with `publishDigest`). **Never answer one with
a fresh deploy:** it would publish a second coin and charge the fee again.

| Error | Meaning | Do |
| --- | --- | --- |
| `Error` before the publish executes | invalid config, the wallet refused, or the publish failed | fix and retry |
| `PublishedError` | the publish executed but its effects could not be read, or what it created contradicts the policy | show `publishDigest`; do not redeploy |
| `DeployIncompleteError` | published, but the confirmation or the finalize step failed (the second signature was refused or the transaction failed) | finish with `finalizeToken({ pending: e.pending, executor })` |
| `DeployUnconfirmedError` | the finalize **executed** but could not be confirmed (indexing timed out) | the coin is set up: show `e.result`; do not retry |

```ts
import { deployToken, DeployIncompleteError, finalizeToken } from '@meddleware/token-issuance-client/deploy'

try {
  await deployToken({ config, network: 'testnet', sender: address, feeMist: 0n, feeTreasury: address, gasBudget: 500_000_000n, executor })
} catch (e) {
  // Safe to repeat even if the first attempt landed: the repeat is rejected without effect (nothing is minted here).
  if (e instanceof DeployIncompleteError) await finalizeToken({ pending: e.pending, executor })
  else throw e
}
```

Until the finalize succeeds the currency is not registered and what `init` created stays with the sender; the supply and metadata
policies are already applied. A retry after an attempt that executed on-chain but whose executor then threw is safe: the receiving
reference of the pending `Currency` is stale and the sender no longer owns the objects, so the repeat is rejected atomically.
`PendingFinalize` (the `pending` field) holds the validated config, the publish result, the currency reference, the sender and the gas
budget, so it can be persisted and finished later.

## Tests

`npm test` runs the unit tests; `npm run e2e:localnet` performs a real deploy on a local network and checks the objects, the registry
state (`is_supply_fixed`, `is_metadata_cap_deleted`) and `listMyTokens`. `npm run test:integration` pins the ABI and chain ids against
public testnet and mainnet.
