---
layout: home
title: "Meddleware for developers"
description: "Build with Meddleware's open tools, plug into the standards they speak, and run your own copy."

hero:
  name: "Meddleware Dev"
  text: "Build with open tools"
  tagline: Packages, APIs and services for developers who integrate, self-host or contribute. Everything is open source (0BSD).
  actions:
    - theme: brand
      text: Getting started
      link: /getting-started/
    - theme: alt
      text: Standards we use
      link: /platform/standards
    - theme: alt
      text: User guides
      link: https://docs.meddleware.co.uk

features:
  - title: How it fits together
    details: The layers every tool is built from, whatever it does and whatever it runs on.
    link: /platform/
    linkText: The platform
  - title: Standards we use
    details: Every open format and protocol the platform speaks today, what it is for and where.
    link: /platform/standards
    linkText: Standards we use
  - title: Shared libraries
    details: wallet-adapter, web-utils, frontend-config, walrus-storage-kit and the VitePress theme that every Meddleware app is built from.
    link: /libraries/
    linkText: Libraries
  - title: Design system
    details: Design tokens, the Vue 3 component library and the application shell, with seasonal theming and WCAG AAA contrast.
    link: /design-system/
    linkText: Design system
---

<NetworkNotice />

## Available now

The first tools. Each runs on what its row says.

| Tool | What you build with | Runs on |
| --- | --- | --- |
| [Walrus Storage](/sui/walrus-storage/) | upload, read and extend files with `@meddleware/walrus-storage-client`, through the gated upload relay or your own; run a relay | Walrus and Sui |
| [Sealed Storage](/sui/sealed-storage/) | encrypt to on-chain policies with `@meddleware/sealed-storage-client`, and write your own policy | Sui |
| [Access Gate](/sui/access-gate/) | create and sell passes, prove ownership to a gateway, and run the gateway that guards your service | Sui |
| [Token Issuance](/sui/token-issuance/) | deploy a coin from a patched template with `@meddleware/token-issuance-client` | Sui |

Also: the [treasury and read indexer](/sui/treasury/) (the objects and events behind the treasury view, and the read API) and the
[contract layout](/sui/#contract-layout).
