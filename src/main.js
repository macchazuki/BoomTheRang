import './style.css';
import './loading.css';
import './skillCategories.css';
import './activeSkills.css';
import './targetStatus.css';
import './comic.css';
import './challengeButtons.css';
import './gameLayout.css';
import './gauge.css';
import './uniformComicUI.css';
import { GameApp } from './app/GameApp.js';
import { preloadAssets } from './assets/assetPreloader.js';
import { LoadingScene } from './scenes/LoadingScene.js';

/**
 * Browser entry point.
 * Assets are preloaded before GameApp starts so the main menu is never shown
 * while authored gameplay art is still loading in the background.
 */
const mountElement = document.querySelector('#app');

if (!mountElement) {
  throw new Error('Expected #app mount element.');
}

const debugEnabled = import.meta.env.VITE_DEBUG === 'true';
const loadingScene = new LoadingScene({ mountElement });
loadingScene.mount();

async function bootstrap() {
  try {
    await preloadAssets({
      onProgress: ({ progress }) => loadingScene.setProgress(progress),
    });
  } catch (error) {
    console.warn('Asset preload failed; continuing startup.', error);
  }

  loadingScene.unmount();

  const app = new GameApp({
    mountElement,
    saveKey: debugEnabled ? 'boomTheRang.debug.save.v1' : undefined,
  });
  app.start();

  if (debugEnabled) {
    window.__boomTheRang = app;
    import('./debug/createDebugPanel.js').then(({ createDebugPanel }) => createDebugPanel(app));
  } else if (import.meta.env.DEV) {
    window.__boomTheRang = app;
  }
}

bootstrap();
