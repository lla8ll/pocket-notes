import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/patrick-hand/latin-400.css';
import App from './App';
import './styles/classic.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // A failed offline install never prevents normal use or local note saving.
    const scope = new URL(import.meta.env.BASE_URL, document.baseURI);
    navigator.serviceWorker.register(new URL('sw.js', scope), { scope: scope.pathname }).catch(() => {});
  }, { once: true });
}
