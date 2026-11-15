import { mount } from 'svelte';
import './styles/tokens.css';
import './styles/app.css';
import App from './ui/App.svelte';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}

const target = document.getElementById('app');
if (!target) {
  throw new Error('ASTHA mount target #app not found.');
}

const app = mount(App, { target });

export default app;
