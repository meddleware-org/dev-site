---
title: "Token Issuance SDK"
description: "Install @meddleware/token-issuance-client, describe a coin with TokenConfig, validate it against the Move rules, list a wallet's tokens and generate the downloadable source package."
---

# Token Issuance: SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/token-issuance/) | [On-chain overview →](/sui/onchain/token-issuance/overview)

[`@meddleware/token-issuance-client`](https://www.npmjs.com/package/@meddleware/token-issuance-client) deploys Sui coins from
[`@meddleware/token-issuance-template-sui`](https://github.com/meddleware-org/token-issuance-template-sui) **without the Sui CLI**: the
Move rules, the compiled template and its patcher, the publish and finalize transactions, publish-result parsing, owned-token
discovery and the downloadable source package. The Token Issuance app keeps only its UI, wallet wiring and form messages.

The pieces, in the order a deploy uses them:

1. [`TokenConfig`](#describe-a-coin) and the rules that validate it (this page).
2. [The template and its patcher](./template): the compiled module with the config patched into its constants.
3. [The deploy flow](./deploy): the publish and finalize transactions, the result and the failure classes.

## Install

```bash
npm install @meddleware/token-issuance-client @mysten/sui
```

`@mysten/sui` (`^2.33.2`) is a peer dependency, so the transaction the package builds is signed by the same SDK copy the host
bundles. `@mysten/move-bytecode-template` (the bytecode patcher, WebAssembly) and `fflate` are dependencies. The package declares
`engines.node >=24`.

| Entry | Contents |
| --- | --- |
| `@meddleware/token-issuance-client` | `TokenConfig` and its policy types, `assertTokenConfig`, `TOKEN_LIMITS`, the identifier, supply and icon rules, `buildPublishTransaction`, `buildFinalizeTransaction`, `finalizeHasWork`, `extractPublishResult`, `assertResultMatchesPolicy`, `toSuiTxResult`, `listMyTokens`, the exact type helpers |
| `…/template` | `configureTemplateWasm`, `initTemplateWasm`, `patchTemplateModule`, `patchTokenModule`, and the generated `TEMPLATE_*` artefact |
| `…/deploy` | `deployToken`, `finalizeToken`, `PublishedError`, `DeployIncompleteError`, `DeployUnconfirmedError`, `Executor`, `DeployStep` |
| `…/package` | `buildPackageFiles`, `generatePackageZip` |

The main entry loads no wasm, bytecode or zip code, so lists and forms stay light; do not re-export `/template` from it.

## Describe a coin

`TokenConfig` is every choice behind a token. The package, module and struct names are baked into the coin type and are permanent;
`symbol`, `name` and `decimals` are permanent on-chain.

```ts
import { assertTokenConfig, deriveStructName, type TokenConfig } from '@meddleware/token-issuance-client'

const moduleName = 'mytoken'
const config: TokenConfig = {
  packageName: 'my_token',            // the Move package name (snake_case)
  moduleName,                         // the Move module name
  structName: deriveStructName(moduleName), // always the module name uppercased: 'MYTOKEN'
  symbol: 'MYT',
  name: 'My Token',
  description: 'A token for my community.',
  iconUrl: 'https://example.com/icon.png', // https:// or ipfs://, or '' for none
  decimals: 9,                        // 0 to 18; conventionally 9 on Sui
  initialSupply: 1_000_000n,          // whole tokens, before decimals scaling; 0n for none
  supplyPolicy: 'mintable',           // 'fixed' (the registry takes the TreasuryCap) | 'mintable'
  metadataPolicy: 'updatable',        // 'frozen' (the MetadataCap is deleted) | 'updatable'
  packagePolicy: 'immutable',         // 'immutable' (UpgradeCap burned) | 'upgradeable'
  recipient: '',                      // receives the caps and the supply; '' means the sender
  license: '0BSD',                    // SPDX id, or 'NONE'; only affects the generated package
  packageDescription: 'My token.',
  projectName: 'My Token',
}

assertTokenConfig(config) // throws, naming the first invalid field
```

| Policy | Values | Effect |
| --- | --- | --- |
| `supplyPolicy` | `mintable` | `init` sends the `TreasuryCap<T>` to the recipient, who can mint and burn |
| | `fixed` | `init` hands the cap to the coin registry: no `TreasuryCap` exists and the registry reports the supply as fixed. Needs `initialSupply > 0` (the framework refuses to fix an empty supply) |
| `metadataPolicy` | `updatable` | `init` sends the `MetadataCap<T>` to the recipient (description and icon can change) |
| | `frozen` | `init` deletes the cap; the registry reports it deleted |
| `packagePolicy` | `immutable` | the publish transaction calls `0x2::package::make_immutable` on the `UpgradeCap` |
| | `upgradeable` | the `UpgradeCap` is transferred to the recipient |

Both coin policies are applied by the coin's own `init` **in the publish transaction**, so there is no moment at which a cap exists
that the deployer meant to give up.

## The rules

`assertTokenConfig` enforces them, and `TOKEN_LIMITS` exposes the bounds for forms. Per-field helpers return a message or `null`:
`validateIdentifier`, `validatePackageName`, `validateModuleName`, `isValidDecimals`, `hasAllowedIconScheme` and `parseSupply`.

- **Package and module names** are Move identifiers (`[a-z][a-z0-9_]*`, at most 64 characters, not a reserved word: `MOVE_RESERVED_WORDS`).
  A module name may not be one the template module already uses (`TEMPLATE_IMPORTED_IDENTIFIERS`, for example `coin` or `transfer`),
  and a package name may not be a framework address name (`FRAMEWORK_ADDRESS_NAMES`: `std`, `sui`, `sui_system`, `bridge`, `deepbook`).
- **Text:** symbol at most 32 characters, name 64, description 256, icon URL 512, package description 256, project name 64; printable
  ASCII without `"` or `\` (`SAFE_TEXT`), so a value embeds safely in a Move `b"…"` literal. A value may not be one of the template's
  placeholders (`TEMPLATE_SYMBOL`, `TEMPLATE_NAME`, …).
- **Icons** are `https://` or `ipfs://` (`ICON_URL_ALLOWED_SCHEMES`), or none.
- **Decimals** are 0 to 18, and `initialSupply × 10^decimals` must fit a `u64` (`MAX_U64`).
- **Recipient** is `0x` followed by 64 hex digits, or empty.

The same `assertTokenConfig` runs in the patcher, `deployToken` and the package generator, so an unvalidated config can never reach
Move source or bytecode.

## Owned tokens

```ts
import { listMyTokens } from '@meddleware/token-issuance-client'

const tokens = await listMyTokens(client, owner) // every page; throws past maxPages (default 20)
// [{ coinType, packageId, treasuryCapId?, metadataCapId?, label }]
```

A coin is listed when the wallet owns its `0x2::coin::TreasuryCap<T>` (it can mint) or `0x2::coin_registry::MetadataCap<T>` (it can
edit), both matched by exact type. A fixed supply with frozen metadata has neither (the registry holds the supply and the cap was
deleted), so a second rule lists it: the wallet holds a balance of the coin **and** sent the transaction that published its package
(one `getObject` and one `getTransaction` per held package; SUI and system packages are skipped; a failed read throws rather than
dropping a coin). A coin whose caps went to a recipient is listed under the recipient, and a coin the wallet merely received is not
listed. `opts.maxPages` and `opts.maxHeldCoinTypes` (default 200) bound the reads; exceeding them throws instead of truncating. The
result of `deployToken` is the authoritative record of what a session deployed.

## The source package

`buildPackageFiles({ config, licenseText?, result? })` returns the files of a standalone Move package that builds to the same bytecode
as the deploy; `generatePackageZip` zips them under `<packageName>/`.

```ts
import { generatePackageZip } from '@meddleware/token-issuance-client/package'

const zip = generatePackageZip({ config, licenseText: '…full licence text…' }) // add `result: publishResult` after a deploy
// Move.toml, Move.lock, sources/<module>.move, scripts/publish.sh, .gitignore, README.md, deployments.md,
// CLAUDE.md, AGENTS.md, Published.toml (when `result` is a testnet or mainnet deploy) and LICENSE
// (when `licenseText` is given and the licence is not proprietary)
```

The text comes from the pinned template package; values are rendered literally in one pass, so a description that contains another
placeholder is never rewritten. `Published.toml` records the deployed address because the deployer bypasses the CLI.

## Development

```bash
npm test                  # unit tests
npm run test:integration  # ABI drift and chain ids against public testnet and mainnet
npm run e2e:localnet      # a real deploy on `sui start --with-faucet --force-regenesis` (CI nightly; a release gate)
npm run check:template    # the artefact matches the pinned template
```
