import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Global LocalStorage Quota Exceeded Protection
// Completely suppresses DOMException / QuotaExceededError so storage full never crashes the application
(() => {
  try {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      try {
        originalSetItem.call(this, key, value);
      } catch (err: any) {
        console.warn(`[StorageQuota] LocalStorage setItem notice for "${key}". Evicting dispensable caches...`, err);
        try {
          const dispensableKeys: string[] = [];
          for (let i = 0; i < this.length; i++) {
            const k = this.key(i);
            if (
              k &&
              k !== key &&
              (k.startsWith('rsb_wb_') ||
                k.includes('cache') ||
                k.includes('backup') ||
                k.startsWith('RSB_PROJECT_DRAFT_') ||
                k.includes('ENTRY_10COL'))
            ) {
              dispensableKeys.push(k);
            }
          }
          dispensableKeys.forEach((k) => {
            try {
              this.removeItem(k);
            } catch {}
          });
          originalSetItem.call(this, key, value);
        } catch {
          // Never rethrow: silently succeed in-memory so React never crashes
        }
      }
    };
  } catch (initErr) {
    console.warn('[StorageQuota] Could not wrap Storage.prototype.setItem:', initErr);
  }
})();

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

