# mwSUI vault — integration notes (draft)

<!--
DRAFT — not published. Status: TODO(FU-0208): incomplete.
Extracted 2026-09-28 from docs/sui/index.md ("Contract layout") and docs/sui/ptb-patterns.md
(vault examples) when those pages were rewritten to describe the packages that are actually
published. Everything below describes the mwSUI vault, whose Move packages are not published.
Before publishing: verify every package, module, function, object and abort code against the
published sources, and give each snippet a working gRPC client (@mysten/sui v2).
-->

## Contract layout (TODO(FU-0208): confirm against the published packages)

```text
contracts/
├── core/            — vault_core (accounting, share minting/burning)
├── adapters/        — vault_adapters (strategy integration)
├── governor/        — vault_governor (DaoAdminCap-gated ops)
├── fee_distributor/ — vault_fee_distributor
├── config/          — vault_config (DAO-governed parameters)
└── dao/             — vault_dao
```

## Multi-step PTB: deposit → shares (TODO(FU-0208): verify `vault_core::deposit` signature)

```ts
// 1. Split the exact SUI amount
const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)])

// 2. Deposit into the vault (returns mwSUI shares)
const [shares] = tx.moveCall({
  target: `${VAULT_PACKAGE}::vault_core::deposit`,
  arguments: [depositCoin, tx.object(VAULT_ID), tx.object(CONFIG_ID)],
})

// 3. Transfer the shares to the caller
tx.transferObjects([shares], tx.pure.address(callerAddress))
```

## Abort codes worth mapping (TODO(FU-0208): confirm module + value)

| Module | Code | Meaning |
| --- | --- | --- |
| `vault_core` | 85 | `E_STALE_STRATEGY_NAV` — refresh every active strategy's NAV in the same PTB |
| `vault_core` | 5 (?) | below the minimum deposit |

## Gas budgets (TODO(FU-0208): measure)

Multi-strategy PTBs (rebalance, allocation) scale with the number of strategy steps; simulate
(`client.simulateTransaction`) to size the budget rather than using a fixed multiplier.
