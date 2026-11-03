import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Globally disable ArrowUp and ArrowDown increment/decrement on number inputs
document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (
      (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
      e.target instanceof HTMLInputElement &&
      e.target.type === 'number'
    ) {
      e.preventDefault();
    }
  },
  { capture: true }
);

// Prevent accidental wheel scrolling changes on focused number inputs
document.addEventListener(
  'wheel',
  () => {
    if (
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type === 'number'
    ) {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

// Service Worker handling:
// IMPORTANT: Disable and unregister Service Worker on localhost/dev to prevent
// offline caching from serving the app when the dev server is stopped.
if ('serviceWorker' in navigator) {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local');

  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  } else {
    // Production only (PWA / Live Web / Netlify)
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          try { reg.update(); } catch (e) {}
          console.log('RSB Industry ERP: Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('RSB Industry ERP: Service Worker registration failed:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

