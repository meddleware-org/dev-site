import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The Seal key-server ids are typed into the Sealed Storage page (a table and a sample). They are not package deployments, so
// `mw-check-onchain-ids` knows them only through `meddleware.onchainIds.otherIds` in package.json, each with its reason. These tests keep
// the page and that list equal, and the mainnet committee labelled for what it is.
const root = join(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const page = readFileSync(join(root, 'docs', 'sui', 'sealed-storage', 'index.md'), 'utf8')
const ID = /0x[0-9a-f]{64}/g
const listed = pkg.meddleware.onchainIds.otherIds.map((e) => e.id)
const onPage = [...new Set(page.match(ID) ?? [])]
// The deployment ids that also appear on the page are not key servers; the page shows none of the package ids of access_gate or sealed_storage.

const TESTNET = [
  '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98',
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
]
// ADR-0002 "Verification log" (2026-11-07): Overclock, NodeInfra and H2O Nodes, Open mode.
const MAINNET = [
  '0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6',
  '0x1afb3a57211ceff8f6781757821847e3ddae73f64e78ec8cd9349914ad985475',
  '0x4a65b4ff7ba8f4b538895ee35959f982a95f0db7e2a202ec989d261ea927286a',
]

describe('the Seal key-server ids of the Sealed Storage page', () => {
  it('are exactly the ids allowed by the id check, each with a reason', () => {
    expect(onPage.sort()).toEqual([...listed].sort())
    for (const e of pkg.meddleware.onchainIds.otherIds) expect(e.reason).toMatch(/\S/)
  })

  it('name the testnet committee in the table and the sample, and the three mainnet servers in their own table', () => {
    for (const id of TESTNET) expect(page.split(id).length - 1, id).toBeGreaterThanOrEqual(2) // table + sample
    for (const id of MAINNET) expect(page.split(id).length - 1, id).toBe(1)
    expect(listed.sort()).toEqual([...TESTNET, ...MAINNET].sort())
  })

  it('label the mainnet committee as not yet used', () => {
    expect(page).toMatch(/\*\*Mainnet, not yet used: no mainnet `sealed_storage` deployment\.\*\*/)
    // and the mainnet ids come after that label, never before it
    const label = page.indexOf('Mainnet, not yet used')
    for (const id of MAINNET) expect(page.indexOf(id)).toBeGreaterThan(label)
  })
})
