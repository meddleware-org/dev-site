// Ambient context for the guides' sample blocks (tests/samples.test.mjs): the names the prose says
// the reader already has ("examples use `gate`, `exec`, `client`, …"). A sample may declare its own
// name, which then shadows the one here. This is a script file (no top-level import/export), so the
// declarations are global; types come from the real packages through `import()` types.

declare module '*?url' {
  const url: string
  export default url
}
declare module '*.css'
declare module '*.vue' {
  const component: import('vue').DefineComponent
  export default component
}

interface ImportMeta {
  readonly env: Record<string, string | undefined>
}

// ── plain values ─────────────────────────────────────────────────────────────────────────────
declare const address: string
declare const friendAddress: string
declare const owner: string
declare const recipientAddr: string
declare const passId: string
declare const blobObjectId: string
declare const blobId: string
declare const gateId: string
declare const GATE_ID: string
declare const GATEWAY: string
declare const priceMist: bigint
declare const txDigest: string
declare const objectId: string
declare const bytes: Uint8Array
declare const plaintextBytes: Uint8Array
declare const nonceBytes: Uint8Array
declare const untrustedJson: unknown
declare const soulbound: boolean
declare const usesRemaining: bigint | null
declare const wasmUrl: string
declare const originalId: string
declare const publishedAt: string
declare const platformConfigId: string
declare const policyConfigId: string
declare const sealId: string
declare const PACKAGE_ID: string
declare const ACCESS_GATE_PACKAGE: string
declare const PLATFORM_CONFIG_ID: string
declare const MODULE: string
declare const FUNCTION: string
declare const values: never[]

// ── objects the guides introduce ──────────────────────────────────────────────────────────────
declare const keypair: import('@mysten/sui/cryptography').Signer
declare const client: import('@mysten/sui/grpc').SuiGrpcClient
declare const suiClient: import('@mysten/sui/grpc').SuiGrpcClient
declare const tx: import('@mysten/sui/transactions').Transaction
declare const gate: import('@meddleware/access-gate-client').AccessGateConfig
declare const gateConfig: import('@meddleware/access-gate-client').AccessGateConfig
declare const walrus: ReturnType<typeof import('@meddleware/walrus-storage-client').createWalrusClient>
declare const seal: import('@meddleware/sealed-storage-client/controller').SealController
// The wallet signer the guides hand to `sign` / `signPersonalMessage`.
declare const wallet: { signPersonalMessage(input: { message: Uint8Array }): Promise<{ signature: string }> }
// `exec`: the executor `buildExecutor()` of @meddleware/wallet-adapter returns.
declare const exec: Awaited<ReturnType<ReturnType<typeof import('@meddleware/wallet-adapter').useWallet>['buildExecutor']>>
// A gate this address administers (an element of `fetchOwnedGates`).
declare const g: Awaited<ReturnType<typeof import('@meddleware/access-gate-client').fetchOwnedGates>>[number]
// The Seal identity returned by the encrypt step.
declare const id: string
// The registry created in the Sealed Storage SDK setup.
declare const registry: import('@meddleware/sealed-storage-client').PolicyRegistry
// Token Issuance: the config and the deploy executor the guides introduce.
declare const config: import('@meddleware/token-issuance-client').TokenConfig
declare const executor: import('@meddleware/token-issuance-client/deploy').Executor
