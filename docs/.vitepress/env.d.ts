// Type declarations for the VitePress client and for `.css` imports. Related: tsconfig.json includes this file.
/// <reference types="vitepress/client" />

// Lets TypeScript import stylesheets.
declare module '*.css' {
  // A stylesheet's content as text.
  const content: string
  export default content
}
