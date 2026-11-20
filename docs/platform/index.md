---
title: How it fits together
description: The layers every Meddleware tool is built from, whatever it does and whatever it runs on.
---

# How it fits together

Every Meddleware tool is built from the same layers, whatever it does and whatever technology it runs on. Knowing them tells you where
to plug in, what to replace and what to run yourself.

## The layers

| Layer | What it is | Rule |
| --- | --- | --- |
| **Interface** | the app or site a person uses: Vue, served as static files | it never talks to a network or a service directly; it calls a client library |
| **Client library** | one typed package per domain (for example `@meddleware/access-gate-client`) | the only code that builds requests or transactions for that domain, so every app does it the same way |
| **Service** | a server where a tool needs one (an upload relay, an access gateway, a read index), in Rust or Go | each is one image you can run yourself, configured the same way as ours |
| **Contract or network** | where a tool uses a blockchain or a storage network: its contract package, or the network itself | open, readable by anyone, and never the only way to reach your data |
| **Shared building blocks** | design tokens, the component library, the wallet connection, the shared build and test tooling | one source each, used by every interface |

A technology sits behind its client library. Apps never build a transaction themselves (a shared lint rule enforces it), so supporting
another network or technology means a new client library, not a rewrite of the apps.

## Where to start

- [Standards we use](/platform/standards): the open formats and protocols you can integrate with.
- [Getting started](/getting-started/): the toolchain and the repositories.
- [Shared libraries](/libraries/) and the [design system](/design-system/).
