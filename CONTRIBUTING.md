# Contributing to dev-site

Thank you for looking. dev-site is part of [Meddleware](https://meddleware.co.uk): open tools you can use, take everything when you leave,
and run yourself. This file says how to build it, test it and propose a change.

## Build and test

```bash
npm ci                    # a clean install from the lock file
npm run type-check      # types (vue-tsc)
npm run lint            # stylelint, eslint with the accessibility and browser-compatibility rules, and html-validate
npm test                # unit and component tests
npm run build           # type-check and the production build into dist/
npm run check:licenses  # the third-party licence notices are complete
npm run check:csp       # after a build: no inline script the Dockerfile CSP does not allow
npm run test:e2e        # browser tests of the built app (Chromium; E2E_BROWSERS=all for the five browsers)
npm run shots           # after a layout change: capture, then look at the pictures
```

The README ("Dev" and "Build") has the same commands with their context. CI runs them on every push and pull request
(`.github/workflows/node-ci.yml`), and the release workflow runs them again on the tagged commit. A change is ready when they all pass locally.
Files synced from `@meddleware/frontend-config` (dependabot, postcss, stylelint, the Dockerfile CSP and others) are changed in that package, not here;
`npx mw-sync --check` says whether they are current.

## Proposing a change

1. Open an issue first for anything larger than a fix, so the design can be agreed before the work.
2. Keep a change to one purpose. Write a short subject line in the imperative, and say why in the pull request.
3. Add or update tests with the behaviour they cover. A bug fix comes with a test that failed before it.
4. A change a visitor can see is checked on the screen: run `npm run shots` where it exists and look at the pictures.
5. Add a line to `CHANGELOG.md`.
6. Security problems go to the address in [`SECURITY.md`](SECURITY.md), never to a public issue.

## House rules

- **Licence.** Everything here is [0BSD](LICENSE). By contributing you agree your contribution is released under it.
- **Versions.** Until the platform's mainnet launch, every release is a patch bump, breaking changes included; the changelog says what broke.
- **Design tokens only.** Colours, spacing, radii and type sizes come from the design tokens; no hard-coded colour and no inline style.
- **Semantic HTML.** Native elements first, a label for every control, no ARIA where a native element says it; fix the markup rather than disabling a lint rule.
- **Nothing stored before an action.** A page sets no cookie and writes nothing to the browser's storage until the visitor asks for something that needs it; the storage test (`e2e/storage.spec.ts`) enforces it.
- **No echo.** A message, log line or error never repeats a configured or caller-supplied URL, token, key or password. Name the key or the position instead.
- **No secrets, no personal data** in code, tests, fixtures, comments or commit messages. Examples and tests use `.example` hosts and fixed test keys.
- **Open standards.** Where a standard exists and fits, use it; the standards inventory in the audit (`docs/audit/dev-site-audit.md`) and `INTEROP.md` list the ones this project speaks.
- **Samples are checked.** A fenced `ts` sample is type-checked against the installed packages by `tests/samples.test.mjs`, and a `bash` sample may name only real `mw-*` commands; a sample that cannot be checked is preceded by `<!-- sample: skip — reason -->`.
- **Generated trees are not edited.** `docs/sui/onchain/` is built by `npm run gen:onchain` from the Move packages; change the package it comes from.

## Documentation

Every file explains itself, line by line where the code is not self-evident:

- a header on every file saying what it is for;
- a doc comment on every declaration (TSDoc in TypeScript, a comment line above a shell function), private ones included, and on every prop and emit of a component;
- comments that say **why**, cite the decision, issue or standard behind a choice, and are updated with the code;
- no `TODO` or `FIXME` without an issue or follow-up reference on the same line;
- every command a document shows has been run, and every link resolves.
