---
title: "Local development"
description: "Run an app, the documentation sites, a Move package on localnet, a gateway and the read indexer from their repositories, with the real commands and variables."
---

# Local development

## Running an app

Each app is a Vite single-page application in its own repository: `walrus-storage-ui`, `sealed-storage-ui`, `access-gate-ui`,
`token-issuance-ui`, `treasury-ui` and `dashboard-ui`.

```bash
git clone https://github.com/meddleware-org/walrus-storage-ui.git
cd walrus-storage-ui
npm ci
cp .env.example .env.local    # optional: the variables you want to change (see the file)
npm run dev                   # http://localhost:5173
```

The scripts are the same in every app repository:

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `vue-tsc --noEmit`, then `vite build` into `dist/` |
| `npm run type-check`, `npm test` | `vue-tsc`; Vitest |
| `npm run lint` | stylelint, ESLint and html-validate (`lint:css`, `lint:js`, `lint:html`) |
| `npm run test:e2e` | Playwright with the accessibility sweep (`E2E_BROWSERS=all` runs five browsers); apps with a wallet build `build:e2e`, which registers a mock wallet and a stub chain |
| `npm run check:bundle`, `check:csp`, `check:licenses` | the production bundle holds no test hooks; every inline script is allowed by the image's Content-Security-Policy; third-party licence notices can be written |

`.env.local` is git-ignored. Every `VITE_*` value is read at build time and baked into the public bundle, so none of them is
secret. The variables shared by the apps:

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | `testnet` or `mainnet` for the standalone build; the token issuance also accepts `localnet`. An embedded view follows the host's network selector |
| `VITE_DOCS_URL`, `VITE_DEV_URL` | the tool's page on docs.meddleware.co.uk and meddleware.dev | Footer links, handed to `AppToolShell` |
| `VITE_RPC_TESTNET`, `VITE_RPC_MAINNET` | the public Mysten fullnodes | gRPC-web endpoint overrides (token issuance) |
| `VITE_INDEXER_URL` | none | A [read indexer](/sui/indexer) for event history; reads fall back to the full node |

Everything else (relay hosts, gate ids, the fee and its recipient, the Seal key servers) is app-specific and documented in each
app's `.env.example`. A deployment can also override the machine-facing endpoints (`VITE_INDEXER_URL`, `VITE_WALRUS_RELAY_TESTNET`,
`VITE_WALRUS_RELAY_MAINNET`) at run time with a same-origin `/runtime-config.json`; see [the component library](/design-system/components#runtime-endpoint-configuration).
Ids, fees and addresses can only be changed at build time.

## Running the documentation sites

Both sites are VitePress. Each repository imports the on-chain pages of the Move packages when it starts (`gen:onchain`).

```bash
git clone https://github.com/meddleware-org/dev-site.git
cd dev-site
npm ci
npm run dev    # http://localhost:5173, this site
```

```bash
git clone https://github.com/meddleware-org/docs-site.git
cd docs-site
npm ci
npm run dev    # gen:api (TypeDoc) and gen:onchain run first
```

To preview the on-chain pages from local checkouts of the Move repositories instead of the installed npm packages, clone them next
to the site and run `ONCHAIN_DOCS_ROOT=.. npm run dev`. The site's other checks:

| Script | What it does |
| --- | --- |
| `npm run build` | `gen:onchain`, `check:onchain-ids`, `vitepress build docs`, `llms-full.txt`, and a check that no audit page reached `dist/` |
| `npm run check:onchain-ids` | every 32-byte id in a page is a deployment id of the installed clients or a listed Seal key server; the Sui overview shows the ones it must |
| `npm run gen:network`, `check:network` | write and check `docs/.vitepress/network.json`, the record of which networks the platform is deployed on |
| `npm test` | Vitest: ids, ts samples compile against the installed packages, page front matter, sidebar, package contents |
| `npm run test:e2e` | builds, then the Playwright accessibility sweep |

## Docker builds

Every app and site is built into an image on `static-server`. The build arguments are the `VITE_*` variables (see the header of the
repository's `Dockerfile`):

```bash
cd walrus-storage-ui
docker build --build-arg VITE_NETWORK=testnet -t walrus-storage-ui:dev .
docker run -p 8080:8080 walrus-storage-ui:dev   # http://localhost:8080
```

`podman` takes the same commands. The Dockerfile's `ARG CSP` is the Content-Security-Policy `static-server` sends; `npx mw-sync
--check` keeps it equal to the profile named in `package.json` (see [frontend-config](/libraries/frontend-config#content-security-policy-profiles)).

## Move packages on localnet

Start a local network, then publish a package with `test-publish`, which publishes to any environment and resolves dependencies to
ephemeral addresses:

```bash
sui start --with-faucet --force-regenesis   # gRPC and RPC on :9000, faucet on :9123; Ctrl+C stops it
# in another terminal
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet
sui client faucet
git clone https://github.com/meddleware-org/access-gate-sui.git && cd access-gate-sui
sui move test --build-env testnet
sui client test-publish --build-env localnet --gas-budget 200000000
```

See [Environment setup](/sui/environment) for the whole localnet workflow. The `token-issuance-client` repository has a real
localnet deploy (`npm run e2e:localnet`) that CI runs nightly.

## Gateway and indexer

The access-gate gateway and the read indexer are Rust services in their own repositories; their READMEs list every variable.
Build and test commands are in [Deploy the gateway](/sui/access-gate/gateway#build-and-test) and [Read indexer](/sui/indexer#run-your-own).
