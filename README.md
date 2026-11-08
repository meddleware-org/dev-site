# @meddleware/dev-site

Developer documentation for the Meddleware platform at [`meddleware.dev`](https://meddleware.dev) (the machine zone's apex; `dev.meddleware.co.uk`
redirects to it), for developers who integrate the SDKs, self-host a relay, gateway or indexer, or contribute: getting started and the real
toolchain versions, the Sui SDKs and Move packages, the services, the shared libraries (`wallet-adapter`, `web-utils`, `frontend-config`,
`walrus-storage-kit`, `vitepress-theme`) and the design system (`@meddleware/design-tokens`, `@meddleware/ui`). Built with
[VitePress](https://vitepress.dev) through the shared `@meddleware/vitepress-theme`. User-facing documentation and the generated SDK
reference live in `docs-site`.

- **Image:** `quay.io/meddleware-org/dev-site`, built on `quay.io/meddleware-org/static-server` (see `Dockerfile`; the CSP is a build argument checked by `npm run check:csp`).
- **Context for contributors and agents:** [CLAUDE.md](CLAUDE.md); the security review is `docs/audit/dev-site-audit.md`.
- **Licence:** BSD Zero Clause ([0BSD](LICENSE)).

## Develop

```bash
npm ci
npm run dev           # VitePress dev server (regenerates the on-chain pages first)
npm run build && npm run check:csp
npm run check:network   # docs/.vitepress/network.json equals the clients' deployment records (npm run gen:network rewrites it)
npx mw-sync --check     # the shared files equal @meddleware/frontend-config's templates
npm test              # unit tests
npm run test:e2e      # builds the site and runs the shared accessibility sweep (E2E_BROWSERS=all for five browsers)
npm run lint && npm run type-check
```
