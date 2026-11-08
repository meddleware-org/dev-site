---
title: "The token template and its patcher"
description: "How the compiled Move template is pinned and patched in the browser: the identifiers and constants that change, the bytecode checks, and how the artefact follows the template package."
---

# The token template and its patcher

Every Meddleware coin is built from one Move module, `token_issuance_template`, published as
[`@meddleware/token-issuance-template-sui`](https://github.com/meddleware-org/token-issuance-template-sui). The Move source, its
constants and `init` are documented with the package: [on-chain overview](/sui/onchain/token-issuance/overview),
[developer integration](/sui/onchain/token-issuance/dev-guide) and [API reference](/sui/onchain/token-issuance/api-reference). This
page covers the client side: how the compiled module is carried and patched.

## The pinned artefact

`@meddleware/token-issuance-client/template` exports the module compiled by `sui move build --build-env testnet` (never the
instrumented `sui move test` bytecode), generated from the exact template version the client pins:

| Export | What it is |
| --- | --- |
| `TEMPLATE_MODULE_B64` | the compiled module, base64 |
| `TEMPLATE_BUILD_INFO` | `templateVersion`, `toolchainVersion`, `buildEnv`, `frameworkRev`, `sourceSha256`, `moduleSha256`: how the module was built |
| `TEMPLATE_IDENTIFIERS` | the module and struct names compiled in (`token_issuance_template`, `TOKEN_ISSUANCE_TEMPLATE`) |
| `TEMPLATE_DEFAULTS` | the constant-pool values the patcher replaces |

`src/template/artifact.ts` and `src/template/files.ts` come only from `npm run gen:template`, which reads the pinned package and
checks its recorded hashes, a byte-exact decode and encode round trip, and that each identifier and default constant exists exactly
once. CI runs `npm run check:template`. After a new template release: bump the dev dependency in `token-issuance-client`, run
`gen:template`, release the client, then take it in the apps. The template's constants are a contract with the client: the distinct
placeholders (`TEMPLATE_SYMBOL`, `TEMPLATE_NAME`, `TEMPLATE_DESCRIPTION`, `TEMPLATE_ICON_URL`, `DECIMALS = 9`, `INITIAL_SUPPLY =
1_000_000_007`, `FIXED_SUPPLY = true`, `FROZEN_METADATA = false`) must stay distinct so each keeps its own constant-pool entry, and
renaming or merging them breaks the patcher.

## What patching does

`@mysten/move-bytecode-template`'s `update_identifiers` and `update_constants` cannot round-trip the current binary format (v7), but
`deserialize` and `serialize` do, losslessly. So the patcher decodes the module and edits it directly:

1. **Rename** the module and struct identifiers in place (index-preserving, so every handle stays valid). A rename that would
   duplicate an identifier the template already uses is refused: the verifier would reject the module on-chain after gas is spent.
2. **Overwrite the constants:** `DECIMALS` (a `u8`), `SYMBOL`, `NAME`, `DESCRIPTION` and `ICON_URL` (strings), `INITIAL_SUPPLY` (a
   `u64`, in raw units: whole tokens × 10^decimals), `FIXED_SUPPLY` and `FROZEN_METADATA` (booleans). Each slot is resolved from the
   pristine pool before any is written, so a value equal to a later template default cannot capture the wrong slot.
3. **De-duplicate the constant pool.** The bytecode verifier rejects a pool with equal entries (`DUPLICATE_ELEMENT`, at publish), and
   patching can create them (a symbol equal to the name, two empty strings, both flags false). Equal entries are merged and every
   `LdConst` is remapped.
4. **Check the result.** The patched bytes are decoded again and every identifier and constant is compared with what was asked for, so
   a patcher bug can never reach the chain (the values are permanent).

```ts
import { configureTemplateWasm, patchTokenModule } from '@meddleware/token-issuance-client/template'
import { buildPublishTransaction } from '@meddleware/token-issuance-client'
import wasmUrl from '@mysten/move-bytecode-template/web/move_bytecode_template_bg.wasm?url' // Vite

configureTemplateWasm(wasmUrl) // browsers only, once at start-up; Node loads its own wasm

const moduleBytes = await patchTokenModule(config) // asserts the config first, then patches

const publish = buildPublishTransaction({
  moduleBytes,
  sender: address,
  feeMist: 0n,
  feeRecipient: address,
  gasBudget: 500_000_000n,
  packagePolicy: config.packagePolicy,
  recipient: config.recipient || address,
})
```

`patchTokenModule(config)` validates the whole `TokenConfig` and passes `initialSupply × 10^decimals`, `supplyPolicy === 'fixed'` and
`metadataPolicy === 'frozen'` on. `patchTemplateModule(params)` takes the raw values (`PatchParams`): names, texts, `decimals`, the raw
`initialSupply`, `fixedSupply` and `frozenMetadata`. A fresh copy of the shipped module is decoded on every call. A fixed supply with
zero initial supply throws, because the framework refuses to fix an empty one.

`configureTemplateWasm(source)` tells the browser build where its wasm is (a URL, `Response`, bytes or `WebAssembly.Module`); loading is
deferred to the first patch. `initTemplateWasm()` initialises once and rethrows a load failure (the next call retries), so a
misconfigured asset surfaces there instead of as an obscure error mid-patch.

## Alternatives to the client

The template repository also deploys from the command line (`scripts/deploy_token.sh`, with `TOKEN_*` variables) and generates a
package whose own `scripts/publish.sh` publishes, finalizes and optionally burns the `UpgradeCap`. The downloadable package of the
client mirrors that generator, so what a user downloads builds to the same bytecode as what was deployed.
