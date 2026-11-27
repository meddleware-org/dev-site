// Type-checks the fenced ```ts samples in the guides against the installed @meddleware/* and
// @mysten/* packages, so a sample can no longer fall behind a client signature (audit F7).
//
// Each block is compiled as its own module: its imports stay at the top level, the remaining
// statements are wrapped in an async function (so a block may use top-level `await` and may
// declare names that shadow the ambient context declared in tests/samples-context.d.ts, e.g.
// `exec`, `gate`, `address`). Line numbers are preserved, so a diagnostic points at the Markdown
// line. A block that is deliberately not checkable (pseudo-code, a type sketch) is preceded by
// `<!-- sample: skip — reason -->` and the reason is required.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const docsRoot = join(root, 'docs')
const SKIP = /^<!--\s*sample:\s*skip\s*[—-]\s*(\S.*?)\s*-->$/

/** Every guide page's path under docs/, skipping generated and audit trees. */
function* markdownFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    const rel = relative(docsRoot, p).split(sep).join('/')
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.vitepress' || entry.name === 'audit' || rel === 'sui/onchain') continue
      yield* markdownFiles(p)
    } else if (entry.name.endsWith('.md')) {
      yield [rel, p]
    }
  }
}

/** Every ```ts fence in `text`: { line (1-based line of the first code line), code, skip }. */
export function extractTsBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^```(ts|typescript)(\s|$)/.exec(lines[i])
    if (!m) continue
    let prev = i - 1
    while (prev >= 0 && lines[prev].trim() === '') prev--
    const skip = prev >= 0 ? SKIP.exec(lines[prev].trim())?.[1] : undefined
    let end = i + 1
    while (end < lines.length && !/^```\s*$/.test(lines[end])) end++
    blocks.push({ line: i + 2, code: lines.slice(i + 1, end).join('\n'), skip })
    i = end
  }
  return blocks
}

/** The block as a module: imports unchanged, the rest inside an async function, same line numbers. */
export function wrapSample(code) {
  const sf = ts.createSourceFile('sample.ts', code, ts.ScriptTarget.ES2022, true)
  let lastImportEnd = 0
  for (const st of sf.statements) if (ts.isImportDeclaration(st)) lastImportEnd = st.getEnd()
  return `${code.slice(0, lastImportEnd)}; async function __sample() {${code.slice(lastImportEnd)}\n}\nexport {}\n`
}

/** Compile every sample block as its own module against the installed packages and return the diagnostics, each pointing at its Markdown line. */
function checkSamples(samples) {
  const virtual = new Map(samples.map((s) => [s.path, s.source]))
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: ['node'],
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const { fileExists, readFile, getSourceFile } = host
  host.fileExists = (f) => virtual.has(f) || fileExists(f)
  host.readFile = (f) => virtual.get(f) ?? readFile(f)
  host.getSourceFile = (f, lang, ...rest) =>
    virtual.has(f) ? ts.createSourceFile(f, virtual.get(f), lang, true) : getSourceFile(f, lang, ...rest)
  const program = ts.createProgram([join(root, 'tests', 'samples-context.d.ts'), ...virtual.keys()], options, host)
  const problems = []
  for (const s of samples) {
    const sf = program.getSourceFile(s.path)
    for (const d of ts.getPreEmitDiagnostics(program, sf)) {
      const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0)
      problems.push(`${s.name}:${s.line + line}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
    }
  }
  const ctx = program.getSourceFile(join(root, 'tests', 'samples-context.d.ts'))
  for (const d of ts.getPreEmitDiagnostics(program, ctx)) {
    problems.push(`samples-context.d.ts: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
  }
  return problems
}

describe('extractTsBlocks', () => {
  // Finds ts fences, their first code line and a skip reason.
  it('finds ts fences, their first code line and a skip reason', () => {
    const md = ['# t', '', '```ts', 'const a = 1', '```', '', '<!-- sample: skip — a type sketch -->', '', '```ts', 'interface X {}', '```', '```bash', 'ls', '```'].join('\n')
    expect(extractTsBlocks(md)).toEqual([
      { line: 4, code: 'const a = 1', skip: undefined },
      { line: 10, code: 'interface X {}', skip: 'a type sketch' },
    ])
  })
})

describe('wrapSample', () => {
  // Keeps line numbers and allows top-level await after the imports.
  it('keeps line numbers and allows top-level await after the imports', () => {
    const code = "import { a } from 'x'\nimport { b } from 'y'\nconst r = await a(b)"
    const out = wrapSample(code)
    expect(out.split('\n')[2]).toBe('const r = await a(b)')
    expect(out).toContain("import { b } from 'y'; async function __sample() {")
  })
})

describe('the checker', () => {
  // Reports a wrong call, naming the Markdown line.
  it('reports a wrong call, naming the Markdown line', () => {
    const problems = checkSamples([
      { name: 'x.md', line: 10, path: join(root, '__sample_bad.ts'), source: wrapSample("import { buildAccessProof } from '@meddleware/access-gate-gateway-client'\nawait buildAccessProof({ address: 'a' })") },
    ])
    expect(problems.some((p) => p.startsWith('x.md:11:'))).toBe(true)
  })
})

describe('the guides\' ts samples compile against the installed packages', () => {
  const samples = []
  const skipped = []
  for (const [rel, file] of markdownFiles(docsRoot)) {
    for (const b of extractTsBlocks(readFileSync(file, 'utf8'))) {
      if (b.skip) skipped.push(`docs/${rel}:${b.line}`)
      else samples.push({ name: `docs/${rel}`, line: b.line, path: join(root, `__sample_${samples.length}.ts`), source: wrapSample(b.code) })
    }
  }

  // Finds the samples.
  it('finds the samples', () => {
    expect(samples.length).toBeGreaterThan(20)
  })

  // Type-checks every sample.
  it('type-checks every sample', () => {
    expect(checkSamples(samples)).toEqual([])
  })

  // Keeps the unchecked samples few.
  it('keeps the unchecked samples few', () => {
    expect(skipped.length).toBeLessThanOrEqual(6)
  })
})
