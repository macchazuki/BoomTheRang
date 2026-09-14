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
import { GameState } from './gameplay/GameState.js';
import { GameController } from './gameplay/GameController.js';
import { GaugeController } from './gameplay/GaugeController.js';
import { ThrowController } from './gameplay/ThrowController.js';
import { DogController } from './gameplay/DogController.js';
import { ProgressionManager } from './progression/ProgressionManager.js';
import { SaveManager } from './persistence/SaveManager.js';
import { createDefaultSave } from './persistence/defaultSave.js';
import { ChallengeManager } from './challenges/ChallengeManager.js';
import { getChallengeGaugeOneWaySeconds } from './challenges/challengeDefinitions.js';
import { HUD } from './ui/HUD.js';
import { GaugeView } from './ui/GaugeView.js';
import { ActiveSkillBar } from './ui/ActiveSkillBar.js';
import { ChallengeButtonBar } from './ui/ChallengeButtonBar.js';
import { UpgradePanel } from './ui/ProgressionPanel.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { CompletionPanel } from './ui/CompletionPanel.js';
import { ChallengeResultPanel } from './ui/ChallengeResultPanel.js';
import { clampDeltaSeconds } from './game.js';

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
