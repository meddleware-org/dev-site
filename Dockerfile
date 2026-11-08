# ── build stage ───────────────────────────────────────────────────────────────
# Static VitePress developer documentation site. The Docker context is this repo root.
# No VITE_* build args: the site is static content with no per-network configuration.
# No TypeDoc/gen-api step: API reference lives in the docs. site; this site links in.
# Content-Security-Policy served by static-server (verified 2026-09-30: production build loaded in
# Chromium under this policy with zero violations). script-src stays 'self' plus the sha256 hashes of VitePress's two inline bootstrap scripts (checked at build time by mw-check-csp-inline); connect-src is 'self' only: this
# static site's local search and footer load same-origin files and nothing connects elsewhere (headless
# Chromium probe, 2026-10-22: search returns results and the footer renders with zero violations; the site
# has no RPC, relay, aggregator or key-server client); img-src allows https:/data:/blob: for images and local previews.
ARG CSP="default-src 'self'; script-src 'self' 'sha256-2xX7WPApihAEgY57fPwQ4HRaWtCTrsAryoGVYhwtsA0=' 'sha256-ng8W1FnGVqbzCCV1hV2EGXSMN/WlYnkoQZy8x1kkcsM='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

FROM node:26-slim@sha256:0d1e33586362bb9e608c4e751e7a9e7edb55c9ac11461ed5666af696cc461dd4 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# vitepress build → dist/ (outDir is pinned to the repo root dist/ in docs/.vitepress/config.ts)
RUN npm run build && npm run licenses
ARG CSP
# Every inline <script> VitePress emits must be allowed by the CSP hash list above.
RUN npx mw-check-csp-inline "${CSP}" dist

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM quay.io/meddleware-org/static-server:0.1.12@sha256:f2cdfac6c795ee8a442e144e9c2d9eabbbe6566c41fdc696fe3befe2aa8d052d
ARG CSP
ENV CONTENT_SECURITY_POLICY="${CSP}"

COPY --from=build /app/dist /app/public
# The lockfile lets SBOM scanners see the npm packages the bundle was built from (the bundle itself carries no
# package metadata). It sits outside the served directory; THIRD_PARTY_LICENSES is served with the site.
COPY --from=build /app/package-lock.json /usr/share/doc/dev/package-lock.json

# A generated multi-page site: each clean URL is served from its own .html file and an unknown path
# gets VitePress's 404 page with a real 404 status (no SPA fallback, which would answer 200 with
# the home page).
ENV SERVE_DIR=/app/public \
    CLEAN_URLS=true \
    NOT_FOUND_PAGE=/404.html \
    CACHE_IMMUTABLE_PREFIX=/assets/

# The base image already runs as nobody; say so here too so the Dockerfile is self-describing.
USER 65534:65534

EXPOSE 8080
