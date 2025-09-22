// index.tsx
import React from 'react';
import { OmniRoutes } from './routes';

// Exportar componentes y tipos principales para uso externo
export * from './components';
export * from './hooks';
export * from './services';
export * from './store';
export * from './types';
export * from './utils';

// Exportar rutas
export { OmniRoutes } from './routes';

// Componente principal del módulo
export function OmniModule() {
  return <OmniRoutes />;
}

export default OmniModule;