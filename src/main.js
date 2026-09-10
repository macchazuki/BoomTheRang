import './style.css';
import { GameApp } from './app/GameApp.js';

/**
 * Browser entry point.
 * All app lifecycle work is delegated to GameApp so this file remains trivial.
 */
const mountElement = document.querySelector('#app');

if (!mountElement) {
  throw new Error('Expected #app mount element.');
}

const app = new GameApp({ mountElement });
app.start();

// Expose only in development for manual debugging; gameplay code must not depend on it.
if (import.meta.env.DEV) {
  window.__boomTheRang = app;
}
