import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Configuración optimizada para performance - MVP Nivel 1
// TODO: En Nivel 2 agregar PWA, compression, y más optimizaciones

export default defineConfig({
  plugins: [react()],
  define: {
    // Definir process.env para compatibilidad
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  
  // Optimizaciones de build
  build: {
    // Code splitting automático
    rollupOptions: {
      output: {
        // Separar vendors en chunks
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Chunk especial para React
            if (id.includes('react')) return 'react-vendor';
            // Chunk para Material-UI
            if (id.includes('@mui')) return 'mui-vendor';
            // Resto de vendors
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Tamaño límite para warnings
    chunkSizeWarningLimit: 1000,
    // Source maps solo en desarrollo
    sourcemap: process.env.NODE_ENV !== 'production',
    // Target para navegadores modernos
    target: 'es2020',
    // Minificación
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true
  },
  
  // Server config
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // TODO: Mover a .env en Nivel 2
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Pre-bundling de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      'axios',
      'zustand'
    ]
  },
  
  // CSS optimizations
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  }
})