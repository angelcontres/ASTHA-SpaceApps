import { mount } from 'svelte';
import App from './App.svelte';
import './ui/styles/tokens.css';

const app = mount(App, { target: document.getElementById('app')! });

// PWA offline (RNF-NET-01): Service Worker cache-only in production; in dev, clear any stale SW so HMR/workers load cleanly.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        /* app still operates without SW; only offline cold-boot cache is skipped */
      });
    });
  } else {
    void navigator.serviceWorker.getRegistrations().then(async (regs) => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      if (!regs.length && !hadController) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in globalThis) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('astha-')).map((k) => caches.delete(k)));
      }
      if (hadController && !location.search.includes('dev_sw_reset')) {
        const next = new URL(location.href);
        next.searchParams.set('dev_sw_reset', '1');
        location.replace(next.toString());
      }
    }).catch(() => {});
  }
}

export default app;
