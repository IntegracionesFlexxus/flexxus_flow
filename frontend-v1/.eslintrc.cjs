// ESLint configuración - MVP Nivel 1
// TODO: En Nivel 2 agregar más reglas estrictas y plugins adicionales

module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier' // Debe ser el último para sobrescribir otras configs
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'build'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react-refresh', '@typescript-eslint', 'react'],
  rules: {
    // React refresh
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'warn', // Warn en lugar de error para MVP
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // React
    'react/prop-types': 'off', // No necesario con TypeScript
    'react/react-in-jsx-scope': 'off', // No necesario en React 17+
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'no-unused-expressions': 'warn',
    
    // Código limpio básico
    'max-len': ['warn', { 
      code: 120, 
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true 
    }],
    'complexity': ['warn', 10], // Complejidad ciclomática máxima
    'max-depth': ['warn', 4], // Profundidad máxima de anidamiento
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}