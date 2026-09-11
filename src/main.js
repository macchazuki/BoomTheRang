import './style.css';
import './skillCategories.css';
import './targetStatus.css';
import './comic.css';
import { GameApp } from './app/GameApp.js';

/**
 * Browser entry point.
 * All app lifecycle work is delegated to GameApp so this file remains trivial.
 */
const mountElement = document.querySelector('#app');

if (!mountElement) {
  throw new Error('Expected #app mount element.');
}

const debugEnabled = import.meta.env.VITE_DEBUG === 'true';
const app = new GameApp({
  mountElement,
  saveKey: debugEnabled ? 'boomTheRang.debug.save.v1' : undefined,
});
app.start();

if (debugEnabled) {
  window.__boomTheRang = app;
  import('./debug/createDebugPanel.js').then(({ createDebugPanel }) => createDebugPanel(app));
} else if (import.meta.env.DEV) {
  // Keep the existing local-development console hook without shipping it in production.
  window.__boomTheRang = app;
}
