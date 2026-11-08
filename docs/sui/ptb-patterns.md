---
title: "PTB patterns"
description: "Build, simulate and execute programmable transaction blocks with the Meddleware builders, pass results between calls, and read Move aborts by module and code."
---

# PTB patterns

Programmable Transaction Blocks (PTBs) compose several Move calls into one atomic transaction. Every
on-chain action in the Meddleware apps is a PTB built with `@mysten/sui/transactions`, most of them
by the SDK builders (`buildPurchaseTx`, `buildCreateGateTx`, …); the patterns below are what those
builders do.

## Basic structure

```ts
import { Transaction } from '@mysten/sui/transactions'
import { SuiGrpcClient } from '@mysten/sui/grpc'

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })
const tx = new Transaction()

// Add Move calls, object inputs and coin splits here
// ...

// Sign and execute with a keypair (scripts); in a browser app the wallet signs instead
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  include: { effects: true, events: true },
})
await client.waitForTransaction({ result }) // before reading its effects back
```

## Common patterns

### Calling a Move function

```ts
tx.moveCall({
  target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
  arguments: [
    tx.object(objectId),            // an existing on-chain object (owned or shared)
    tx.pure.u64(1000n),             // a scalar
    tx.pure.address(recipientAddr),
    tx.pure.vector('u8', nonceBytes),
  ],
})
```

### Splitting coins for a payment

`access_gate::purchase` takes the payment as a `Coin<SUI>`; split exactly the price from gas. The
function mints the pass to the sender and refunds any overpayment itself, so nothing needs
transferring afterwards:

```ts
const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)])
tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::purchase`,
  arguments: [tx.object(GATE_ID), tx.object(PLATFORM_CONFIG_ID), payment],
})
```

### Passing a result into a later call

A `moveCall` returns its results; pass them as arguments to later commands in the same PTB. Creating
a gate builds its `GatePolicy` value first:

```ts
const [policy] = tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::new_gate_policy`,
  arguments: [tx.pure.bool(true), tx.pure.bool(false), tx.pure.bool(true), tx.pure.bool(false)],
})
tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::create_gate`,
  arguments: [tx.object(PLATFORM_CONFIG_ID), tx.pure.u64(priceMist),
    /* recipient, uses, soulbound, auto-burn, name, image, description */ ...values, policy],
})
```

(See the `access_gate` [API reference](/sui/onchain/access-gate/api-reference) for every argument.)

## Simulate before sending

Simulation runs the transaction without executing it — use it to validate inputs and size gas before
asking a wallet to sign:

```ts
tx.setSender(address)
const sim = await client.simulateTransaction({ transaction: tx, include: { effects: true } })
const outcome = sim.Transaction ?? sim.FailedTransaction
if (!outcome.status.success) {
  console.error('Would fail:', outcome.status.error?.message)
}
```

## Gas budget

Wallets and `signAndExecuteTransaction` set the budget from a simulation automatically. Set one
explicitly only for scripts that must cap spend:

```ts
tx.setGasBudget(20_000_000n) // 0.02 SUI
```

## Wallet integration (Vue)

Meddleware apps use [`@meddleware/wallet-adapter`](/libraries/wallet-adapter), a wallet-standard composable whose connection is
shared by every view in the window:

```ts
import type { Transaction } from '@mysten/sui/transactions'
import { useWallet } from '@meddleware/wallet-adapter'

const { account, buildExecutor } = useWallet({ requiredFeatures: ['sui:signTransaction'] })

async function run(tx: Transaction): Promise<string> {
  const exec = await buildExecutor('testnet', 'https://fullnode.testnet.sui.io:443')
  const { digest } = await exec.signAndExecute(tx) // throws if the transaction failed on-chain
  await exec.waitForTransaction(digest)            // before reading anything the transaction changed
  return digest
}
```

The executor refuses to sign for a chain the account does not list, checks that the node serves the selected network, and refuses to
sign after the network was switched. Pass `{ include: { effects: true } }` to `signAndExecute` to get the effects and a `success`
flag instead of an exception.

## Error handling

A transaction that executed but aborted comes back from the SDK as `FailedTransaction`; it does not throw. (The wallet adapter's
plain `signAndExecute` throws for you.) Move aborts carry the module and the code; abort codes are only unique **within** a module
(`access_gate`, `nft_gate`, `timelock` and `config` all use small integers), so always key on `(module, code)`. Each client turns
its own package's aborts into a message, and returns `null` for an abort that is not its own:

```ts
import { abortMessage } from '@meddleware/access-gate-client'
import { classifyPolicyAbort } from '@meddleware/sealed-storage-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { sealPoliciesDeployment } from '@meddleware/sealed-storage-client/deployments'

const gateIds = accessGateDeployment('testnet')
const policyIds = sealPoliciesDeployment('testnet')

const sim = await client.simulateTransaction({ transaction: tx, include: { effects: true } })
const outcome = sim.Transaction ?? sim.FailedTransaction
if (!outcome.status.success) {
  // access_gate aborts 1 to 16, by the package's original id; the policy modules by (module, code)
  const text =
    abortMessage(outcome.status.error, gateIds.originalId) ??
    classifyPolicyAbort(outcome.status.error, { policyPackageIds: [policyIds.originalId, policyIds.publishedAt] })?.meaning ??
    outcome.status.error?.message
  console.error('Would fail:', text)
}
```

`abortMessage` requires the package's `originalId`, so a look-alike package's abort is never given a message. The full code tables are
in the clients (`ACCESS_GATE_ABORTS`, `POLICY_ABORTS`) and in each package's on-chain API reference:
[`access_gate`](/sui/onchain/access-gate/api-reference) and [`sealed_storage`](/sui/onchain/sealed-storage/api-reference). Code 13
(`E_WRONG_VERSION`) in either package means the package version you built against has been retired: rebuild against the current
`publishedAt`.

A key server's refusal of a Seal decrypt does not carry the abort at all; see
[Why was a decrypt refused](/sui/sealed-storage/integration#why-was-a-decrypt-refused).
