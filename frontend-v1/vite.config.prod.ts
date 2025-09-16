import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

// Configuración de producción optimizada - MVP Nivel 1
// TODO: En Nivel 2 agregar PWA, CDN, advanced caching strategies

export default defineConfig({
  plugins: [
    react(),
    
    // Compresión gzip
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Solo comprimir archivos > 10KB
    }),
    
    // Compresión brotli
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
    
    // Visualizador de bundle (solo si ANALYZE=true)
    process.env.ANALYZE === 'true' && 
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __DEV__: false,
    __PROD__: true,
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
      '@assets': path.resolve(__dirname, './src/assets'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  
  build: {
    // Directorio de salida
    outDir: 'dist',
    
    // Assets directory
    assetsDir: 'assets',
    
    // Generar source maps para debugging (desactivar en producción real)
    sourcemap: false,
    
    // Minificación
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.log
        drop_debugger: true, // Eliminar debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false, // Eliminar comentarios
      },
    },
    
    // Target browsers
    target: 'es2020',
    
    // Tamaño de chunks
    chunkSizeWarningLimit: 1000, // 1MB
    
    // Rollup options
    rollupOptions: {
      output: {
        // Separación de chunks manual
        manualChunks: (id) => {
          // Separar node_modules
          if (id.includes('node_modules')) {
            // Core React
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Material UI
            if (id.includes('@mui')) {
              return 'mui-vendor';
            }
            // Utilidades grandes
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            // Otros vendors
            return 'vendor';
          }
          
          // Separar módulos de la aplicación
          if (id.includes('/src/modules/')) {
            const module = id.split('/src/modules/')[1].split('/')[0];
            return `module-${module}`;
          }
          
          // Componentes compartidos
          if (id.includes('/src/shared/')) {
            return 'shared';
          }
          
          // Servicios
          if (id.includes('/src/services/')) {
            return 'services';
          }
        },
        
        // Nombres de archivos optimizados
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.split('.')[0]
            : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        
        entryFileNames: 'assets/js/[name]-[hash].js',
        
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      
      // Configuración de tree-shaking
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
    },
    
    // CSS optimizations
    cssCodeSplit: true,
    cssMinify: true,
    
    // Reportar tamaño de bundle comprimido
    reportCompressedSize: true,
    
    // Limpiar directorio antes de build
    emptyOutDir: true,
  },
  
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'axios',
      'zustand',
      '@tanstack/react-query',
      'date-fns',
    ],
    exclude: [],
  },
  
  // Preview server (para probar build de producción)
  preview: {
    port: 4173,
    host: true,
  },
});