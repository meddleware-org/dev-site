# Changelog — @meddleware/dev

## 0.0.32 — 2026-10-30

- Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages.

## 0.0.26 (2026-10-22)

### Security

- The image's Content-Security-Policy is `connect-src 'self'` (was `'self' https:`): the site's local search and footer load same-origin files only. A headless Chromium probe against the built site under the new policy found search results and the footer working with zero violations, and a deliberate cross-origin `fetch` is blocked. A test pins the directive.

## 0.0.25 (2026-10-22)

### Changed

- Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes).

## 0.0.24 (2026-10-19)

### Changed

- The platform-terms note and the Access Gate integration sample quote the re-priced defaults (workspace cost
  model, decision D57): a 0.0005 SUI commission floor, so a paid pass costs at least 0.005 SUI. Release together
  with `@meddleware/access-gate-sui` 0.0.7 (the generated on-chain pages).

## 0.0.23 (2026-10-18)

### Added

- Build-time drift check `scripts/check-onchain-ids.mjs`: the build fails when a hand-written page carries a
  32-byte `0x…` id that is not a current testnet id in the `deployments` of `@meddleware/access-gate-client` /
  `@meddleware/seal-client` (the Seal key-server ids are allowlisted in the script), or when the testnet table in
  `docs/sui/index.md` lacks one of its four ids; `scripts/check-dist-no-audit.mjs` fails the build if an audit
  page reaches `dist/`.
- A `test` script (vitest): the id check, the package contents, and a type-check of every fenced `ts` sample
  against the installed `@meddleware/*` / `@mysten/*` packages (`tests/samples.test.mjs`). CI and both release
  workflows run it.

### Changed

- Access Gate gateway guide and the relay self-host guide describe protocol v2 (`nft-gate:access:v2`, audience
  bound to the gateway origin, gate and network) and the required `GATEWAY_ORIGIN`, `NETWORK`, `NFT_TYPE`, `GATE_ID`;
  the `409` codes (`redeemed`, `leased`); `UPSTREAM_AUTH_HEADERS` as a JSON array; the Rust gateway needs
  `ALLOW_INSECURE_HTTP` for an `http://` upstream and `REDIS_URL` with `SINGLE_USE`.
- Samples follow the current client signatures: `buildAccessProof` takes `gateway`, `gateId` and `network`;
  `createGatedAccess` and `createRelayAccessToken` take `gateId` and `network` (new `createRelayAccessToken`
  sample); the Seal sample sets `accessGateOriginalId`, says that sealing to a gate with transferable passes is
  refused (`allowTransferableGates`), and passes the registry to `parseSealedManifest`; the lifetime and
  attribute samples `await` the transaction builders; the single-use sample is self-contained.
- Dependencies: sui-token-template ^1.0.9, design-tokens ^0.1.10, walrus-client ^0.0.28, nft-gate-client ^0.0.17,
  seal-client ^0.0.20, access-gate-client ^0.0.9 (the clients are now dev dependencies, for the checks) and the
  tooling updates; image base static-server 0.1.8.
- The npm release gate calls the full CI workflow (`node-ci.yml`), as the image release does.
- `CLAUDE.md` and `SECURITY.md` describe the real pipeline (checks, id check, sample type-check, packaging).

### Fixed

- The npm package no longer carries the internal audit (`docs/audit/`), the generated copies of the Move
  packages' pages (`docs/sui/onchain/`, `docs/.vitepress/generated/`) or the VitePress cache (36 files, was 62).

## 0.0.17 (2026-10-03)

- Blob reads use walrus-client's `readBlob` (timeout, size cap, strict consistency check) in the
  Walrus Storage and Sealed Storage samples instead of a bare `fetch`.
- Served with clean URLs and a real 404 page (static-server 0.1.4 `CLEAN_URLS`, `NOT_FOUND_PAGE`).
- `@meddleware/*` dependencies at their latest versions.

## 0.0.16 (2026-10-02)

- Ships the brand favicon (`/favicon.svg`); browsers no longer log a 404 for `/favicon.ico`.

## 0.0.15 (2026-10-02)

- Testnet deployments: the version-gated `access_gate` `0xa55789…` and `seal_policies` `0x61c4aa…`,
  with their shared version objects (`PlatformConfig`, `PolicyConfig`); the superseded packages are
  listed. On-chain pages from `@meddleware/access-gate-sui` 0.0.5 and `@meddleware/seal-policies-sui`
  0.0.6.
- Sealed Storage guides: `SealController` and `buildPublishSealedContentTx` take `policyConfigId`;
  policy signatures include `&PolicyConfig`; custom policies are told to version-gate upgradeable
  packages; the custody note follows the package's `CUSTODY.md` lifecycle.

## 0.0.14 (2026-10-01)

- Runs on static-server 0.1.3 (per-response CSP script nonce for Cloudflare JavaScript
  Detections, HSTS, Permissions-Policy).
- Sealed Storage guide: `SealController` takes `originalId` + `publishedAt` from
  `@meddleware/seal-client/deployments` (the old `packageId` option no longer exists).
- Deployments table lists original ID and published-at (seal_policies v2).

## 0.0.1

Initial release. Developer documentation site at `dev.meddleware.co.uk` covering:

- Getting started: toolchain prerequisites, local development
- Design system: consuming `@meddleware/design-tokens` and `@meddleware/ui`
- Sui development: environment setup, PTB patterns
- Per-service integration guides: Walrus Storage, Sealed Storage, Access Gate, DAO

## [0.0.31] - 2026-10-24

### Changed

- Protocol pages: the access message is `access-gate-gateway:access:v3`, the loop marker `Via: 1.1 access-gate-gateway`; the Move packages are `sealed_storage` and `token_issuance_template` (ADR-0004).
- `robots.txt`, a curated `llms.txt` and a generated `llms-full.txt` (the whole site in one file, built after `vitepress build`).

## [0.0.30] - 2026-10-24

### Fixed

- The gateway guide is titled "Deploy the access-gate gateway" (it still said "NFT gate gateway").

## [0.0.29] - 2026-10-24

### Changed

- Dependencies on the latest package releases (`access-gate-sui` 0.0.9, `access-gate-client` 0.0.11, `access-gate-gateway-client` 0.0.20, `ui` 0.1.33, `wallet-adapter` 0.0.18); pages name the access-gate gateway `access-gate-gateway` (workspace naming convention, ADR-0003).

## [0.0.28] - 2026-10-24

### Fixed

- The image publish workflow pushed to the old repository name (`dev`); it now publishes `dev-site`, the name `config/images.yaml` pins. No code change.

## [0.0.27] - 2026-10-24

### Changed

- Renamed from `dev` to `dev-site` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`). No code change beyond names, paths, hostnames and dependency names; the history below keeps the old names.

## [0.0.25] - 2026-10-22

### Changed

- Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes)

## [0.0.22] - 2026-10-09

### Changed

- Release gate: the release runs the full CI workflow, the image is scanned (fixable CRITICAL/HIGH fail) before it is signed, third-party licence notices are served at /THIRD_PARTY_LICENSES and the lockfile ships in the image for SBOM tools

## [0.0.21] - 2026-10-09

### Changed

- Testnet identifiers now match the 2026-10-09 publications (the previous release built without its docs edits); the audit file is excluded from the site

## [0.0.20] - 2026-10-09

### Changed

- Image base static-server 0.1.7 (Go 1.26.9) and an explicit non-root USER; merged tooling updates; the audit file is excluded from the site (srcExclude)

## [0.0.19] - 2026-10-09

### Changed

- sui-token-template ^1.0.8 on-chain pages

## [0.0.18] - 2026-10-09

### Changed

- Testnet identifiers follow the 2026-10-09 publications (access-gate-sui 0.0.6, seal-policies-sui 0.0.7); ui ^0.1.31, design-tokens ^0.1.9; image base static-server 0.1.6

