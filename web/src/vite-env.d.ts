/// <reference types="vite/client" />

// Déclare les imports de modules CSS/SCSS pour TypeScript
// Sans ça, TS ne sait pas que "import styles from './Foo.module.scss'" est valide
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.module.scss' {
  const classes: Record<string, string>
  export default classes
}

// Side-effect imports (globals.css, globals.scss)
declare module '*.css'  {}
declare module '*.scss' {}
