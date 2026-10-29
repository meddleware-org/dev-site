# Security Policy

## Scope

This policy covers the `dev` documentation site (`meddleware.dev`): developer and operator
documentation built with VitePress, including the on-chain reference pages generated at build time
from the published Move packages (`scripts/gen-onchain.mjs`).

## Security model (invariants)

These invariants are load-bearing. A report demonstrating that any is violated is in scope:

1. **On-chain facts come from the packages.** The on-chain reference pages are generated from the
   published Move packages on every build. The package and object ids typed into the hand-written pages
   (the testnet table, Seal key servers) are checked on every build against the `deployments` of the
   published clients (`scripts/check-onchain-ids.mjs`): a stale id fails the build.
2. **No drafts or secrets published.** Parked pages live outside the published tree; no secret,
   internal host or unreleased security finding is published.
3. **Inline scripts are hash-pinned.** The image CSP allows only the hashed VitePress bootstrap
   scripts; the image build fails if a new inline script appears (`scripts/check-csp-inline.mjs`).
4. **Samples match the clients.** Every fenced TypeScript sample is type-checked against the installed
   `@meddleware/*` packages in CI (`tests/samples.test.mjs`), so a sample cannot keep an outdated call
   shape. The internal audit file never reaches the site (`scripts/check-dist-no-audit.mjs`) or the npm
   package.

## Content-Security-Policy

The container image serves a hash-based `script-src` (no `'unsafe-inline'`), `object-src
'none'`, `base-uri 'self'` and `frame-ancestors 'self'`; see the `Dockerfile`.

## Supported versions

Only the latest published image receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Report by emailing
**<security@meddleware.co.uk>** with a description, reproduction/PoC if available, and the image tag
or commit SHA tested. You will receive an acknowledgement within **3 business days** and a resolution
plan within **14 days** for confirmed issues; Critical issues (CVSS ≥ 9.0) are prioritised for
same-day acknowledgement.

## Disclosure

Once a fix is released, a security advisory will be published on the GitHub repository. Reporters may
be credited by name unless they prefer to remain anonymous.
