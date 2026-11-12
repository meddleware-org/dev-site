# CLAUDE.md — @meddleware/dev-site

Developer documentation site for `meddleware.dev`. VitePress 2.0.0-alpha.21 (an exact pin: `@meddleware/vitepress-theme` patches two of its components).

## Purpose

For **developers** who integrate the platform (SDK users), self-host it (relay, gateway, indexer) or contribute to a repository. It is
complete, accurate and exhaustive for them, and holds nothing irrelevant to them. Covers:

- Getting started (toolchain with the real CLI versions, local development of every repository)
- Sui: the Move packages and their deployments, the SDKs (`access-gate-client`, `access-gate-gateway-client`, `sealed-storage-client`,
  `walrus-storage-client`, `token-issuance-client`), the gateway, the Walrus relay, the Treasury's data and the read indexer
- Libraries: `wallet-adapter`, `web-utils`, `frontend-config`, `walrus-storage-kit`, `vitepress-theme`
- Design system (`@meddleware/design-tokens`, `@meddleware/ui` including `AppToolShell`, `BrandMark` and the shared favicon set)

## What this package is NOT

- No TypeDoc / API reference generation: the generated client references live on `docs-site` (`docs.meddleware.co.uk/blockchain/sui/<tool>/api/`) and are linked from the navigation.
- No user-facing product documentation: that is `repos/docs-site/`.
- No published white-label or DAO content (see Drafts).

## Theme and browser tests

The theme is `@meddleware/vitepress-theme` (`docs/.vitepress/theme/index.ts` extends it with the `NetworkNotice` component) and
`docs/.vitepress/config.ts` is its `baseConfig` with this site's nav and sidebar; the site has no stylesheet of its own. `npm run test:e2e`
builds the site and runs the shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced
colours, keyboard) over the pages in `e2e/pages.ts` (add every new page there); `E2E_BROWSERS=all` runs five browsers (CI does).

The brand work is the theme's: the favicon set and `site.webmanifest` (from `@meddleware/ui/brand/*`), the nav-bar `BrandMark` and the absence of
web fonts come from `@meddleware/vitepress-theme` 0.0.5. The site keeps no `docs/public/favicon.*` and no icon `<link>` in `config.ts`.
`tests/dist-brand.test.mjs` checks the built `dist/` (icon set, one SVG icon link per page, the mark in the nav bar, no `.woff2` or font preload, no
third-party origin); it skips when `dist/` is absent unless `REQUIRE_DIST=1`, which CI sets after the build. The `docs` CSP allows only
same-origin and `data:` images, so a page cannot use an external image. Every workflow sets `DO_NOT_TRACK: "1"`.

## Build

```bash
npm run build    # gen:onchain → check:onchain-ids → vitepress build docs → dist/ → llms-full.txt → check dist has no audit page
npm run dev      # dev server
npm run type-check
npm test         # vitest: on-chain ids, ts samples, page content, the network notice, package contents
```

The build scripts are bins of `@meddleware/vitepress-theme` (`mw-gen-onchain`, `mw-check-onchain-ids`, `mw-gen-llms-full`,
`mw-check-dist-no-audit`), configured by the `"meddleware"` section of `package.json` (site id `dev`, `outBase` `sui/onchain`, the other site
`docs`, the required ids, the allowed non-deployment ids). There are no local copies of them.

- **On-chain docs are imported, never authored here.** For the Sui Move packages (`access-gate-sui`, `sealed-storage-sui`,
  `token-issuance-template-sui`) the canonical on-chain docs live in each package repo (`docs/onchain/*.md` + `manifest.json`) and ship in its
  npm package. `mw-gen-onchain` copies the pages the manifest assigns to this site into a git-ignored subtree (`docs/sui/onchain/`) and
  generates the sidebar (`docs/.vitepress/generated/`). Resolution is `node_modules` by default, or `ONCHAIN_DOCS_ROOT=..` for sibling
  checkouts. Fix on-chain content in the Move repo, not here; hand-written pages link to the imported ones instead of duplicating Move tables.

### Checks (CI = `node-ci.yml`; both release workflows call it, so a tag cannot skip one)

- `mw-audit-gate`, `check:network` and `mw-sync --check`, `type-check`, `npm test`, the linter (`lint:js`: the site is Markdown plus its
  scripts and e2e specs), `build`, `check:csp` (`mw-check-csp-inline` against the CSP in the `Dockerfile`), `check:licenses`, Lighthouse CI and
  the five-browser Playwright run.
- **On-chain ids are checked, not generated.** `docs/sui/index.md` carries the testnet ids of `access_gate` / `sealed_storage`
  (original id, published-at, shared object). `mw-check-onchain-ids` (part of `build`) fails when any 32-byte id in a hand-written page
  is neither a deployment id of `@meddleware/access-gate-client` / `@meddleware/sealed-storage-client` nor listed with a reason under
  `meddleware.onchainIds.otherIds`, or when the overview lacks a required id. The otherIds are the Seal key servers of
  `docs/sui/sealed-storage/index.md` (testnet committee, and the mainnet servers labelled "not yet used"); `tests/seal-committee.test.mjs`
  keeps that page and the list equal. After a republication: bump the clients, edit the page to the new ids.
- **Network truth comes from data.** `docs/.vitepress/network.json` is written by `npm run gen:network` (`mw-network-status`, from the
  installed clients' deployment records) and checked in CI (`npm run check:network`). The `NetworkNotice` component is the only place the
  site says which networks the platform is live on (home, getting started, the Sui overview); no page claims mainnet is live in prose
  (`tests/content.test.mjs`). The mainnet Seal committee on the Sealed Storage page is labelled "not yet used".
- **Samples are type-checked.** `tests/samples.test.mjs` compiles every fenced `ts` block under `docs/` against the installed `@meddleware/*` /
  `@mysten/*` packages. Names the prose assumes (`exec`, `gate`, `client`, `config`, …) are declared in `tests/samples-context.d.ts`; a block
  that cannot be checked needs a `<!-- sample: skip — reason -->` line before the fence (keep these few), and a config-file excerpt uses a
  `js` fence. Add a new package to `devDependencies` before a sample imports it.
- **Pages are checked.** Every hand-written page has `title` and `description` front matter (quote the values: a colon breaks YAML), is in the
  sidebar, and avoids unpublished-work wording; "operator" is for whoever runs infrastructure (a relay, a gateway, a key server), never for a
  gate owner. VitePress's dead-link check fails the build on a broken internal link (fragments are not checked: verify them).
- **Packaging.** `docs/audit/` (the internal review), the generated `docs/sui/onchain/` and `docs/.vitepress/generated/` never ship in the
  npm package (`files` negations; pinned by `tests/package-contents.test.mjs`) and the audit never reaches `dist/` (`srcExclude`,
  `mw-check-dist-no-audit`).
- **Shared files.** `.dockerignore`, `postcss.config.js`, `stylelint.config.js`, `.github/dependabot.yml`, the Lighthouse allowlist and the
  Dockerfile's `ARG CSP` (the `docs` profile) are kept equal to `@meddleware/frontend-config`'s templates by `npx mw-sync --check` / `--write`.

## Drafts (unpublished TODO material)

`drafts/` (repo root, outside the VitePress `srcDir`) holds material for future pages that is not yet true of anything published: currently
the retired DAO page and mwSUI vault notes. Each file opens with a status comment listing what must be verified before it moves into
`docs/`. Never link to drafts from `docs/`. White-label operator guides are not published and not annotated in the pages.

## Accuracy rule

Every snippet must match the published SDKs (`@mysten/sui` v2 + gRPC: `SuiGrpcClient`, Core API — no `SuiClient`/`getFullnodeUrl`, no
JSON-RPC) and the real `@meddleware/*` exports. Move facts come from the imported on-chain docs; link to them instead of restating tables.
Facts about a service or a library (routes, variables, defaults, versions) are read from that repository's code or README, not remembered:
the gateway has three implementations, the indexer's caching is in its handler, the toolchain versions are the ones CI installs.

## Content boundary (docs vs dev)

| Content type | Site |
| --- | --- |
| User guides, UI walkthroughs, FAQ | `repos/docs-site/` → `docs.meddleware.co.uk` |
| SDK install, integration code, self-host, libraries, wire formats, JSON shapes | `repos/dev-site/` → `meddleware.dev` |
| TypeDoc API reference | `repos/docs-site/` → `docs.meddleware.co.uk/blockchain/sui/` |

Cross-links: the nav has "API reference" and "User docs" pointing to `docs.`; the `docs.` reference pages end with a "For developers" link to
the pages here. Keep these URLs stable (other repositories link to them): `/sui/`, `/sui/<tool>/`, `/sui/walrus-storage/integration`,
`/sui/walrus-storage/relay-self-host`, `/sui/sealed-storage/integration`, `/sui/sealed-storage/policies`, `/sui/access-gate/integration`,
`/sui/access-gate/gateway`, `/sui/onchain/**`. `AppToolShell` links `https://meddleware.dev/sui/<slug>/` for each tool.

## Sister site

`repos/docs-site/` (`docs.meddleware.co.uk`) is the sister site. k8s manifests live at `post-bootstrap/dev-site/` in the infrastructure workspace.
Image: `quay.io/meddleware-org/dev-site`.

## Design-system pages

`docs/design-system/*.md` are hand-written, tied to the installed packages by `tests/design-system-docs.test.mjs`: a page may name only custom
properties that exist in `@meddleware/design-tokens` and `Ui…`/`App…` components that `@meddleware/ui` exports. When a package release adds
or renames one, update the page in the same change. `brand.md` also names the files `@meddleware/ui` publishes under `brand/` and
`components.md` every `AppToolShell` prop; the same test checks both against the installed package.
