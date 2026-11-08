import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const docs = join(import.meta.dirname, '..', 'docs')

// Every hand-written page: not the audit notes, not the generated on-chain tree, not VitePress's own files.
function pages(dir = docs, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.vitepress', 'audit', 'api', 'wire-api', 'onchain', 'public'].includes(e.name)) continue
      pages(p, out)
    } else if (e.name.endsWith('.md')) out.push(p)
  }
  return out
}
const all = pages().map((p) => ({ rel: relative(docs, p).split(sep).join('/'), text: readFileSync(p, 'utf8') }))
const prose = (text) => text.replace(/```[\s\S]*?```/g, '')

describe('the hand-written pages', () => {
  it('finds the pages', () => {
    expect(all.length).toBeGreaterThan(30)
  })

  it.each(all.map((p) => [p.rel, p]))('%s has a title and a description in its front matter', (_rel, page) => {
    const front = /^---\n([\s\S]*?)\n---/.exec(page.text)?.[1] ?? ''
    expect(front).toMatch(/^title: \S/m)
    expect(front).toMatch(/^description: \S/m)
  })

  it('never claims in prose that mainnet is live (the notice component says it, from the deployment records)', () => {
    const claim = /mainnet[^.\n]{0,40}\b(is|are) (now )?(live|open|available)|live on (sui )?mainnet|(runs?|running) on mainnet/i
    const hits = all.filter((p) => claim.test(p.text.replace(/<NetworkNotice \/>/g, ''))).map((p) => p.rel)
    expect(hits).toEqual([])
  })

  it('uses the notice only on the home page, getting started and the Sui overview', () => {
    const using = all.filter((p) => p.text.includes('<NetworkNotice')).map((p) => p.rel).sort()
    expect(using).toEqual(['getting-started/index.md', 'index.md', 'sui/index.md'])
  })

  it('keeps unpublished-work wording and the wrong spelling off the pages', () => {
    const banned = [/white-?label|TODO|guidance still to come|coming soon|more blockchains/i, /MeddleWare/]
    const hits = all.flatMap((p) => banned.flatMap((re) => (re.test(prose(p.text)) ? [`${p.rel}: ${re.exec(prose(p.text))?.[0]}`] : [])))
    expect(hits).toEqual([])
  })

  it('says "gate owner", not "operator", for whoever owns a gate (operator is for whoever runs infrastructure)', () => {
    const owner = /gate[’']?s? operators?|operators? of (a|the) gate|operator[’']s (gate|pass|wallet|price)|operator (who|that) (created|owns|sells|sold)/i
    const hits = all.filter((p) => owner.test(prose(p.text))).map((p) => p.rel)
    expect(hits).toEqual([])
  })

  it('has no page for other blockchains', () => {
    expect(all.map((p) => p.rel)).not.toContain('blockchain/index.md')
  })
})

describe('the navigation and the sidebar', () => {
  it('links every hand-written page', async () => {
    const config = (await import('../docs/.vitepress/config.ts')).default
    const sidebar = JSON.stringify(config.themeConfig?.sidebar ?? {})
    const missing = all
      .filter((p) => p.rel !== 'index.md')
      .map((p) => '/' + p.rel.replace(/\.md$/, '').replace(/index$/, ''))
      .filter((link) => !sidebar.includes(`"${link}"`))
    expect(missing).toEqual([])
  })

  it('has no placeholder entry', async () => {
    const config = (await import('../docs/.vitepress/config.ts')).default
    const text = JSON.stringify(config.themeConfig ?? {})
    expect(text).not.toMatch(/"link":"\/blockchain\/|Coming soon|operator/i)
  })

  it('links only to pages that exist', async () => {
    const config = (await import('../docs/.vitepress/config.ts')).default
    const links = [...JSON.stringify(config.themeConfig ?? {}).matchAll(/"link":"(\/[^"#]*)"/g)].map((m) => m[1])
    const exists = new Set(all.map((p) => '/' + p.rel.replace(/\.md$/, '').replace(/index$/, '')))
    exists.add('/')
    // The generated on-chain pages are checked by the build's dead-link check, not here.
    const missing = links.filter((l) => !l.startsWith('/sui/onchain/') && !exists.has(l))
    expect(missing).toEqual([])
  })
})
