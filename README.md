# @meddleware/dev-site

Developer documentation for the Meddleware tools at [`meddleware.dev`](https://meddleware.dev) (the machine zone's apex; `dev.meddleware.co.uk`
redirects to it): integration guides, the design system (`@meddleware/design-tokens`, `@meddleware/ui`), Sui development and per-service
notes. Built with [VitePress](https://vitepress.dev) through the shared `@meddleware/vitepress-theme`. User-facing documentation and the
generated SDK reference live in `docs-site`.

- **Image:** `quay.io/meddleware-org/dev-site`, built on `quay.io/meddleware-org/static-server` (see `Dockerfile`; the CSP is a build argument checked by `npm run check:csp`).
- **Context for contributors and agents:** [CLAUDE.md](CLAUDE.md); the security review is `docs/audit/dev-site-audit.md`.
- **Licence:** BSD Zero Clause ([0BSD](LICENSE)).

## Develop

```bash
npm ci
npm run dev           # VitePress dev server (regenerates the on-chain pages first)
npm run build && npm run check:csp
npm test              # unit tests
npm run test:e2e      # builds the site and runs the shared accessibility sweep (E2E_BROWSERS=all for five browsers)
npm run lint && npm run type-check
```
