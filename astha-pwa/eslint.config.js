import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'data/**',
      'docs/**',
      'wireframe.html',
      'public/sw.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2023,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'chart.js', message: 'ADR-003 forbids Chart.js; use locally bundled uPlot.' },
            { name: 'recharts', message: 'ADR-003 forbids Recharts; use locally bundled uPlot.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'RNF-SEC-01 forbids storing data in localStorage; use encrypted IndexedDB.' },
        { name: 'sessionStorage', message: 'RNF-SEC-01 forbids storing session secrets in sessionStorage.' },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': 'warn',
      'prefer-const': 'warn',
      'svelte/require-each-key': 'warn',
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/workers/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.worker,
        ...globals.es2023,
      },
    },
  },
  // ADR-005 Strict Clinical Engine Boundary: Pure deterministic TypeScript only.
  {
    files: ['src/engine/**/*.ts', 'src/workers/clinical.worker.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'ADR-005 forbids network fetch inside Clinical Engine.' },
        { name: 'WebSocket', message: 'ADR-005 forbids WebSocket inside Clinical Engine.' },
        { name: 'XMLHttpRequest', message: 'ADR-005 forbids XHR inside Clinical Engine.' },
        { name: 'EventSource', message: 'ADR-005 forbids EventSource inside Clinical Engine.' },
        { name: 'window', message: 'ADR-005 forbids DOM/window access inside Clinical Engine.' },
        { name: 'document', message: 'ADR-005 forbids DOM/document access inside Clinical Engine.' },
        { name: 'localStorage', message: 'ADR-005/RNF-SEC forbid localStorage inside Clinical Engine.' },
        { name: 'sessionStorage', message: 'ADR-005 forbids sessionStorage inside Clinical Engine.' },
        { name: 'indexedDB', message: 'ADR-005 confines persistence to Data & Sync Worker.' },
        { name: 'setInterval', message: 'ADR-005/RNF-POW-01 forbid polling timers inside Clinical Engine.' },
        { name: 'setTimeout', message: 'ADR-005 forbids timers inside Clinical Engine.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'fetch', message: 'ADR-005 forbids fetch.' },
        { object: 'globalThis', property: 'WebSocket', message: 'ADR-005 forbids WebSocket.' },
        { object: 'globalThis', property: 'setInterval', message: 'ADR-005 forbids polling timers.' },
        { object: 'globalThis', property: 'setTimeout', message: 'ADR-005 forbids timers.' },
        { object: 'self', property: 'fetch', message: 'ADR-005 forbids fetch.' },
        { object: 'self', property: 'WebSocket', message: 'ADR-005 forbids WebSocket.' },
        { object: 'self', property: 'setInterval', message: 'ADR-005 forbids polling timers.' },
        { object: 'self', property: 'setTimeout', message: 'ADR-005 forbids timers.' },
      ],
    },
  },
);
