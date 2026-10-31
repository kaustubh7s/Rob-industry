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

// Register Service Worker for PWA / Desktop App installation and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('RSB Industry ERP: Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('RSB Industry ERP: Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

