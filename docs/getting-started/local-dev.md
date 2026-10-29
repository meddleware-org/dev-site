# Local development

## Running a specific app

Each app has a local dev server:

```bash
git clone https://github.com/meddleware-org/walrus-storage-ui.git
cd walrus-storage-ui && npm install && npm run dev    # http://localhost:5173
```

The same applies to `sealed-storage-ui`, `access-gate-ui` and `token-issuance-ui`.

All apps read environment variables from `.env.local` (git-ignored). Copy the example file to get started:

```bash
cp .env.example .env.local
# Edit VITE_NETWORK=testnet, VITE_DOCS_URL, VITE_DEV_URL, etc.
```

## Running this docs site locally

```bash
git clone https://github.com/meddleware-org/dev-site.git
cd dev
npm install
npm run dev   # http://localhost:5173
```

For the user-facing docs site:

```bash
git clone https://github.com/meddleware-org/docs-site.git
cd docs
npm install
npm run dev   # gen:api runs first (requires @meddleware/* SDK packages published)
```

Both sites import the on-chain docs of the Move packages at build time (`gen:onchain`). To preview
local checkouts instead of the installed npm packages, clone the Move repos next to the site and
run `ONCHAIN_DOCS_ROOT=.. npm run dev`.

## Environment variables

Common variables shared across apps:

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | `testnet` \| `mainnet` (the token issuance also accepts `localnet`) |
| `VITE_DOCS_URL` | `https://docs.meddleware.co.uk` | User docs base URL |
| `VITE_DEV_URL` | `https://meddleware.dev` | Developer docs base URL |
| `VITE_RPC_TESTNET` / `VITE_RPC_MAINNET` | public Mysten fullnodes | gRPC-web endpoint overrides |

Everything else (relay hosts, Seal committee, gate-creation policy, …) is app-specific and
documented in each app's `.env.example`. All `VITE_*` values are baked in at build time and are
never secret.

## Docker builds

To build and run any service as a Docker image (requires Docker Desktop or similar):

```bash
cd walrus-storage-ui
docker build -t walrus-storage-ui:dev .
docker run -p 8080:8080 walrus-storage-ui:dev
```

The `SPA_FALLBACK=true` env var is baked in — the static-server handles client-side routing.

## Move packages (localnet)

For local contract development, start a localnet and publish a package with `test-publish`:

```bash
sui start --with-faucet --force-regenesis   # localnet on :9000, faucet on :9123; Ctrl+C to stop
# In another terminal:
git clone https://github.com/meddleware-org/access-gate-sui.git && cd access-gate-sui
sui client test-publish --build-env localnet --gas-budget 200000000
```

See [Environment setup](../sui/environment) for a full localnet workflow.
