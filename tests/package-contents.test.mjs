import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findAuditPages } from '../scripts/check-dist-no-audit.mjs'

describe('findAuditPages', () => {
  it('finds audit pages and directories, and nothing else', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'))
    try {
      mkdirSync(join(dist, 'blockchain', 'sui'), { recursive: true })
      writeFileSync(join(dist, 'index.html'), '')
      writeFileSync(join(dist, 'blockchain', 'sui', 'auditing-tools.html'), '')
      expect(findAuditPages(dist)).toEqual([])
      mkdirSync(join(dist, 'audit'))
      writeFileSync(join(dist, 'audit', 'x.html'), '')
      writeFileSync(join(dist, 'docs-audit.html'), '')
      expect(findAuditPages(dist).sort()).toEqual(['audit', 'docs-audit.html'])
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })
})

describe('npm package contents', () => {
  it('carries the site source and scripts, not the audit tree or generated pages', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8', cwd: join(import.meta.dirname, '..') })
    // `npm pack --json` prints an array in CI's npm, and an object keyed by the package name in newer ones: read both.
    const parsed = JSON.parse(out)
    const info = Array.isArray(parsed) ? parsed[0] : (parsed.files ? parsed : Object.values(parsed)[0])
    const files = info.files.map((f) => f.path)
    expect(files.filter((f) => f.startsWith('docs/audit'))).toEqual([])
    // gen:onchain output (copies of the Move packages' pages) and the generated sidebar never ship.
    expect(files.filter((f) => f.startsWith('docs/sui/onchain') || f.startsWith('docs/.vitepress/generated'))).toEqual([])
    expect(files.filter((f) => f.startsWith('docs/.vitepress/cache') || f.startsWith('drafts/'))).toEqual([])
    expect(files).toContain('docs/index.md')
    expect(files).toContain('scripts/check-onchain-ids.mjs')
    expect(files).toContain('scripts/check-dist-no-audit.mjs')
  })
})
