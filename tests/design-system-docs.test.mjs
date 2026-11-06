// The design-system pages are hand-written, and a hand-written reference drifts (0.0.35 corrected slots, tokens and examples that no longer
// existed). This test ties them to the installed packages: every custom property a page names exists in the design-tokens CSS (or is one of the
// few that @meddleware/ui publishes at runtime), and every `Ui…` / `App…` component a page names is exported by @meddleware/ui.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')
const pagesDir = join(root, 'docs', 'design-system')
const pages = readdirSync(pagesDir).filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(join(pagesDir, f), 'utf8')])

const tokensDir = join(root, 'node_modules', '@meddleware', 'design-tokens', 'src')
const tokenCss = ['tokens.css', 'seasons.css'].map((f) => readFileSync(join(tokensDir, f), 'utf8')).join('\n')
const defined = new Set([...tokenCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
// Published at runtime by @meddleware/ui (see its useStickyOffset), not declared in the token CSS.
const runtime = new Set(['--mw-header-offset', '--mw-sticky-extra'])

const uiDir = join(root, 'node_modules', '@meddleware', 'ui', 'dist')
const uiTypes = readFileSync(join(uiDir, 'index.d.ts'), 'utf8')
const exported = new Set([...uiTypes.matchAll(/\b(?:default as |export \{[^}]*\b)([A-Z][A-Za-z0-9]+)/g)].map((m) => m[1]))
for (const m of uiTypes.matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)) exported.add(m[1])

describe('the design-system pages match the installed packages', () => {
  it.each(pages)('%s names only custom properties that exist', (_file, text) => {
    // Only a name written as a token (`--x` in code or a code span); a prefix such as `--space-*` or a pattern with `|` is not a name.
    const names = [...text.matchAll(/(--[a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?![a-z0-9-]*[*|<])/g)].map((m) => m[1])
    const unknown = [...new Set(names)].filter((n) => !defined.has(n) && !runtime.has(n))
    expect(unknown, `not in @meddleware/design-tokens: ${unknown.join(', ')}`).toEqual([])
  })

  it.each(pages)('%s names only components that @meddleware/ui exports', (_file, text) => {
    const names = [...text.matchAll(/`((?:Ui|App)[A-Z][A-Za-z0-9]*)`/g)].map((m) => m[1])
    const unknown = [...new Set(names)].filter((n) => !exported.has(n))
    expect(unknown, `not exported by @meddleware/ui: ${unknown.join(', ')}`).toEqual([])
  })
})
