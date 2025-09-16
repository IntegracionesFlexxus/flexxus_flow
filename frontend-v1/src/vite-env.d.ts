/// <reference types="vite/client" />

// Definición de tipos para variables de entorno
// TODO: En Nivel 2 agregar más variables según se necesiten
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENV: 'development' | 'production' | 'test'
  // Más variables de entorno se agregarán aquí
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}