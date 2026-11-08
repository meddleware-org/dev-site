---
title: "Getting started"
description: "What you need to build on, self-host or contribute to the Meddleware platform, and where every repository fits."
---

# Getting started

Everything you need to build on the Meddleware platform: integrate the SDKs into an app, run your own relay, gateway or
indexer, or contribute to a repository.

<NetworkNotice />

## Prerequisites at a glance

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | `^22.18.0 \|\| >=24.12.0` (apps and sites); `>=24` where a package says so | The apps and both documentation sites declare `^22.18.0 \|\| >=24.12.0`. The Walrus, Sealed Storage, Token Issuance and gateway clients, `walrus-storage-kit` and `vitepress-theme` declare `engines.node >=24`. CI runs Node 26 |
| npm | ships with Node | Each repository has its own `package-lock.json`; use `npm ci` |
| Sui CLI | testnet `v1.81.0` | Managed with [suiup](./toolchain); the Move packages' CI installs `sui@testnet-v1.81.0` |
| Walrus CLI | testnet `v1.57.0` | Optional for the SDKs; needed to run a relay or inspect blobs |
| Docker or Podman | any recent | To build app images and run the Rust gateway or the indexer |
| Rust (stable) | stable toolchain | Only for the gateway, the Rust Worker and the indexer |

See [Toolchain](./toolchain) for the installation steps and [Local development](./local-dev) for the commands of each repository.

## What you can build

- **Walrus Storage**: upload files to Walrus through an upload relay, optionally gated by an access pass.
- **Sealed Storage**: encrypt data to on-chain Seal policies and store the ciphertext on Walrus.
- **Access Gate**: create and sell NFT access passes that gate content, relay access or any service.
- **Token Issuance**: publish a Sui coin from your wallet without the Sui CLI.
- **Treasury**: read the platform's on-chain commission, gates and pass activity.

They compose: the hosted Walrus relay admits Access Gate pass holders, and Sealed Storage's `nft_gate` policy decrypts for the
holders of a gate's passes.

## Repositories

Every component is its own repository under [github.com/meddleware-org](https://github.com/meddleware-org), with its own lockfile
and release: there is no monorepo install. All are licensed 0BSD.

| Layer | Repository | npm package or image | Page |
| --- | --- | --- | --- |
| Move packages | [`access-gate-sui`](https://github.com/meddleware-org/access-gate-sui) | `@meddleware/access-gate-sui` | [Access Gate](/sui/access-gate/) |
| Move packages | [`sealed-storage-sui`](https://github.com/meddleware-org/sealed-storage-sui) | `@meddleware/sealed-storage-sui` | [Sealed Storage](/sui/sealed-storage/) |
| Move packages | [`token-issuance-template-sui`](https://github.com/meddleware-org/token-issuance-template-sui) | `@meddleware/token-issuance-template-sui` | [Token Issuance](/sui/token-issuance/template) |
| TypeScript SDKs | [`access-gate-client`](https://github.com/meddleware-org/access-gate-client) | `@meddleware/access-gate-client` | [Access Gate](/sui/access-gate/) |
| TypeScript SDKs | [`access-gate-gateway-client`](https://github.com/meddleware-org/access-gate-gateway-client) | `@meddleware/access-gate-gateway-client` | [Access Gate](/sui/access-gate/integration#proving-access-to-a-gateway) |
| TypeScript SDKs | [`sealed-storage-client`](https://github.com/meddleware-org/sealed-storage-client) | `@meddleware/sealed-storage-client` | [Sealed Storage](/sui/sealed-storage/) |
| TypeScript SDKs | [`walrus-storage-client`](https://github.com/meddleware-org/walrus-storage-client) | `@meddleware/walrus-storage-client` | [Walrus Storage](/sui/walrus-storage/) |
| TypeScript SDKs | [`token-issuance-client`](https://github.com/meddleware-org/token-issuance-client) | `@meddleware/token-issuance-client` | [Token Issuance](/sui/token-issuance/) |
| Services | [`access-gate-gateway`](https://github.com/meddleware-org/access-gate-gateway) | npm `@meddleware/access-gate-gateway`, crate and image `access-gate-gateway` | [Deploy the gateway](/sui/access-gate/gateway) |
| Services | [`sui-indexer`](https://github.com/meddleware-org/sui-indexer) | image `quay.io/meddleware-org/sui-indexer` | [Read indexer](/sui/indexer) |
| Shared libraries | [`wallet-adapter`](https://github.com/meddleware-org/wallet-adapter) | `@meddleware/wallet-adapter` | [wallet-adapter](/libraries/wallet-adapter) |
| Shared libraries | [`web-utils`](https://github.com/meddleware-org/web-utils) | `@meddleware/web-utils` | [web-utils](/libraries/web-utils) |
| Shared libraries | [`frontend-config`](https://github.com/meddleware-org/frontend-config) | `@meddleware/frontend-config` | [frontend-config](/libraries/frontend-config) |
| Shared libraries | [`walrus-storage-kit`](https://github.com/meddleware-org/walrus-storage-kit) | `@meddleware/walrus-storage-kit` | [walrus-storage-kit](/libraries/walrus-storage-kit) |
| Shared libraries | [`vitepress-theme`](https://github.com/meddleware-org/vitepress-theme) | `@meddleware/vitepress-theme` | [vitepress-theme](/libraries/vitepress-theme) |
| Design system | [`design-tokens`](https://github.com/meddleware-org/design-tokens), [`ui`](https://github.com/meddleware-org/ui) | `@meddleware/design-tokens`, `@meddleware/ui` | [Design system](/design-system/) |
| Apps | `walrus-storage-ui`, `sealed-storage-ui`, `access-gate-ui`, `token-issuance-ui`, `treasury-ui`, `dashboard-ui` | static images built on `static-server` | [Local development](./local-dev) |
| Documentation | [`docs-site`](https://github.com/meddleware-org/docs-site) (docs.meddleware.co.uk), [`dev-site`](https://github.com/meddleware-org/dev-site) (this site) | static images | [Local development](./local-dev#running-the-documentation-sites) |

## Next steps

- [Toolchain](./toolchain): install Node, the Sui and Walrus CLIs and a wallet.
- [Local development](./local-dev): run an app, a site, a Move package on localnet.
- [Sui development](/sui/): environment, PTB patterns and the service-by-service guides.
- [Libraries](/libraries/): the shared packages every app is built from.
- [Design system](/design-system/): build a Vue app on the token and component layer.
