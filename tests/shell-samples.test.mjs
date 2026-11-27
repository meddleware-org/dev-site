// The shell samples in the guides name commands of our own packages; this keeps those names true. Offline: every `mw-*` command in a
// ```bash sample must be a bin of the installed @meddleware/frontend-config. (The TypeScript samples are type-checked in samples.test.mjs;
// the other commands are third-party tools, whose names the guides do not own. 2026-11-20 sweep: every `npm run` script, repository,
// package and image the guides name was checked to exist; see the workspace's copy review notes.)
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const docsRoot = join(root, 'docs')
const bins = Object.keys(JSON.parse(readFileSync(join(root, 'node_modules/@meddleware/frontend-config/package.json'), 'utf8')).bin ?? {})

/** Every guide page as `[path, text]`. */
function* markdownFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    const rel = relative(docsRoot, p).split(sep).join('/')
    if (entry.isDirectory()) {
      if (['node_modules', '.vitepress', 'audit'].includes(entry.name) || rel === 'sui/onchain') continue
      yield* markdownFiles(p)
    } else if (entry.name.endsWith('.md')) yield [rel, readFileSync(p, 'utf8')]
  }
}

describe('shell samples', () => {
  it('name only real mw-* commands', () => {
    const named = new Set()
    for (const [, text] of markdownFiles(docsRoot)) {
      for (const block of text.matchAll(/```bash\n([\s\S]*?)```/g)) {
        for (const m of block[1].matchAll(/(?:^|\s|npx\s+)(mw-[a-z-]+)/gm)) named.add(m[1])
      }
    }
    expect(named.size).toBeGreaterThan(0)
    for (const cmd of named) expect(bins, `${cmd} is not a bin of @meddleware/frontend-config`).toContain(cmd)
  })
})
