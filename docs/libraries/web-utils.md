---
title: "web-utils"
description: "Framework-free helpers shared by the Meddleware frontends and clients: exact amounts, dates and time zones, bounded fetch, stale-result guards, safe links, status snapshots and network availability."
---

# web-utils

[`@meddleware/web-utils`](https://www.npmjs.com/package/@meddleware/web-utils) holds the framework-free helpers the frontends and
client libraries share. No Vue, no DOM at import time, no side effects and no runtime dependencies; one entry with tree-shakeable named
exports (`"sideEffects": false`). `@meddleware/ui` re-exports the link and status helpers, so an app that already imports `ui` may take
them from there.

```bash
npm install @meddleware/web-utils
```

| Area | Exports |
| --- | --- |
| [Exact amounts](#exact-amounts) | `parseFixed`, `formatFixed` |
| [Coins](#coins-and-money) | `suiToMist`, `mistToSui`, `formatCoinAmount`, `formatCoinExact`, `MIST_PER_SUI`, `COIN_DECIMALS` |
| [Money](#coins-and-money) | `formatUsd`, `parseUsd` (micro-US-dollars) |
| [Time](#time-and-calendar) | `formatDateTime`, `formatDate`, `formatClock`, `formatWindow`, `toLocalInput`, `fromLocalInput`, `dayKey`, `offsetMinutes`, `isZone`, `browserZone` |
| [Calendar](#time-and-calendar) | `monthGrid`, `shiftMonth`, `monthNames`, `weekdayNames`, `MONTHS`, `WEEKDAYS` |
| [Async](#stale-results-and-bounded-fetching) | `createGeneration`, `createOperationScope`, `fetchJson`, `fetchWithTimeout`, `readBoundedText`, `readBoundedJson`, `HttpError`, `DEFAULT_MAX_JSON_BYTES` |
| Errors, text | `errorMessage`, `humanize`, `formatBytes`, `isObj`, `str` |
| Browser | `safeStorage`, `safeFileName`, `triggerDownload` |
| [Links](#links) | `safeHref`, `safePath`, `safeIcon`, `suiExplorerUrl`, `walruscanBlobUrl`, `truncateMiddle`, `DEFAULT_TRUNCATE_CHARS` |
| [Status](#status-snapshots) | `parseSnapshot`, `isStatusLevel`, `STATUS_LABEL`, `STATUS_HEADLINE` and the `Status*` types |
| [Network availability](#network-availability) | `networkAvailability` and the `NetworkAvailability`, `NetworkStatus`, `ChainNetwork` types |

## Exact amounts

A chain amount is a `bigint` count of base units. Going through `Number` loses precision above 2^53 and rounds ties by binary
representation, so the figure on screen can differ from the figure paid. These helpers work on the decimal digits: the same on every
machine, no float anywhere.

- `parseFixed(text, decimals)` parses a non-negative decimal (`"1.5"`, `".5"`, `"12"`) into base units, or `null` for anything else:
  empty, negative, exponent forms, or more fraction digits than `decimals` (silently rounding money is how it goes missing).
- `formatFixed(value, decimals, { minFraction?, maxFraction?, group? })` writes base units as a decimal string. Exact by default;
  `maxFraction` rounds half away from zero, `minFraction` pads, `group` groups thousands with a locale.

## Coins and money

SUI and WAL both have 9 decimals (`COIN_DECIMALS`; `MIST_PER_SUI` is `1_000_000_000n`).

```ts
import { formatCoinAmount, formatCoinExact, mistToSui, suiToMist } from '@meddleware/web-utils'

suiToMist('0.0000005')               // 500n (a number is written out as the decimal it stands for, never rounded)
mistToSui(500n)                      // "0.0000005"
formatCoinAmount(13_100_000n, 'WAL') // "0.0131 WAL"
formatCoinAmount(10_000n, 'SUI')     // "0.00001 SUI"  (a tiny amount is not shown as 0.0000)
formatCoinExact(10_000_001n, 'SUI')  // "0.010000001 SUI"  (what a person approves is what is paid)
```

`suiToMist` throws on anything that is not a non-negative amount with at most 9 decimals. `formatCoinAmount` shows four decimals for
ordinary amounts and every significant digit for a tiny one; `formatCoinExact` never rounds, for where a person approves a payment.
`formatUsd(15000)` is `$0.015` and `parseUsd("0.015")` is `15000` (spend is stored in micro-US-dollars, converted on the decimal string).

## Time and calendar

Everything is stored and exchanged in UTC; a UI shows and edits wall-clock time in the zone a person chose (default: the browser's).
`datetime-local` inputs carry a wall time with no zone, so `toLocalInput(iso, tz)` and `fromLocalInput(value, tz)` convert through
the chosen zone with `Intl` only (no library). A wall time that does not exist (the hour skipped at a spring-forward) moves forward by
the gap, and an ambiguous one (the repeated hour in autumn) takes the first occurrence. `formatDateTime`, `formatDate`, `formatClock`
and `formatWindow` take a zone string or `{ tz?, empty? }` (default `empty` is `—`); `dayKey(iso, tz)` is `YYYY-MM-DD`; `isZone`,
`browserZone` and `offsetMinutes` check and read zones. `monthGrid(year, month)` builds Monday-first weeks of `{ day, date, inMonth }`
cells; `monthNames` and `weekdayNames` come from `Intl`.

## Stale results and bounded fetching

```ts
import { createGeneration, fetchJson, HttpError } from '@meddleware/web-utils'

const generation = createGeneration()
async function load() {
  const current = generation.begin()
  const rows = await fetchJson('https://sui-indexer.meddleware.dev/v1/testnet/coverage', { timeoutMs: 5000 })
  if (!current()) return // a newer load started; drop this result
  return rows
}
```

- `createGeneration()`: each `begin()` supersedes the one before; `invalidate()` supersedes all. `createOperationScope()` is the variant
  where beginning an operation does not cancel others: only `invalidate()` (a network or account change) does, and every `await` of an
  operation is followed by an `isCurrent()` check.
- `fetchJson(url, { timeoutMs, fetcher, init, maxBytes })` asks for JSON without credentials or cache, bounds the headers and the body by
  a timeout (default 10 s) and a size cap (`DEFAULT_MAX_JSON_BYTES`, 1 MiB), throws `HttpError` (with `status`) for a non-2xx response,
  and names the URL for a timeout or invalid JSON. `fetchWithTimeout`, `readBoundedText` and `readBoundedJson` are the parts.
- `errorMessage(e)` extracts a readable message from anything thrown (wallet SDKs sometimes throw plain objects, nested `cause`s).

## Links

`safeHref(url)` returns a normalised `https:` URL (or `http:` on localhost and 127.0.0.1) and `undefined` for anything else, including
credentials in the authority, control characters, spaces, backslashes and other schemes. `safePath(path)` accepts only a single-slash
root-relative path that stays on the site. `safeIcon(icon)` accepts only a `data:image/(svg+xml|webp|png|gif);base64,` URI (what the
wallet standard defines for icons). `suiExplorerUrl(kind, id, network)` builds a SuiVision URL (`account`, `object`, `txblock`; `mainnet`,
`testnet`, `devnet`), `walruscanBlobUrl(network, blobId)` a Walruscan one, and each id is encoded into one path segment.

Bind a URL to an element only through `safeHref`, `safePath`, `safeIcon`, `suiExplorerUrl` or `walruscanBlobUrl`;
`@meddleware/eslint-config` fails the lint otherwise. `truncateMiddle(value, [12, 10])` shortens an id for scanning, but truncation is
not verification: address-poisoning attacks match the first and last characters, so where a person decides where funds go, show the
whole value.

## Status snapshots

`parseSnapshot(raw)` validates the JSON of `GET /api/status` (platform-probe) into `{ generated_at, overall, groups: [{ name, status,
components }] }` or `null`. A status is one of `operational`, `degraded`, `down` or `unknown` (an unknown value is coerced to
`unknown`, never to healthy), and angle brackets are stripped from names. `STATUS_LABEL` and `STATUS_HEADLINE` are the words for each
level.

## Network availability

`networkAvailability(products)` reports which networks the platform is deployed on, from the deployment records and nothing else. A
product's record lists the networks it is published on (the keys of its `*_DEPLOYMENTS` object), so adding a `mainnet` key to every
record is the one switch that turns mainnet on in the dashboard selector, the landing page and the documentation sites.

```ts
import { networkAvailability } from '@meddleware/web-utils'
import { ACCESS_GATE_DEPLOYMENTS } from '@meddleware/access-gate-client/deployments'
import { SEAL_POLICIES_DEPLOYMENTS } from '@meddleware/sealed-storage-client/deployments'

const net = networkAvailability({
  'access gate': Object.keys(ACCESS_GATE_DEPLOYMENTS),
  'sealed storage': Object.keys(SEAL_POLICIES_DEPLOYMENTS),
})
net.mainnet.status // 'live' | 'partial' | 'coming'; { status, live: string[], missing: string[] } per network
```

`live` means every product has a record on the network, `partial` some, `coming` none. `localnet` is a developer network with no
records and is not reported. The static sites use the build-time twin of this function, `mw-network-status` in
[frontend-config](./frontend-config#mw-network-status).
