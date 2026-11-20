---
title: Standards we use
description: The open standards Meddleware's tools and services speak today, what each is used for, and where.
---

# Standards we use

Where an open standard exists and fits, Meddleware uses it instead of a private format, so our tools work with other people's and
theirs work with ours. This page lists every standard in use today, what it is for, and which part of the platform uses it.

**How this list is kept true.** A change that introduces a standard adds its row here in the same change, and every project's security
audit keeps the detailed version (its standards inventory). A row is listed only when the code uses it; a standard that is built but not
switched on says so. IETF numbers were checked against the [RFC Editor](https://www.rfc-editor.org/) on 20 November 2026; none is
obsoleted.

**Status:** *in use* · *built, switched off* (the code exists and is tested, the feature is not enabled yet).

## The web and HTTP

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [Content Security Policy](https://www.w3.org/TR/CSP3/) (W3C) | every page says which origins it may load from and connect to | every app and site (`static-server`, the Link in Bio service) | in use |
| [HTTP Strict Transport Security](https://www.rfc-editor.org/rfc/rfc6797) (RFC 6797) | browsers only ever reach our sites over HTTPS | `static-server` | in use |
| [Web Linking](https://www.rfc-editor.org/rfc/rfc8288) (RFC 8288) | typed links between pages and documents | Link in Bio pages | in use |
| [Web App Manifest](https://www.w3.org/TR/appmanifest/) (W3C) | install and icon metadata for the apps and sites | the shared front-end tooling, Link in Bio | in use |
| [ACME](https://www.rfc-editor.org/rfc/rfc8555) (RFC 8555) | TLS certificates issued and renewed automatically (Let's Encrypt) | the platform's cluster | in use |

## Discovery, by people and by machines

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309) (RFC 9309) | each host's `robots.txt`, per its audience | every public host | in use |
| [security.txt](https://www.rfc-editor.org/rfc/rfc9116) (RFC 9116) | how to report a security problem | Link in Bio | in use |
| [WebFinger](https://www.rfc-editor.org/rfc/rfc7033) (RFC 7033) | finding a person's profile from their address | Link in Bio | in use |
| [schema.org](https://schema.org/) in [JSON-LD](https://www.w3.org/TR/json-ld11/) | machine-readable descriptions of pages and profiles | Link in Bio, the content hub, `static-server` | in use |
| [llms.txt](https://llmstxt.org/) (a community convention, not a formal standard) | a plain summary of each site for AI assistants | the docs, developer, landing and dashboard sites, the content hub | in use |

## Profiles, links and federation

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [Linkset](https://www.rfc-editor.org/rfc/rfc9264) (RFC 9264) | a person's page as a list of links any tool can read | Link in Bio | in use |
| [`rel="me"`](https://microformats.org/wiki/rel-me) and [h-card](https://microformats.org/wiki/h-card) (microformats) | verified identity links and a contact card in the page | Link in Bio | in use |
| [ActivityPub](https://www.w3.org/TR/activitypub/) and [Activity Streams 2.0](https://www.w3.org/TR/activitystreams-core/) (W3C) | a read-only profile that federated networks can follow | Link in Bio | in use |
| [AT Protocol handle resolution](https://atproto.com/specs/handle) | using a page's domain as a Bluesky handle | Link in Bio, the content hub | in use |
| [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) (Nostr) | using a page's domain as a Nostr identifier | Link in Bio | in use |

## Feeds and publishing

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [JSON Feed 1.1](https://www.jsonfeed.org/version/1.1/) | our own feed, readable by any feed reader | the content hub | in use |
| [RSS 2.0](https://www.rssboard.org/rss-specification) | the same feed for readers, bots and automation that read RSS | the content hub | in use |

## Sign-in, access and signatures

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [Web Authentication](https://www.w3.org/TR/webauthn-3/) (W3C, passkeys) | signing in without a password | Link in Bio | in use |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) (RFC 6749) | machine sign-in (client credentials) for the container registry | the registry's token service | in use |
| [JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) (RFC 7519) | signed access tokens between services | the registry, the content hub, Link in Bio | in use |
| [EdDSA / Ed25519](https://www.rfc-editor.org/rfc/rfc8032) (RFC 8032) | signed payment quotes and webhooks, and the access-gate protocol | Chain Payments, the access gate | in use |
| [Wallet Standard](https://github.com/wallet-standard/wallet-standard) | connecting any compatible wallet, not one vendor's | every tool that uses a wallet (`wallet-adapter`) | in use |

## Payments

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [Open Payments](https://openpayments.dev/) | paying from any Open Payments wallet | Link in Bio | built, switched off |
| [ISO 11649](https://www.iso.org/standard/50649.html) (RF creditor reference) | matching a bank transfer to what it pays for | Link in Bio | built, switched off |

## Data formats

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) timestamps | every date and time we exchange | across the platform | in use |
| [Base64url](https://www.rfc-editor.org/rfc/rfc4648) (RFC 4648) | encoding tokens and identifiers in URLs | the content hub, Link in Bio | in use |
| [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0) | describing our HTTP APIs | Link in Bio | in use |
| [Prometheus text exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/) | service metrics any monitoring system can read | the services | in use |

## Building, signing and licensing what we ship

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [OCI image format](https://github.com/opencontainers/image-spec) | container images any runtime and registry can use | every image | in use |
| [Sigstore](https://www.sigstore.dev/) (cosign) | images and packages signed in public, verified before they run | every image and package | in use |
| [SPDX](https://spdx.dev/) (SBOMs, licence identifiers) | a list of what is in each image; `0BSD` declared in every package | every image and package | in use |
| [SLSA provenance](https://slsa.dev/) | a signed record of how each image was built | every image | in use |

## Accessibility

| Standard | What we use it for | Where | Status |
| --- | --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C), level AA, with AAA contrast | every page is tested against it on every change | every app and site | in use |
