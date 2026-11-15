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
        ...globals.es2022,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'chart.js',
              message: 'ADR-003 forbids Chart.js; use locally bundled uPlot instead.',
            },
            {
              name: 'recharts',
              message: 'ADR-003 forbids Recharts; use locally bundled uPlot instead.',
            },
          ],
        },
      ],
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
        ...globals.es2022,
      },
    },
  },
  // ADR-005 Strict Isolation Boundary for Clinical Engine Worker:
  // Pure deterministic TypeScript — NO fetch, NO WebSocket, NO DOM, NO storage, NO timers.
  {
    files: ['src/workers/clinical-engine/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'ADR-005 forbids network fetch inside Clinical Engine Worker.' },
        { name: 'WebSocket', message: 'ADR-005 forbids WebSocket inside Clinical Engine Worker.' },
        { name: 'XMLHttpRequest', message: 'ADR-005 forbids XHR inside Clinical Engine Worker.' },
        { name: 'EventSource', message: 'ADR-005 forbids EventSource inside Clinical Engine Worker.' },
        { name: 'window', message: 'ADR-005 forbids DOM/window access inside Clinical Engine Worker.' },
        { name: 'document', message: 'ADR-005 forbids DOM/document access inside Clinical Engine Worker.' },
        { name: 'localStorage', message: 'ADR-005/RNF-SEC forbid localStorage inside Clinical Engine Worker.' },
        { name: 'sessionStorage', message: 'ADR-005 forbids sessionStorage inside Clinical Engine Worker.' },
        { name: 'indexedDB', message: 'ADR-005 confines persistence to Data & Sync Worker.' },
        { name: 'setInterval', message: 'ADR-005/RNF-POW-01 forbid polling timers inside Clinical Engine Worker.' },
        { name: 'setTimeout', message: 'ADR-005 forbids timers inside Clinical Engine Worker.' },
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
