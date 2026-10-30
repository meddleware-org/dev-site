# Security Audit — `dev`

**Classification:** Internal security review
**Project:** `repos/dev-site` — `@meddleware/dev-site`, VitePress developer documentation (`dev.meddleware.co.uk`): integration guides, PTB patterns, gateway and relay self-hosting, design system, imported on-chain developer pages
**Project type:** Static site (VitePress)
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08, hosting-header rows) + AUDIT_TEMPLATE_IMG.md (2026-10-08) + AUDIT_TEMPLATE_SITE.md (2026-09-30)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format:** ESM (build scripts `.mjs`, VitePress config and theme TypeScript)   **Publish model:** image + npm package (ships `docs/`, `scripts/` and config; `NPM_PUBLISH` opt-in, enabled — `@meddleware/dev-site` 0.0.23 is on npm)
**Runtime targets:** browser (static HTML); Node 24 for the build   **Peer dependencies:** none
**Generator:** vitepress 2.0.0-alpha.20 (vue 3.5.44, TypeScript 6.0.3); vitest 5.0.5 (unit tests); no TypeDoc step (the API reference is on `docs.`)
**Generated sources:** `scripts/gen-onchain.mjs` — the Move packages' `docs/onchain` pages from `@meddleware/access-gate-sui` 0.0.6, `sealed-storage-sui` 0.0.7, `token-issuance-template-sui` 1.0.9 (lockfile; `ONCHAIN_DOCS_ROOT` is a local preview override only)
**Audience:** developers and operators (user-facing documentation is `docs.meddleware.co.uk`)
**Unpublished material:** `drafts/` (retired DAO page, vault notes) sits outside `srcDir`, is not in the npm `files` list and is never linked; this audit lives in `docs/audit/` and is excluded from the site by `srcExclude: ['audit/**']` (live `/audit/dev-audit` answers 404); `package.json` `files` negates it, the generated pages and the cache for the npm package, and the build fails if an audit page reaches `dist/` (F9, 0.0.23); white-label content is annotation-only (HTML comments, stripped by VitePress)
**Images:** `quay.io/meddleware-org/dev-site:0.0.23@sha256:e94eed8395950ad219813bce2c4f3b0b22fbb89061be641f4c552c2f3b9257d6` (Docker Hub mirror, same digest; cosign keyless signature verified 2026-10-18 against the workflow-anchored identity, `verify-digests.sh` 16/16; SPDX SBOM attestation, build provenance). Superseded 0.0.22 was `sha256:dfad63d6…ee1c`
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000` in 0.0.23 (the 0.0.22 image deployed 2026-10-09 was on 0.1.7, `sha256:2e227311…2379`, Go 1.26.9)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/dev-site/overlays/default`; digest from `config/images.yaml`
**Build args:** `CSP` only (the Content-Security-Policy string) — not secret, not a test switch; no `VITE_*`
**Deployment status:** npm v0.0.23 and image `quay.io/meddleware-org/dev-site` 0.0.23 serving `dev.meddleware.co.uk` (`sha256:e94eed83…57d6`; release tag `v0.0.23` = `497bb5d`; released, signature verified and deployed 2026-10-18, rollout succeeded; 0.0.22 `sha256:dfad63d6…` was deployed 2026-10-09; live headers, `/sui/` (200), an unknown path (404) and `/THIRD_PARTY_LICENSES` (200) re-checked 2026-10-18; live `/sui/` carries the republished testnet ids `access_gate` `0xd7ddaa94…`, PlatformConfig `0x3f81489d…`, `seal_policies` `0x0c8f7349…`, PolicyConfig `0xee0403ba…`)
**Review date:** 2026-10-03 (first pass) · re-verified 2026-10-09 · fixes 2026-10-18 (0.0.23, released and deployed); 0.0.32 re-verified 2026-10-30 (Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages); 0.0.33 re-verified 2026-10-30 (Dependency updates (minor and patch groups) and workflow action bumps)
**Reviewer:** Internal review
**Severity ceiling:** Low — static content. Its code samples are copied into other people's apps, so a sample that teaches an unsafe pattern is the realistic harm.
**Status:** re-verified 2026-10-09; 0.0.23 fixes applied 2026-10-18 (commit `6de2998`; released and deployed 2026-10-18, signature verified, rollout succeeded)

---

## Executive summary

The developer counterpart of the docs site, built the same way: hand-written guides, on-chain pages
imported from the Move packages (`gen:onchain`), a hash-pinned CSP checked at build time, and a signed
image on static-server. Every `@meddleware/*` import in its code samples resolves to a real export of
the current packages (checked mechanically for this pass).

This first pass found, and fixed in 0.0.17:

- **F1 (Low)** — the blob-read samples used a bare `fetch` of the aggregator URL, teaching readers to
  skip the timeout, size cap and consistency check that walrus-storage-client's `readBlob` provides.
- **F2 (Low)** — the same SPA-fallback serving as the docs site (docs F11): deep links returned the
  home page and unknown paths returned 200. Fixed with static-server 0.1.4's clean URLs and 404 page.
- **F3 (Low)** — the blocking external link check could not resolve root-relative links with the
  current lychee; given an absolute root it checks external links only.

Re-verified 2026-10-09 (0.0.22; type-check clean, CSP check over 29 pages, audit gate 1 allowlisted /
0 open; live site `dev.meddleware.co.uk` read the same week). F1–F5 hold. The republished testnet ids
(`access_gate` `0xd7ddaa94…`, `seal_policies` `0x0c8f7349…`) are what the site shows. Fixed since the
first pass:

- **F11 (Low, RESOLVED 0.0.20–0.0.22)** — the image release now runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES` (HTTP 200 live), runs as an explicit `USER 65534:65534` on static-server 0.1.7,
  and the pod sets `automountServiceAccountToken: false`.

The newly applicable lens checks, and re-reading the samples against the current packages, found defects
that were recorded DEFERRED on 2026-10-09. **All of them are RESOLVED in 0.0.23 (2026-10-18)**:
**F6** `scripts/check-onchain-ids.mjs` fails the build when a page's id differs from the clients'
`deployments`; **F7** the samples follow the current signatures (`buildAccessProof`, `createGatedAccess`,
`createRelayAccessToken`, the Seal controller) and every fenced `ts` block is now type-checked against the
installed packages in CI; **F8** the gateway guide describes protocol v2 and the required `GATEWAY_ORIGIN`,
`NETWORK`, `NFT_TYPE`, `GATE_ID`; **F9** the npm package no longer carries the audit, the generated pages or
the cache (62 files, now 36); **F10** `npm test` runs in CI and both release gates; **F12** the template
range is `^1.0.9`; **F16** `npm-publish.yml` `verify` calls `node-ci.yml`; **F17** `CLAUDE.md` and
`SECURITY.md` describe the pipeline. Accepted or maintainer items: **F13** blanket `connect-src https:`
(RESOLVED 2026-10-22, 0.0.26: `connect-src 'self'` after a browser probe); **F14** the cosign identity pinned the repository,
not the workflow (RESOLVED 2026-10-18: the workspace `verify-digests.sh` default is now workflow-anchored); **F15** registry mirror and credential inventory (DEFERRED,
maintainer).

The severity ceiling stays Low.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Developer reader | nothing | copy samples into their app | samples use the hardened client APIs (F1) and compile against the installed packages (F7) |
| Content author | PR access | change guides | review; build dead-link check; CSP hash check |
| Build inputs | installed Move packages | shape on-chain pages | lockfile-pinned; read from `node_modules` only |
| Publish path | registry tokens; npm OIDC | push an altered image or package | tag-gated CI; Trivy then cosign; SBOM and provenance attestations |
| Base-image publisher, registry | image layers, the manifest served for a tag | ship altered bytes | digest pinning (build and runtime base, deployment by digest); signature verified by `verify-digests.sh` |
| Upstream packages the generator reads | on-chain pages, ids shown to developers | change what readers see | lockfile-pinned versions (F5); generated output git-ignored; the ids typed into the testnet table and the Seal sample are checked against the clients' `deployments` at build time (F6) |
| Client packages the samples describe | the call shapes developers copy | leave samples behind the API | every fenced `ts` sample is type-checked against the installed packages in CI (F7) |
| External link targets | content behind every outbound link | send readers elsewhere | weekly blocking lychee run (F3) |
| Build environment | which drafts or local overrides reach the output | ship a draft or a preview-root build | `drafts/` outside `srcDir`; `srcExclude`; `ONCHAIN_DOCS_ROOT` unset in CI and the image; `.dockerignore` excludes local env files |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.0.23):** `docs/**` (guides, design system, getting started, Sui sections),
  `docs/.vitepress/**`, `scripts/{gen-onchain,check-onchain-ids,check-dist-no-audit,check-csp-inline,third-party-licenses}.mjs`, `tests/**`, `Dockerfile`,
  `.dockerignore`, workflows, `.github/{audit-gate.mjs,audit-allowlist.json,dependabot.yml}`, `SECURITY.md`,
  `CLAUDE.md`, `post-bootstrap/dev-site/` (read-only).
- **Out of scope:** the packages documented (own audits); `drafts/` (not built, not published).
- **Environment (2026-10-18, 0.0.23):** `tsc --noEmit` (clean); `npm test` (vitest 5.0.5: 18 tests in 3
  files); stylelint, eslint and html-validate (clean); `npm run build` including `check-onchain-ids.mjs`
  and `check-dist-no-audit.mjs`; `check-csp-inline.mjs` against the 0.0.23 `dist` (29 HTML files, all inline
  scripts covered); `check:licenses` (27 production packages); audit gate (1 allowlisted advisory, 0 open);
  `npm pack --dry-run` (36 files; 62 before); installed `access-gate-client` 0.0.9, `sealed-storage-client` 0.0.20,
  `walrus-storage-client` 0.0.28, `access-gate-gateway-client` 0.0.17, `wallet-adapter` 0.0.17, `@mysten/sui` 2.36.0; protocol
  text read against `nft-gate` 0.0.22 (`gateway-workers`, `gateway-rust`) and `access-gate-gateway-client` 0.0.17.
  Live probes of 2026-10-09/10 (headers, `/THIRD_PARTY_LICENSES`, deep links, the 404 page, the testnet ids of
  `dev.meddleware.co.uk`) were not repeated. Earlier (2026-10-09): `npm pack --dry-run` (62 files) and the
  published 0.0.22 tarball (44 files) listed.

## Findings

### F1 — Samples read blobs with a bare `fetch`

**Severity:** Low   **Disposition:** RESOLVED (0.0.17)
**Where:** `docs/sui/walrus-storage/index.md`, `docs/sui/sealed-storage/integration.md`
**Issue / impact:** `await fetch(walrusBlobUrl(…))` has no timeout, no size limit and no
`strict_consistency_check`; readers copying it inherit an unbounded read of attacker-chosen blobs.
**Remediation / evidence:** both samples use `readBlob(blobId, { aggregator:
WALRUS_AGGREGATOR_HOSTS.testnet })` from `@meddleware/walrus-storage-client/http` (walrus-storage-client F10), and
keep `walrusBlobUrl` only for links and `<img src>`. Re-checked 2026-10-09: the only `readBlob` uses are in
those two pages and the only bare `fetch` left is the gateway call in the access-proof sample.

### F2 — SPA fallback on a multi-page site

**Severity:** Low   **Disposition:** RESOLVED (0.0.17; static-server 0.1.4)
**Where:** `Dockerfile`, `post-bootstrap/dev-site/base/deployment.yaml`
**Issue / impact:** as docs F11 — clean URLs were answered with the home page, and unknown paths
(e.g. the `/sui/dao/` and `/treasury/` links two apps carried) returned 200.
**Remediation / evidence:** `CLEAN_URLS=true`, `NOT_FOUND_PAGE=/404.html`, no SPA fallback; the
apps' dead dev links were fixed (dao-ui 0.1.28, treasury-ui 0.0.11). Re-checked 2026-10-09 on the live
site (static-server 0.1.7 now): `/sui/no-such` answers 404, deep links answer 200, and the deployment
still sets the three variables.

### F3 — External link check could not run

**Severity:** Low   **Disposition:** RESOLVED (`dev` main, CI only)
**Where:** `.github/workflows/node-ci.yml`
**Issue / impact:** lychee 0.24 refuses root-relative links without a root directory, so the check
errored on the site's own links rather than testing external ones.
**Remediation / evidence:** `--root-dir ${{ github.workspace }}/docs` with `--scheme https --scheme
http`: internal links stay with the VitePress build, lychee tests external links (0 errors locally).
Re-read 2026-10-09: both lychee steps in `node-ci.yml` are unchanged (npmjs.com excluded,
`--accept 200,206,429`; report-only on push, blocking weekly).

### F4 — Static site hardening

**Severity:** Positive — no off-origin scripts; VitePress's inline bootstrap scripts allowed by hash
and checked on every build (re-checked 2026-10-09: 29 pages covered; the live header adds only
static-server's per-response nonce); no source maps or secrets (grep over the tracked Markdown and theme:
no secret, internal host or key text); signed, attested, digest-pinned image.

### F5 — On-chain pages imported, not authored

**Severity:** Positive — the Move packages own their developer pages; `gen:onchain` copies the pages
their manifests assign to this site from the installed (lockfile-pinned) packages. Re-checked
2026-10-09: the generator reads `node_modules` only; the id table in `docs/sui/index.md` is not part of
the generated pages (its ids are checked at build time, F6).

### F6 — Testnet ids in the guides are typed by hand

**Severity:** Low   **Disposition:** RESOLVED (0.0.23; `scripts/check-onchain-ids.mjs`, `tests/check-onchain-ids.test.mjs`; commit `6de2998`)
**Where:** `docs/sui/index.md:40-41` (the "Testnet deployments" table); `docs/sui/sealed-storage/index.md:52-55`
(Seal key-server object ids)
**Issue:** the `access_gate` and `seal_policies` package ids and the `PlatformConfig` and `PolicyConfig`
object ids are literals in the table, although `SECURITY.md` invariant 1 says on-chain facts are "generated
from the published packages on every build, never hand-typed", and the SITE lens requires the same. The
values are correct today: they match `Published.toml` of `@meddleware/access-gate-sui` 0.0.6 and
`sealed-storage-sui` 0.0.7, the `deployments` exports of `access-gate-client` 0.0.8 and `sealed-storage-client`
0.0.19, and the live `/sui/` page (read 2026-10-10: only `0xd7ddaa94…`, `0x3f81489d…`, `0x0c8f7349…`,
`0xee0403ba…`; no superseded id). The key-server ids match `sealed-storage-ui/src/config.ts`. Nothing detects
drift: 0.0.20 shipped without its id edits and 0.0.21 had to follow (CHANGELOG 0.0.21).
**Impact:** after the next republication the table would show the previous package; a developer copying
an id would call a superseded package. `SECURITY.md` overstates what the build guarantees.
**Remediation / evidence:** 0.0.23 adds `scripts/check-onchain-ids.mjs`, run by `npm run build` before
VitePress, with `access-gate-client` and `sealed-storage-client` as dev dependencies. It loads `ACCESS_GATE_DEPLOYMENTS`
and `SEAL_POLICIES_DEPLOYMENTS` from the installed clients (`…/deployments`; the clients ship TypeScript
source, which the check transpiles with `typescript`) and fails the build when any hand-written page
(everything under `docs/` except `audit/` and the generated `sui/onchain/` tree) carries a 32-byte `0x…` id
that is neither a current testnet id of either deployment nor one of the three Seal key-server object ids
allowlisted in the script (`OTHER_IDS`, the `sealed-storage-ui` defaults), or when `docs/sui/index.md` lacks one of the
four ids it must show (`access_gate` original id and `PlatformConfig`, `seal_policies` original id and
`PolicyConfig`). It fails closed when a client or its record cannot be read. Pinned by
`tests/check-onchain-ids.test.mjs` (superseded id, missing id, mixed case, ignored trees, key-server
allowlist, short literals, missing page) and by a test that runs the check on this repository's real pages
with the installed clients. The table stays typed (it carries prose); drift can no longer ship.
`SECURITY.md` invariant 1 now says exactly that. Verified with the 0.0.23 lockfile (access-gate-client 0.0.9,
sealed-storage-client 0.0.20): the page matches.

### F7 — Code samples no longer match the current client signatures

**Severity:** Low   **Disposition:** RESOLVED (0.0.23; `tests/samples.test.mjs`, `tests/samples-context.d.ts`; commit `6de2998`)
**Where:** `docs/sui/access-gate/integration.md:29-56` (`buildAccessProof`);
`docs/sui/walrus-storage/integration.md:18-35` (`createGatedAccess`) and `:57` (`createRelayAccessToken`);
`docs/sui/sealed-storage/index.md:36-58` and `integration.md:6-25` (`SealController`, `encrypt`)
**Issue:** every imported name exists in the installed packages (checked by script 2026-10-09:
`access-gate-client` 0.0.8, `sealed-storage-client` 0.0.19, `walrus-storage-client` 0.0.26, `access-gate-gateway-client` 0.0.16, `ui`,
`design-tokens`; `useWallet` in `wallet-adapter`), but several call shapes are the pre-2026-10-08 ones:
- `buildAccessProof({ address, challenge, sign })` — since access-gate-gateway-client 0.0.16 (protocol v2) it also
  requires `gateway`, `gateId` and `network` (the signed message binds them); the sample does not
  compile and would be refused at runtime.
- `createGatedAccess({ … })` and `createRelayAccessToken({ … })` — walrus-storage-client now requires `gateId` and
  `network` (signed into every proof).
- the Seal sample builds `SealController` without `accessGateOriginalId`, so `encrypt('nft-gate', …)` does
  not read the gate, and the guide never says that sealing to a gate that mints **transferable** passes is
  refused by default (sealed-storage-client 0.0.18; `allowTransferableGates` opts in): a holder can freeze or share
  such a pass and the content becomes effectively public. Sample and text teach sealing to any gate.
- `parseSealedManifest(untrustedJson)` omits the registry argument that validates a manifest's `params`
  at import (sealed-storage-client 0.0.17; optional, but the safer form).
**Impact:** the realistic harm named in the severity ceiling: a developer copies a sample that does not
run, or that seals content to a gate whose passes can be made public. No user funds are involved.
**Remediation / evidence:** 0.0.23 edits the samples: `buildAccessProof` passes `gateway`, `gateId` and
`network` (both the single-gate and the single-use sample, which now also imports what it uses);
`createGatedAccess<Transaction>` passes `gateId` and `network`; a new `createRelayAccessToken` sample shows
`gateId`, `network` and `sign`; the Seal sample sets `accessGateOriginalId` (from
`accessGateDeployment('testnet').originalId`, also given to `createDefaultRegistry`), carries a warning
that `encrypt('nft-gate', …)` refuses a gate that mints transferable passes (`allowTransferableGates` opts
in) and that without `accessGateOriginalId` the gate is not read, and the integration guide repeats it next
to the encrypt step; `parseSealedManifest(untrustedJson, registry)` passes the registry. The type-check
found four further defects that the import-name check could not see, now fixed: the lifetime and
attribute samples did not `await` `extendBlobLifetimeTransaction` / `setBlobAttributesTransaction` (they
return promises), the single-use sample used `fetchChallenge` and `buildAccessProof` without importing
them, and the wallet-adapter sample used the `Transaction` type without importing it. **Recurrence:** `tests/samples.test.mjs` extracts every fenced `ts` block under `docs/` (not
`audit/`, not the generated pages), wraps it as a module (imports at the top level, the rest in an async
function, line numbers preserved) and compiles it with the TypeScript API against the installed
`@meddleware/*` and `@mysten/*` packages in strict mode, reporting `file:line`. The names the prose assumes
(`exec` is the executor `buildExecutor()` returns, `gate` an `AccessGateConfig`, `client`, `walrus`, `seal`,
…) are typed from the real packages in `tests/samples-context.d.ts`. A block that cannot be checked needs a
`<!-- sample: skip — reason -->` line (none today; the test caps them at six). The test is pinned by a
self-test that a wrong call is reported at the right Markdown line. It runs in CI and in both release gates
(F10, F16).

### F8 — The gateway guide describes the pre-v2 protocol and configuration

**Severity:** Low   **Disposition:** RESOLVED (0.0.23; `gateway.md`, `index.md`, `relay-self-host.md`; commit `6de2998`)
**Where:** `docs/sui/access-gate/gateway.md:28-31` and `:36-50`, `docs/sui/access-gate/index.md:35`
**Issue:** the pages say the wallet signs `nft-gate:access:<nonce>` and list `GATE_ID` as optional. Since
nft-gate 0.0.19 / access-gate-gateway-client 0.0.16 the signed message is `nft-gate:access:v2`, multi-line, binding
the gateway origin, gate id, network, nonce and (single-use) consume digest, and the Workers gateway
requires `GATE_ID`, `GATEWAY_ORIGIN` (a canonical https origin) and `NETWORK` (`gateway-workers/src/config.ts`
`req(...)`). The responses table omits that `409` carries `code: redeemed | leased`. The Docker snippet
for the Rust gateway has the same gaps; that gateway is kept at parity but is not deployed.
**Impact:** an operator following the guide deploys a gateway that refuses to start, or a client builds a
v1 message that every v2 gateway rejects. Both fail closed.
**Remediation / evidence:** `gateway.md` now states the `nft-gate:access:v2` message (origin, gate, network,
nonce, consume digest) with a pointer to access-gate-gateway-client's wire-protocol section and `vectors.json`, lists
`GATEWAY_ORIGIN`, `NETWORK`, `NFT_TYPE` and `GATE_ID` as required (and `UPSTREAM_AUTH_HEADERS` as a JSON
array, `ALLOWED_ORIGINS`), puts the three public values in the Workers `[vars]` step (no longer secrets),
adds `GATEWAY_ORIGIN`, `NETWORK`, `GATE_ID` and `ALLOW_INSECURE_HTTP` (and the `REDIS_URL` requirement with
`SINGLE_USE`) to the Docker snippet, lists the `409` codes (`redeemed`, `leased`) and links the two
implementations' complete configuration tables; `access-gate/index.md` names the v2 message in the concepts
table; `relay-self-host.md` adds the same settings and the JSON header format; `integration.md` explains why
`buildAccessProof` needs the gateway, gate and network. Read against `nft-gate` 0.0.22 `gateway-workers`
(`wrangler.toml`, `src/config.ts`, README) and `gateway-rust` README, and `access-gate-gateway-client` 0.0.17.
The table is version-stamped in the page ("checked against nft-gate 0.0.22") and sends readers to the
READMEs for the complete reference, which closes the pre-mainnet "API/flag/env pages version-stamped"
gate; the samples that build the proof are type-checked (F7).

### F9 — The npm package carries generated and internal files

**Severity:** Low   **Disposition:** RESOLVED (0.0.23; `package.json` `files`, `scripts/check-dist-no-audit.mjs`, `tests/package-contents.test.mjs`; commit `6de2998`)
**Where:** `package.json` `files` (`"docs"`); there is no `.npmignore`
**Issue:** `files` whitelists all of `docs/`, and the repository has no `.npmignore`, so
`docs/sui/onchain/` and `docs/.vitepress/generated/` (copies of the Move packages' pages, produced by
`gen:onchain`) ship in the tarball: the published 0.0.22 lists nine such files (44 files in all). The
next release would also ship `docs/audit/dev-audit.md` (`npm pack --dry-run`, 2026-10-09: 62 files). The
published 0.0.22 does not contain an audit (the file was relocated afterwards and is untracked until
committed). The site is unaffected: `srcExclude: ['audit/**']` and the live `/audit/dev-audit` answers
404, but no build step asserts that the page is absent from `dist/`.
**Impact:** duplicates of other packages' documentation under this package's name (stale after the source
package moves on), and an internal review in a public package (SITE-M4, SITE *Drafts & unpublished
material*, *Generated-content integrity*: generated output must stay out of published artefacts).
**Remediation / evidence:** a root `.npmignore` does not filter a `files` allowlist, so the fix is negations in
`package.json` `files`: `!docs/audit`, `!docs/sui/onchain`, `!docs/.vitepress/generated` (and `/cache`,
`/dist`), with the globs for their contents; `.npmignore` names the same trees. `npm pack --dry-run`
(2026-10-18): 36 files, none under `docs/audit`, `docs/sui/onchain`, `docs/.vitepress/generated`,
`docs/.vitepress/cache` or `drafts/` (62 before; the dry run also exposed 17 VitePress cache files that
the 0.0.22 audit had not listed). `tests/package-contents.test.mjs` runs `npm pack --dry-run --json` and
fails on any of these, and checks that `docs/index.md` and the scripts are present. The build now ends
with `scripts/check-dist-no-audit.mjs`, which fails if `dist/` holds a path named `audit` (or `*-audit.*`);
unit-tested on a temporary tree.

### F10 — The CI workflow has no `npm test` step

**Severity:** Info   **Disposition:** RESOLVED (0.0.23; `npm test` in `node-ci.yml`; commit `6de2998`)
**Where:** `.github/workflows/node-ci.yml`; `docker-publish.yml` `verify` calls it; `npm-publish.yml` `verify`
**Issue:** `node-ci.yml` runs the audit gate, type-check, the three linters, the build and the licence
check, but no `npm test`; the image release's `verify` job is a call to it (0.0.22, `22e82bb`), so unit
tests would no longer gate the release, and the comment in `docker-publish.yml` ("type-check, lint,
tests, build, licences") overstates it. The npm job's `verify` runs `npm run test --if-present`.
**Impact:** none today: `package.json` defines no `test` script and the repository has no test files, so
no test is skipped. The first test added (for example the sample type-check of F7) would not run in CI or
in the release gate (TS lens: every test project that exists runs in CI).
**Remediation / evidence:** the site gained a test suite (vitest 5.0.5; `npm test` = `vitest run`; 18 tests
in `tests/`: the on-chain id check F6, the sample type-check F7, the package contents and dist check F9).
`node-ci.yml` runs `npm test` (no `--if-present`: the script exists), `docker-publish.yml` `verify` and
(F16) `npm-publish.yml` `verify` call `node-ci.yml`, so both release paths run the tests. The comment in
`docker-publish.yml` names the checks accurately. Verified by reading all three workflows and `package.json`
2026-10-18.

### F11 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.0.20 `439bfed`, 0.0.22 `22e82bb`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/dev-site/base/deployment.yaml`
**Issue:** the image release was gated by a subset of CI, the published image was not scanned before
signing, the lockfile was not in the image (the SBOM saw only the base), no third-party licence texts were
served with the bundled npm code, and the runtime user was only inherited from the base.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` (`workflow_call`) and all four build jobs `need`
it; the public job runs Trivy on the pushed digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before
`cosign sign`, then an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no
`continue-on-error` on the public path; the Dockerfile runs `npm run licenses` in the build stage, copies
`package-lock.json` to `/usr/share/doc/dev/`, and CI runs `check:licenses`; `/THIRD_PARTY_LICENSES`
returns HTTP 200 live (2026-10-10); the runtime base is static-server 0.1.7 (Go 1.26.9) with an explicit
`USER 65534:65534`; the pod sets `automountServiceAccountToken: false`, `runAsNonRoot` uid 65534,
read-only root, all capabilities dropped, `RuntimeDefault` seccomp, probes and limits; the digest is
identical in `config/images.yaml` and the overlay; all images cosign-verified 2026-10-09
(`verify-digests.sh`, 16/16). Not run: a Trivy *config* scan of the Dockerfile and manifests (the image
scan runs at release).

### F12 — The template dependency range does not name the resolved version

**Severity:** Info   **Disposition:** RESOLVED (0.0.23; `package.json`; commit `6de2998`)
**Where:** `package.json` (`@meddleware/token-issuance-template-sui ^1.0.7`)
**Issue:** the range resolves to 1.0.8 (the latest published; lockfile and `npm ls` 2026-10-09), which the
on-chain pages need (supply and metadata policies applied in the coin's `init`), but the manifest does not
say so. Every other first-party range is at its latest published version (access-gate-sui `^0.0.6`,
sealed-storage-sui `^0.0.7`, ui `^0.1.31`, design-tokens `^0.1.9`).
**Impact:** a lockfile regeneration could resolve either version; documentation accuracy only.
**Remediation / evidence:** `@meddleware/token-issuance-template-sui` is `^1.0.9` (the latest published, 2026-10-18)
and the lockfile resolves 1.0.9, so the range names the version the on-chain pages were generated from. The
other first-party ranges are at their latest (`design-tokens ^0.1.10`, `ui ^0.1.31`, `access-gate-sui ^0.0.6`,
`sealed-storage-sui ^0.0.7`, clients as listed in B.1).

### F13 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** RESOLVED (`connect-src` only; 2026-10-22, 0.0.26, commit pending; was ACCEPTED-RISK)
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-10
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances,
copied from the application images; the Dockerfile comment justifies them with operator-configured RPC
and relay hosts, which this static site does not have.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self'` with two hashes and a nonce, no off-origin script (F4) and no `v-html`/`eval` in
the theme is the control on that; the site holds no secret or session.
**Remediation / evidence:** accepted for now (same decision as docs F19); tightening `connect-src` to
`'self'` needs a browser probe of the local search first (not done; 2026-10-18: left as is, no single safe
fix without that probe).

**Resolution 2026-10-22 (0.0.26, commit pending; live after the release):** the probe was run and the `CSP` argument now reads `connect-src 'self'`. A headless-browser probe (Google Chrome through playwright-core, 2026-10-22) served the production build of this repository with the new policy as a response header (`upgrade-insecure-requests` omitted because the probe ran over plain `http://127.0.0.1`): the home page loaded with no `securitypolicyviolation` event, no failed request and no console error; the local search dialog opened, `walrus` returned 16 results and Enter navigated to `/sui/walrus-storage/`; the footer (VitePress pager and the `@meddleware/ui` `AppFooter`) rendered; every request was same-origin. A control `fetch('https://example.com/x')` in the same page was blocked by `connect-src` and reported as a violation, so the listener works. Static analysis of `dist/assets` found no `new WebSocket`, `EventSource`, `XMLHttpRequest` or `sendBeacon`; the theme source (`DocsLayout.vue`) has no network call. The local search index is a same-origin dynamic `import()` (governed by `script-src`). `tests/csp.test.mjs` pins `connect-src 'self'` and the other restrictive directives (red against the old argument, green now). `img-src ... https:` is a separate allowance and is unchanged. Not run: the deployed image behind static-server, and no live header read after release.

### F14 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** RESOLVED (2026-10-18, workspace `verify-digests.sh` default; was ACCEPTED-RISK)
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepted any workflow identity of `github.com/meddleware-org/dev-site`.
**Impact:** a workflow added by someone with write access could have signed an image the check would accept.
**Remediation / evidence:** fixed in the workspace script on 2026-10-18: the default identity in
`bootstrap/images/verify-digests.sh` is now `^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`
(`COSIGN_IDENTITY_REGEXP` still overrides it), so a signature from any other workflow or ref of the repository is
rejected. All 16 deployed and contingency images verified valid against it on 2026-10-18
(`STRICT=0 bash bootstrap/images/verify-digests.sh`, 0.0.23 included); 2026-10-09 (0.0.22) was
checked with the earlier repository-wide identity. This repository publishes no verify command, so the script
default was the only remaining problem.

### F15 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` `mirror-private` job (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the `mirror-private` job (a digest-preserving copy of the published, signed image, not a rebuild) fails without registry credentials; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (the cluster pins digests and
verifies signatures, so it would not run).
**Remediation / evidence:** the mirror is listed as best-effort; the public jobs have no
`continue-on-error`. The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

### F16 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** RESOLVED (0.0.23; `npm-publish.yml` `verify` calls `node-ci.yml`; commit `6de2998`)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and `npm run test
--if-present`, not the full CI workflow (linters, build, licence check). The image release (F11) does run
the full workflow on the same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source (`docs/`, `scripts/`), not the built site.
**Remediation / evidence:** was accepted on 2026-10-09 (OIDC-published with provenance, tag == version checked,
idempotent, opt-in through `NPM_PUBLISH`); the single clear fix is now made: `verify` is
`uses: ./.github/workflows/node-ci.yml`, as in the image release, so the npm job runs the audit gate,
type-check, unit tests, linters, build with the id check, and the licence check on the tagged commit.

### F17 — Contributor documents disagree with the pipeline

**Severity:** Info   **Disposition:** RESOLVED (0.0.23; `CLAUDE.md`, `SECURITY.md`; commit `6de2998`)
**Where:** `CLAUDE.md` ("`npm run build` is the only required CI step"); `SECURITY.md` invariant 1 (F6)
**Issue:** CI also runs the audit gate, type-check, three linters and the licence check, and the image
build runs the CSP check; `SECURITY.md` says ids are never hand-typed (F6). `CLAUDE.md` and the audit
agree on the white-label and drafts rules, which hold (`drafts/` is outside `srcDir`, absent from `files`
and from the site).
**Impact:** documentation only.
**Remediation / evidence:** `CLAUDE.md` replaces "`npm run build` is the only required CI step" with the real
check list (audit gate, type-check, `npm test`, three linters, build, licence check, the image's CSP check),
the on-chain id check and how to update after a republication, the sample type-check and its context file and
skip marker, and the packaging rules; `SECURITY.md` invariant 1 says that the generated pages come from the
packages and the typed ids are checked at build time (F6), and a new invariant 4 covers the sample
type-check and the audit never reaching `dist/` or the package.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | Static content only | source | build | HOLDS |
| I2 | Samples import only real exports and use the hardened APIs | content; type-check | `tests/samples.test.mjs`; review | HOLDS (F1, F7) |
| I3 | Every inline script allowed by the CSP hashes | `check-csp-inline.mjs` | build | HOLDS (F4) |
| I4 | Internal links resolve; external links checked | VitePress; lychee | CI | HOLDS (F3) |
| I5 | Each URL serves its own page; unknown URLs 404 | static-server options | docs image probe (same configuration) | HOLDS (F2) |
| I6 | Generated pages from pinned inputs | `gen-onchain.mjs` | lockfile | HOLDS (F5) |
| I7 | On-chain ids shown to readers equal the recorded deployment | `scripts/check-onchain-ids.mjs` in `build` (typed ids in `docs/sui/index.md`, the Seal key-server ids allowlisted) | `tests/check-onchain-ids.test.mjs`, the real pages checked against the installed clients' `deployments` in the build and the tests | HOLDS (F6) |
| I8 | Samples call the current client signatures | `tests/samples.test.mjs` (every fenced `ts` block compiled against the installed packages) | CI and both release gates | HOLDS (F7) |
| I9 | The gateway guide matches the deployed protocol and configuration | content, version-stamped table | read against access-gate-gateway-client 0.0.17 and nft-gate 0.0.22 (`gateway-workers`, `gateway-rust`) on 2026-10-18; the proof-building samples are type-checked | HOLDS (F8) |
| I10 | Drafts and the audit file are absent from every published artefact | `drafts/` outside `srcDir`, `srcExclude` (site); `files` negations (npm); `check-dist-no-audit.mjs` (build output) | `tests/package-contents.test.mjs` (`npm pack --dry-run`: 36 files); live `/audit/dev-audit` 404 (2026-10-10) | HOLDS (F9) |
| I11 | The unit tests run on every change and every release | `node-ci.yml` `npm test`; both release workflows call `node-ci.yml` | workflows read 2026-10-18 | HOLDS (F10, F16) |
| I12 | The release ships only what full CI accepted, scanned and signed | `docker-publish.yml` `verify` → `node-ci.yml`; Trivy before cosign | workflow read 2026-10-09 | HOLDS (F11) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SITE | Generated-content integrity | HOLDS (I6) — the generator reads lockfile-pinned installed packages; output (`docs/sui/onchain/`, `.vitepress/generated/`) is git-ignored, `.dockerignore`d and negated in the npm `files`; `ONCHAIN_DOCS_ROOT` is a local preview override only. The generator fails soft (placeholder pages) |
| SITE | On-chain facts | HOLDS (I7) — the on-chain pages come from the packages; the typed ids are checked at build time against the clients' `deployments` (F6) |
| SITE | Drafts & unpublished material | HOLDS (I10) — `drafts/` outside `srcDir`, `srcExclude`, live 404, `files` negations, `check-dist-no-audit.mjs` (F9) |
| SITE | No sensitive content | HOLDS — no secret, internal host or private-key text in the tracked Markdown; audience separation stated (developers here, end users on `docs.`); white-label content is annotation-only |
| SITE | Links | HOLDS (I4) — VitePress fails on internal dead links; weekly blocking lychee run, npmjs.com excluded |
| SITE | Inline scripts | HOLDS (I3) — two hashes in the `CSP` argument, `check-csp-inline.mjs` in the image build; the live header adds only static-server's nonce |
| SITE | Accuracy against code | HOLDS (I8, I9) — imported pages are generated; the samples are type-checked against the installed clients (F7) and the gateway guide matches protocol v2 (F8) |
| SITE | Serving semantics | HOLDS (I5) |
| VUE | Hosting headers | HOLDS — live (2026-10-10): CSP (`default-src 'self'`, `script-src 'self'` + two hashes + nonce, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`), HSTS 1 year, nosniff, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`; blanket `connect-src https:` is F13 |
| TS | Compiler strictness, assertions, validation, money, network I/O, encoding, dynamic code | HOLDS — `strict: true` over the VitePress config and theme (`tsc --noEmit` in CI); the build scripts are `.mjs` and read `node_modules` only; no `v-html`, `eval` or `fetch` in the theme; the guides' samples are compiled in strict mode by `tests/samples.test.mjs` (F7) |
| TS | Supply chain | HOLDS — `npm ci`, audit gate in CI and the npm job (1 allowlisted, 0 open), `npm@11.20.0` pinned in publish; packaging F9 fixed; first-party ranges at their latest (F12) |
| TS | Test projects in CI | HOLDS (I11) — one vitest project (`tests/`), run by `node-ci.yml` and so by both release gates (F10) |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F11) — digest-pinned `node:24-slim` and static-server 0.1.8 (0.0.23); `.dockerignore` excludes `node_modules`, `dist`, caches, generated output, `.git`, `.github` and `.env*.local`; `npm ci`; the only `ARG` is the public `CSP`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Verification command | HOLDS — this repository publishes no command; the cluster check pins `docker-publish.yml@refs/tags/v` (F14, RESOLVED 2026-10-18) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag (`0.0.1`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `vitepress` | 2.0.0-alpha.20 (lockfile) | build only | clean | pre-release; the CSP check fails the build when its inline scripts change |
| `vitest` | `~5.0.5` | tests only | clean | dev |
| `@meddleware/access-gate-sui`, `sealed-storage-sui`, `token-issuance-template-sui` | `^0.0.6`, `^0.0.7`, `^1.0.9` (all latest, 2026-10-18) | build only | clean | on-chain pages; F12 |
| `@meddleware/ui`, `design-tokens` | `^0.1.31`, `^0.1.10` (latest) | theme | clean | |
| `@meddleware/*` clients, `@mysten/*` | access-gate-client `^0.0.9`, sealed-storage-client `^0.0.20`, access-gate-gateway-client `^0.0.17`, walrus-storage-client `^0.0.28`, wallet-adapter `^0.0.17`; `@mysten/sui ^2.36.0`, `seal ^1.5.0`, `walrus ~1.2.35` (all dev dependencies) | tests and the id check only | clean | not shipped in the site; they are what the samples are compiled against (F6, F7) |
| Link checker | lychee-action pinned by SHA | none | — | CI only |
| `node:24-slim` / `static-server` | digest-pinned / 0.1.8 (0.0.23, deployed 2026-10-18; 0.0.22 was on 0.1.7) | build / runtime | Trivy at release (F11); Go 1.26.9 (0.1.7) | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | TS lens B.TS-3 |

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` (dev, optional, macOS
only); no `allowScripts`, no `overrides`, no `prepare`/`postinstall`. `files`: `docs` (with negations for
`docs/audit`, `docs/sui/onchain`, `docs/.vitepress/{generated,cache,dist}`), `tsconfig.json`, `CHANGELOG.md`,
`scripts` (`npm pack --dry-run` 2026-10-18: 36 files; no tests, fixtures, `.env*`, audit file or generated
pages, F9). Node range `^22.18.0 || >=24.12.0`; CI and the image use 24.

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance | package | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN`, `PRIVATE_REGISTRY_*` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F15 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the signing job, `id-token` only on the npm publish
job); OIDC publish with a tag == version check and an idempotent registry check; npm client pinned
(`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM attestation +
provenance, no `continue-on-error` on the public path (F11); both release workflows call the full CI workflow,
unit tests included (F10, F16); `npm ci` everywhere; audit gate in CI (and so in both releases); Dependabot weekly and
grouped for npm, Docker and Actions (`.github/dependabot.yml`); no test-only build mode exists; no job
spends real funds.

### B.VUE-1 Hosting headers

Live headers on `dev.meddleware.co.uk`, read 2026-10-10: `Content-Security-Policy` (`default-src 'self'`,
`script-src 'self'` with the two VitePress hashes and a per-response nonce, `style-src 'self'
'unsafe-inline'`, `img-src 'self' data: blob: https:`, `connect-src 'self' https:` (0.0.26 and later: `'self'`), `worker-src 'self'
blob:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
`upgrade-insecure-requests`), `Strict-Transport-Security` (1 year, includeSubDomains),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`. The CSP is static-server's
(`CONTENT_SECURITY_POLICY` from the `CSP` build argument); no static host and no `_headers` file.
`'unsafe-inline'` is for styles only. The blanket `https:` in `img-src` is F13 (the `connect-src` one was removed in 0.0.26). The
inline-script rule is enforced at build time by `check-csp-inline.mjs` (SITE and VUE lenses).

### B.VUE-2 / B.IMG Build inputs and artifacts

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.8@sha256:e32cf42b…` runtime (0.0.23, deployed 2026-10-18; the 0.0.22 image was on 0.1.7), both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; the only `ARG` is the public `CSP`;
VitePress emits no source maps for the production build; the deployment is read-only root,
`runAsNonRoot` uid 65534, no privilege escalation, all capabilities dropped, `RuntimeDefault` seccomp,
`automountServiceAccountToken: false`, probes, and requests/limits; digest `sha256:dfad63d6…` in both
`config/images.yaml` and the overlay; cosign signature verified 2026-10-09 (F14). Not run: a Trivy
*config* scan of the Dockerfile and manifests (F11).

### B.SITE Generator inputs

| Input | Version / pin | Used for |
| --- | --- | --- |
| vitepress | 2.0.0-alpha.20 (lockfile) | site build |
| access-gate-sui, sealed-storage-sui, token-issuance-template-sui | 0.0.6, 0.0.7, 1.0.9 (lockfile) | `gen-onchain.mjs` |
| access-gate-client, sealed-storage-client | 0.0.9, 0.0.20 (lockfile) | `check-onchain-ids.mjs` (the `deployments` records) |
| lychee | `lycheeverse/lychee-action` v2.9.0 (SHA) | external-link check |

Latest-ID rule: the generated pages and the typed table (checked against the clients, F6) show a package id that is both published-at and
original-id (first versions of the republished packages); the table labels the two columns and says
"same (v1)".

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — N/A (static content)

Three vitest files (`tests/`, 18 tests; `npm test`): the on-chain id check (unit cases on temporary trees
plus a run against this repository's real pages and the installed clients), the sample type-check (every
fenced `ts` block compiled against the installed packages, with a self-test that a wrong call is reported at
its Markdown line) and the package contents (`npm pack --dry-run`) with the dist audit check. The other gates
are type-check, three linters (stylelint, eslint with vuejs-accessibility, html-validate over the theme
components), the build's internal dead-link check, the CSP hash check (29 pages; image build), the
licence-notice check and the external link checks, all in `node-ci.yml` except the CSP check. The
production build and the generator run from a clean checkout in CI. Not covered: the theme components
(static, no logic) and the served behaviour (live probe).

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Build and checks | yes | — | CI |
| Samples against the current client signatures | yes (the packages are dev dependencies; no network) | — | `tests/samples.test.mjs` (F7) |
| External links | no | CI (weekly, blocking) | lychee |
| Served behaviour (clean URLs, 404, headers, notices) | no | deployment | live probe 2026-10-09/10 (deep links 200, unknown path 404, headers, `/THIRD_PARTY_LICENSES` 200) |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] build, type-check and linters green; no secrets in source (2026-10-09)
- [x] generator reads pinned inputs (lockfile); generated output git-ignored; drafts outside the published tree (`drafts/`, `srcExclude`)

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified (re-read on 0.0.23 on 2026-10-18 with `curl -I`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)
- [x] 0.0.23 deployed by digest (2026-10-18; 0.0.22 on 2026-10-09); live probe of a deep link and an unknown path, headers and `/THIRD_PARTY_LICENSES` (2026-10-10 on 0.0.22; on 0.0.23 on 2026-10-18: `/` 200, `/sui/` 200, an unknown path 404, `/THIRD_PARTY_LICENSES` 200, headers present)
- [x] inline scripts hash-covered and checked at build time (`check-csp-inline.mjs`, 29 pages); link check in CI (F3)
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, signed with SBOM and provenance, scanned before signing (F11)
- [x] on-chain facts checked against the canonical record — `check-onchain-ids.mjs` in `build`, the `deployments` of access-gate-client 0.0.9 and sealed-storage-client 0.0.20, `tests/check-onchain-ids.test.mjs` (F6, 0.0.23, 2026-10-18)
- [x] samples match the current client signatures; gateway guide matches protocol v2 — every `ts` sample type-checked (`tests/samples.test.mjs`); `gateway.md` read against nft-gate 0.0.22 and access-gate-gateway-client 0.0.17 (F7, F8, 0.0.23, 2026-10-18)
- [x] every test project runs in CI — `npm test` in `node-ci.yml`, called by both release workflows (F10, F16, 0.0.23, 2026-10-18)
- [x] the audit file and generated pages are excluded from the npm package — `files` negations, `npm pack --dry-run` 36 files, `tests/package-contents.test.mjs`, `check-dist-no-audit.mjs` (F9, 0.0.23, 2026-10-18)

### pre-mainnet

- [ ] mainnet identifiers in the integration guides once published — mainnet-blocked
- [x] no sensitive or operator-only content published; audience separation stated (developers here, end users on `docs.`)
- [x] API/flag/env pages generated or version-stamped — the gateway configuration table is corrected, stamped "checked against nft-gate 0.0.22" and links the READMEs' complete tables (F8, 0.0.23, 2026-10-18)
- [ ] registry credential inventory and rotation (F15) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Samples are code** — guides teach the hardened client APIs, not raw requests (F1), and are compiled
  against the installed clients in CI (F7).
- **Retired features** — no dev pages for DAO or Treasury; apps link the Access Gate guide instead.
- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions (F12); signed images with SBOM and provenance, Trivy
  before signing, SHA-pinned actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **Wire-format coupling** — the gateway proof message is defined in access-gate-gateway-client and pinned by its
  `vectors.json`; this site restates it in prose (version-stamped, F8) and compiles the proof-building samples against the
  client (F7).
- **On-chain-truth boundary** — the guides state no accounting; fees and terms come from the generated
  on-chain pages; the typed ids are checked at build time (F6).
- **Deployment readiness** — Section D.
- **Chain-access layering** — the guides teach the layered clients (`access-gate-client`, `sealed-storage-client`,
  `walrus-storage-client`); ids shown are the latest on-chain version, checked against the clients (F6).

## Normative requirements (MUST / MUST NOT)

- **TS-M1–TS-M9** — hold (the rule that every test project runs in CI holds since 0.0.23, F10; TS-M7
  packaging holds, F9).
- **IMG-M1–IMG-M8** — hold; IMG-M8 holds: no command is published here and the cluster check pins the publish workflow and tag refs (F14, RESOLVED 2026-10-18).
- **VUE-M8** — holds (CSP and HSTS on the one hosting path, B.VUE-1).
- **SITE-M1–M5** — hold: SITE-M2 (on-chain facts from the canonical record) is enforced by the build-time
  id check (F6), SITE-M3 holds for the site and the npm package (F9), and the *Accuracy against code*
  category holds for the samples and the gateway guide (F7, F8).

## Implementation suggestions (SHOULD / MAY)

- SHOULD keep the sample type-check and its context file current when a client changes its API (F7).
- SHOULD tighten `connect-src` to `'self'` after a browser probe of search and the footer (F13). [Done 2026-10-22, 0.0.26.]
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

None.

## Risks

- **Sample drift** — mitigated: a client API change that breaks a sample fails `npm test` once the client is
  bumped here; the gateway guide's prose and configuration table are version-stamped, not compiled (F8).
- **Pre-release generator** — VitePress is an alpha; a bump can change the emitted inline scripts (the
  build check fails closed) or the page structure.
- **Registry tokens** — long-lived robot tokens for image pushes (F15).
- **Upstream package liveness** — the build needs the registry to resolve the pinned packages; a missing
  generator input degrades to placeholder pages rather than failing (F5).

## Re-verification log

- 2026-10-03 — first full pass under AUDIT_TEMPLATE.md + TS + VUE + IMG + SITE (Phase 7). F1, F2
  RESOLVED in 0.0.17 (static-server 0.1.4); F3 RESOLVED in CI.
- 2026-10-03 — deployed 0.0.17 with the manifest change; live: `/sui/dao/` 404. The re-dispatched blocking link check is green after excluding npmjs.com pages (403 to CI runners).
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified against 0.0.22 (releases 0.0.18 to 0.0.22): every finding re-checked against the
  code, workflows, manifests, the published tarball and the live site. Template dates now cite the
  registry (TS, VUE, IMG 2026-10-08, SITE 2026-09-30); front matter gained the SITE, TS and IMG fields and
  a current deployment status (0.0.22, `sha256:dfad63d6…`, republished testnet ids). F1–F5 hold with fresh
  evidence (F2 re-probed live). New: F6 (typed ids; contradicts `SECURITY.md` invariant 1; DEFERRED), F7
  (samples behind the current `buildAccessProof`, `createGatedAccess`, `createRelayAccessToken` and Seal
  signatures; sealing to transferable gates not mentioned; DEFERRED), F8 (gateway guide describes the
  pre-v2 message and configuration; DEFERRED), F9 (npm package carries generated pages, would carry the
  audit; DEFERRED), F10 (`node-ci.yml` has no `npm test` step — the known gap; the site has no tests, so
  nothing is skipped today; DEFERRED), F11 (release gate, Trivy, lockfile, notices, `USER 65534`;
  RESOLVED 0.0.20–0.0.22), F12 (template range; DEFERRED), F13 (blanket `connect-src`; ACCEPTED-RISK),
  F14 (cosign identity; ACCEPTED-RISK), F15 (mirror and credentials; DEFERRED, maintainer), F16 (npm gate
  subset; ACCEPTED-RISK), F17 (contributor documents; DEFERRED). Verified: token-issuance-template-sui resolves
  1.0.8 in the lockfile; the live `/sui/` page shows only the new ids; CSP hash check over 29 pages; audit
  gate 1 allowlisted / 0 open. Section D ticked with evidence; unticked: the next-patch items and the
  mainnet/maintainer items.
- 2026-10-18 — fix wave, 0.0.23: F6 (build-time on-chain id check), F7 (samples follow the current
  signatures; every `ts` sample type-checked in CI; four further sample defects found by it and fixed),
  F8 (gateway guide and relay self-host guide describe protocol v2 and the required variables), F9 (`files`
  negations, `check-dist-no-audit.mjs`; the dry run also showed 17 VitePress cache files, now excluded; 62 to
  36 files), F10 (`npm test` in CI), F12 (`token-issuance-template-sui ^1.0.9`), F16 (the npm `verify` calls
  `node-ci.yml`), F17 (`CLAUDE.md`, `SECURITY.md`) RESOLVED. Dependencies moved to the latest (walrus-storage-client
  0.0.28, token-issuance-template-sui 1.0.9, access-gate-gateway-client 0.0.17, sealed-storage-client 0.0.20, access-gate-client 0.0.9,
  design-tokens 0.1.10, tooling), the clients and `@mysten/*` added as dev dependencies; image base
  static-server 0.1.8 (`sha256:e32cf42b…4000`, tag verified on quay.io). F13 and F14 stay ACCEPTED-RISK (no
  single safe fix without a browser probe or a workspace-script change); F15 stays DEFERRED (maintainer).
  Section D ticked with evidence; the mainnet-blocked, credential and external-review boxes stay open. Local
  checks: type-check, lint (css, js, html), `npm test` (18 tests), build with the id and dist checks, CSP
  check (29 pages), `check:licenses`, audit gate (1 allowlisted, 0 open), `npm pack --dry-run`.
- 2026-10-18 — released and deployed (`v0.0.23` = `497bb5d`, `0.0.23@sha256:e94eed8395950ad219813bce2c4f3b0b22fbb89061be641f4c552c2f3b9257d6`), verified live. Cosign keyless signature verified against the workflow-anchored identity (`verify-digests.sh` 16/16); published to npm and as an image; rollout (`apply.sh dev`) succeeded; the page loads in headless Chromium with no console errors or CSP violations; re-read with `curl`: `/` and `/sui/` 200 with the security headers, an unknown path 404, `/THIRD_PARTY_LICENSES` 200. Mainnet-blocked, credential and external-review gates unchanged.
- 2026-10-18 — F14 (cosign identity) RESOLVED: the default identity in `bootstrap/images/verify-digests.sh` is now workflow-anchored (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`); all 16 deployed and contingency images verified valid against it (`STRICT=0 bash bootstrap/images/verify-digests.sh`). This repository publishes no verify command, so nothing else remained.
- 2026-10-19 — dependency-bot status checked (read-only): `.github/dependabot.yml` carries the `ignore` rules and the repository has no open Dependabot pull requests (`gh pr list`, 2026-10-19). Versions, findings and gates were not re-examined in this pass.
  - `Dockerfile` on GitHub `main` now pins the `static-server` base at `0.1.9@sha256:af6cc284…edc72` (merged Dependabot docker PR); this repo was not re-released or redeployed for it, so the deployed image is still built on the 0.1.8 base (the stock default CSP added in 0.1.9 is replaced by this repo's own `CONTENT_SECURITY_POLICY`).
  - Dependabot policy encoded in .github/dependabot.yml (majors declined); open PRs merged 2026-10-19
  - `docker-publish.yml`: the private rebuild jobs are replaced by one `mirror-private` job that copies the published quay.io image (and its cosign artifacts) to the self-hosted registry by digest and fails unless the digest and the signature match (build once, promote by digest; committed locally, not yet released; the `PRIVATE_REGISTRY_*` credentials are still unset).
- 2026-10-19 — fee amounts re-priced from the workspace cost model (`docs/economics/COST_MODEL.md`, D57): the
  platform-terms note and the Access Gate integration sample quote a 0.0005 SUI commission floor (minimum paid price
  0.005 SUI). Version 0.0.24, commit pending; the generated on-chain pages follow once `@meddleware/access-gate-sui`
  0.0.7 is published and the range bumped. Measured with Node 26.12.0: type-check, lint, 18/18 tests and build
  pass. No disposition changes.
- 2026-10-22 (audit close-out) — release 0.0.25 (`v0.0.25` = `7ae69f7`; `Publish (npm)` and `Publish (Docker)` succeeded). Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes; static-server F13). Advisory: `vite` 8.3.5 in the lockfile (GHSA-587h-7wmj-h5pm, `launch-editor`; a transitive build/dev-server dependency, `package-lock.json` only). F13 (the `connect-src` item) stays open as a separate code task. No disposition change. Not re-run in this pass: the unit tests, the build and the audit gate (the tag's own CI and publish runs succeeded).
- 2026-10-22 (fix wave, 0.0.26, local commit, not released) — F13 RESOLVED for `connect-src`.
  - **Done:** the Dockerfile `CSP` argument has `connect-src 'self'`; the comment above it says why; `tests/csp.test.mjs` pins it; CHANGELOG 0.0.26 (and the missing 0.0.25 entry, the static-server 0.1.11 base). The browser probe is in F13 (search returned 16 results, no violations, a control request blocked).
  - **Measured:** type-check, lint, vitest (21 tests, 4 files; the new test red before the change), build and the audit gate pass. `img-src ... https:` is unchanged.
  - **Not verified:** the deployed header after release (read it with `curl -sI https://dev.meddleware.co.uk/` once 0.0.26 is deployed).
- 2026-10-24 — repository renamed from `dev` to `dev-site` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`): package, image, host and path names updated throughout. No finding, disposition or evidence changed.
- 2026-10-24 — identifier alignment (`docs/architecture/ADR-0004-identifier-alignment.md`): protocol pages updated (`access-gate-gateway:access:v3`, `Via: 1.1 access-gate-gateway`, `sealed_storage`, `token_issuance_template`).
- 2026-10-24 — `robots.txt`, curated `llms.txt`, and `llms-full.txt` generated after `vitepress build` from the published pages only (audit and generated API pages excluded; `check-dist-no-audit.mjs` still runs last). Build verified.
