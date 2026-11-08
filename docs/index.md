---
layout: home
title: "Meddleware developer documentation"
description: "SDKs, Move packages, services and design system for building on the Meddleware platform on Sui and Walrus."

hero:
  name: "Meddleware Dev"
  text: "Build on the platform"
  tagline: SDKs, Move packages, services, shared libraries and the design system, for developers who integrate, self-host or contribute.
  actions:
    - theme: brand
      text: Getting started
      link: /getting-started/
    - theme: alt
      text: Sui development
      link: /sui/
    - theme: alt
      text: User docs
      link: https://docs.meddleware.co.uk

features:
  - title: Walrus Storage
    details: Upload, read and extend blobs with @meddleware/walrus-storage-client, through the access-gated upload relay or your own. Run a relay.
    link: /sui/walrus-storage/
    linkText: Walrus Storage
  - title: Sealed Storage
    details: Encrypt to on-chain Seal policies with @meddleware/sealed-storage-client, store the ciphertext on Walrus, and write your own policy in Move.
    link: /sui/sealed-storage/
    linkText: Sealed Storage
  - title: Access Gate
    details: Create and sell NFT access passes, prove ownership to a gateway, and run the gateway that guards your own service.
    link: /sui/access-gate/
    linkText: Access Gate
  - title: Token Issuance
    details: Deploy a Sui coin from a patched Move template with @meddleware/token-issuance-client; the publish and finalize transactions, and what comes back.
    link: /sui/token-issuance/
    linkText: Token Issuance
  - title: Treasury and read indexer
    details: The on-chain objects and events the Treasury console reads, and the read-only HTTP API that serves event history.
    link: /sui/treasury/
    linkText: Treasury
  - title: Shared libraries
    details: wallet-adapter, web-utils, frontend-config, walrus-storage-kit and the VitePress theme that every Meddleware app is built from.
    link: /libraries/
    linkText: Libraries
  - title: Design system
    details: Design tokens, the Vue 3 component library and the application shell, with seasonal theming and WCAG AAA contrast.
    link: /design-system/
    linkText: Design system
  - title: Contract layout
    details: The Move packages, their testnet ids and the on-chain reference imported from each package.
    link: /sui/#contract-layout
    linkText: Contract layout
---

<NetworkNotice />
