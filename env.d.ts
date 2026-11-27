// Type declarations: Vite's client types and a module shape for `.vue` imports (the theme's one component). Related: tsconfig.json.
/// <reference types="vite/client" />
// Lets TypeScript import single-file components as components.
declare module '*.vue' {
  // The component type.
  import type { DefineComponent } from 'vue'
  // Every `.vue` file's default export is a component.
  const component: DefineComponent<{}, {}, any>
  export default component
}
