---
title: "Toolchain"
description: "Install Node.js, suiup, the Sui and Walrus command-line tools at the versions the repositories use, and a wallet."
---

# Toolchain

## Node.js

The apps and both documentation sites declare `"node": "^22.18.0 || >=24.12.0"`; the Walrus, Sealed Storage, Token Issuance
and gateway clients, `walrus-storage-kit` and `vitepress-theme` declare `>=24`. CI runs Node 26, so use a current release.
Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions:

```bash
# fnm
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 26
fnm use 26
node --version  # v26.x.x
```

npm comes with Node. Every repository commits a `package-lock.json`: install with `npm ci`.

## Sui and Walrus CLIs: suiup

The Sui and Walrus binaries are managed by [suiup](https://github.com/MystenLabs/suiup), a version manager analogous to rustup:

```bash
# Install suiup (it installs itself to ~/.local/bin)
curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh

# The testnet channel
suiup install sui@testnet
suiup install walrus@testnet

# The Sui version the Move packages' CI uses
suiup install sui@testnet-v1.81.0
suiup switch sui@testnet-v1.81.0

# Verify
sui --version     # sui 1.81.0-…
walrus --version  # walrus 1.57.0-…
```

| Tool | Version the repositories use | Where it is pinned |
| --- | --- | --- |
| `sui` | testnet `v1.81.0` | `suiup install sui@testnet-v1.81.0` in the Move packages' `move-ci.yml`, and in the integration workflows of `walrus-storage-client`, `walrus-storage-kit` and `token-issuance-client` |
| `walrus` | testnet `v1.57.0` | the default on the maintainers' machines (`suiup show`); the SDKs do not need the binary |
| `suiup` | `0.0.14` in CI | the `token-issuance-client` localnet workflow pins the release and checks its checksum |

Check what is installed and what is newer:

```bash
suiup show    # installed and default binaries
suiup status  # whether newer releases are available
```

A Move package's `Move.lock` pins the framework revision it compiles against; build with the environment named explicitly:
`sui move build --build-env testnet` and `sui move test --build-env testnet`.

## Rust (services only)

The access-gate gateway (Rust/Axum and the Rust Worker), the read indexer and their tests need a stable Rust toolchain
(`rustup update stable`). The Rust Worker additionally needs the `wasm32-unknown-unknown` target and `worker-build`; its README
pins the versions.

## Sui wallet

Install any Sui wallet that supports the wallet standard in a browser, for example [Slush](https://slush.app/). To work from the
command line, create an address for testnet and fund it:

```bash
sui client new-address ed25519
sui client faucet --address <ADDRESS>   # or https://faucet.sui.io/
```

## Repositories

Each package is a standalone repository with its own lockfile: there is no monorepo install. Clone what you need and work in it
directly:

```bash
git clone https://github.com/meddleware-org/sealed-storage-client.git
cd sealed-storage-client && npm ci && npm test && npm run type-check
```

Apps depend on the SDKs through npm. To try an unpublished SDK change in an app, pack the SDK (`npm pack`) and install the tarball
in the app, or use an `overrides` entry pointing at a local path. Give a local pack a version no published release has: npm ignores
a tarball whose version equals the registry's.
