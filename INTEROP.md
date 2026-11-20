# Open standards and interoperability: dev-site

meddleware.dev: developer documentation, the standards list and the API references.

Served at `meddleware.dev`.

This page lists what the project speaks today, what is planned, what was considered and does not apply, where someone else can extend it, and what proves each claim. The platform-wide list is [Standards we use](https://meddleware.dev/platform/standards). A row appears there in the same change that turns a standard on.

## Spoken today

- Content Security Policy (W3C), sent as a header
- HTTP Strict Transport Security (RFC 6797)
- Web App Manifest (W3C)
- Robots Exclusion Protocol (RFC 9309) at /robots.txt
- llms.txt (a community convention, not a formal standard)
- WCAG 2.2 level AA with AAA contrast (W3C), tested on every change
- No cookie and no browser storage before an action, tested on every change
- RFC 3339 timestamps
- The public standards list (docs/platform/standards.md), kept true by the audit templates (B.RFC-1)
- Type-checked code samples (tests/samples.test.mjs) and a check that the shell samples name only real mw-* commands

## Planned

- /.well-known/security.txt (RFC 9116), which none of the public hosts serves yet except meddleware.link
- A sitemap (sitemaps.org protocol) and Open Graph link-preview tags (none are on the landing page, docs or dashboard today)
- One source for robots.txt and llms.txt (each repository carries its own copy today: 13 copies)
- An OpenAPI index and the per-service API descriptions linked from one page

## Considered, not applicable

- Sign-in with a platform account: wallet tools have no accounts; if a tool ever needs one, the browser uses a session held by a backend, with a __Host- cookie, and never holds tokens in script

## Extension points

- Markdown pages; generated API reference (TypeDoc) and on-chain pages (gen:onchain)

## What proves it

- tests/ (samples, shell samples, content, dist, standards)
- e2e/a11y.spec.ts

_Maintained centrally with the platform's interoperability map; changes go through it so every repository says the same thing._
