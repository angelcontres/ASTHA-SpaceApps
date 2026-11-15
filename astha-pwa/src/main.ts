import { mount } from 'svelte';
import App from './App.svelte';
import './ui/styles/tokens.css';

const app = mount(App, { target: document.getElementById('app')! });

// PWA offline (RNF-NET-01): Service Worker cache-only, solo en producción (en desarrollo rompería el HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* sin SW la app sigue funcionando; solo pierde el arranque sin red */
    });
  });
}

export default app;
