import { PlayerView } from '../entities/PlayerView.js';
import { BoomerangView } from '../entities/BoomerangView.js';
import { TargetDummyView } from '../entities/TargetDummyView.js';
import { DogView } from '../entities/DogView.js';

const HERO_URL = new URL('../assets/sprites/hero.png', import.meta.url).href;
const BOOMERANG_URL = new URL('../assets/sprites/boomerang.png', import.meta.url).href;
const TARGET_URL = new URL('../assets/sprites/target_dummy.png', import.meta.url).href;
const WORLD_HEIGHT = 18;
const HERO_FRAME_RECTS = [
  { x: 0, width: 543 },
  { x: 543, width: 543 },
  { x: 1086, width: 555 },
  { x: 1642, width: 530 },
];

/**
 * Phaser 4 presentation scene plus the existing DOM gameplay shell.
 * Authoritative gameplay results remain in GameController; Phaser is render-only.
 */
export class GameScene {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.root = null;
    this.canvasHost = null;
    this.phaserGame = null;
    this.phaserScene = null;
    this.resizeObserver = null;
    this.disposed = false;

    this.playerView = null;
    this.dogView = null;
    this.dogBoomerangView = null;
    this.boomerangViews = [];
    this.targetViews = [];
    this.playerResultReducedMotion = false;
    this.grandmasterMarker = null;
    this.desiredBoomerangCount = 1;
    this.desiredTargetCount = 1;
    this.desiredDogVisible = false;

    this.handleResize = this.handleResize.bind(this);
    this.handleGameplayPointer = null;
    this.handleSkillsClick = null;
    this.handleSettingsClick = null;
    this.handleOverlayPointer = null;
  }

  mount() {
    this.root = document.createElement('section');
    this.root.className = 'game-screen';
    this.root.setAttribute('aria-label', 'BoomTheRang gameplay');
    this.root.innerHTML = `
      <div class="hud" data-hud aria-label="Game status"></div>
      <div class="challenge-buttons" data-challenge-buttons aria-label="Challenge modes"></div>
      <div class="game-canvas-host" data-canvas-host role="img" aria-label="Boomerang training field"></div>
      <div class="game-controls">
        <div data-gauge></div>
        <div class="feedback" data-feedback aria-live="polite" aria-atomic="true"></div>
        <div class="panel-actions">
          <button type="button" data-action="skills">Skills</button>
          <button type="button" data-action="settings">Settings</button>
        </div>
      </div>
      <div class="overlay" data-overlay hidden></div>
    `;
    this.mountElement.replaceChildren(this.root);
    this.canvasHost = this.root.querySelector('[data-canvas-host]');

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvasHost);
    }

    void this.startPhaser();

    return {
      hud: this.root.querySelector('[data-hud]'),
      challengeButtons: this.root.querySelector('[data-challenge-buttons]'),
      gauge: this.root.querySelector('[data-gauge]'),
      feedback: this.root.querySelector('[data-feedback]'),
      overlay: this.root.querySelector('[data-overlay]'),
      skillsButton: this.root.querySelector('[data-action="skills"]'),
      settingsButton: this.root.querySelector('[data-action="settings"]'),
      gameplayArea: this.root,
    };
  }

  async startPhaser() {
    try {
      const { default: Phaser } = await import('phaser');
      if (this.disposed || !this.canvasHost?.isConnected) return;

      const owner = this;
      class GameplayPresentationScene extends Phaser.Scene {
        constructor() {
          super({ key: 'GameplayPresentation' });
        }

        preload() {
          owner.preloadPhaserAssets(this);
        }

        create() {
          owner.attachPhaserScene(this);
        }
      }

      this.phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: this.canvasHost,
        width: Math.max(1, this.canvasHost.clientWidth || 720),
        height: Math.max(1, this.canvasHost.clientHeight || 720),
        transparent: true,
        render: {
          antialias: true,
          roundPixels: false,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
        },
        scene: [GameplayPresentationScene],
      });
    } catch (error) {
      console.error('Failed to start Phaser presentation', error);
    }
  }

  preloadPhaserAssets(scene) {
    scene.load.image('hero', HERO_URL);
    scene.load.image('boomerang', BOOMERANG_URL);
    scene.load.image('target-dummy', TARGET_URL);
  }

  attachPhaserScene(scene) {
    if (this.disposed) return;
    this.phaserScene = scene;
    this.configureTextureFrames();
    this.configureAnimations();

    this.playerView = new PlayerView({
      scene,
      toScreenPoint: (point) => this.toScreenPoint(point),
      worldScale: (value) => this.worldScale(value),
    });

    this.setTargetCount(this.desiredTargetCount);
    this.setPlayerBoomerangCount(this.desiredBoomerangCount);
    this.setDogVisible(this.desiredDogVisible);
    this.handleResize();
  }

  configureTextureFrames() {
    const hero = this.phaserScene.textures.get('hero');
    HERO_FRAME_RECTS.forEach((frame, index) => {
      if (!hero.has(`hero-${index}`)) hero.add(`hero-${index}`, 0, frame.x, 0, frame.width, 724);
    });

    this.addEqualFrames('boomerang', 'boomerang', 4);
    this.addEqualFrames('target-dummy', 'target', 4);
  }

  addEqualFrames(textureKey, framePrefix, frameCount) {
    const texture = this.phaserScene.textures.get(textureKey);
    const source = texture.getSourceImage();
    const frameWidth = source.width / frameCount;
    for (let index = 0; index < frameCount; index += 1) {
      const frameKey = `${framePrefix}-${index}`;
      if (!texture.has(frameKey)) {
        texture.add(frameKey, 0, index * frameWidth, 0, frameWidth, source.height);
      }
    }
  }

  configureAnimations() {
    const animations = this.phaserScene.anims;
    const create = (key, frames, duration) => {
      if (animations.exists(key)) return;
      animations.create({ key, frames, duration, repeat: 0 });
    };

    const heroFrames = [1, 2, 3, 0].map((index) => ({ key: 'hero', frame: `hero-${index}` }));
    create('hero-throw', heroFrames, 320);
    create('hero-throw-reduced', heroFrames, 180);

    const targetFrames = [1, 2, 3, 0].map((index) => ({ key: 'target-dummy', frame: `target-${index}` }));
    create('target-hit', targetFrames, 240);
    create('target-critical', targetFrames, 340);
    create('target-hit-reduced', targetFrames, 140);
  }

  bindInput({ onGameplayPointer, onOpenSkills, onOpenSettings }) {
    this.handleGameplayPointer = (event) => {
      if (event.defaultPrevented || event.isPrimary === false) return;
      if (typeof event.button === 'number' && event.button !== 0) return;
      const target = event.target;
      if (target?.closest?.('[data-overlay], button, input, select, textarea, a, [role="button"]')) return;
      onGameplayPointer(event);
    };
    this.root?.addEventListener('pointerdown', this.handleGameplayPointer);

    const skillsButton = this.root?.querySelector('[data-action="skills"]');
    const settingsButton = this.root?.querySelector('[data-action="settings"]');
    const overlay = this.root?.querySelector('[data-overlay]');

    this.handleSkillsClick = (event) => {
      event.stopPropagation();
      onOpenSkills();
    };
    this.handleSettingsClick = (event) => {
      event.stopPropagation();
      onOpenSettings();
    };
    this.handleOverlayPointer = (event) => event.stopPropagation();

    skillsButton?.addEventListener('click', this.handleSkillsClick);
    settingsButton?.addEventListener('click', this.handleSettingsClick);
    overlay?.addEventListener('pointerdown', this.handleOverlayPointer);
  }

  toScreenPoint({ x = 0, y = 0 } = {}) {
    const width = Math.max(1, this.canvasHost?.clientWidth || this.phaserScene?.scale?.width || 720);
    const height = Math.max(1, this.canvasHost?.clientHeight || this.phaserScene?.scale?.height || 720);
    const pixelsPerWorldUnit = height / WORLD_HEIGHT;
    return {
      x: width / 2 + x * pixelsPerWorldUnit,
      y: height / 2 - y * pixelsPerWorldUnit,
    };
  }

  worldScale(value) {
    const height = Math.max(1, this.canvasHost?.clientHeight || this.phaserScene?.scale?.height || 720);
    return value * height / WORLD_HEIGHT;
  }

  handleResize() {
    if (!this.canvasHost) return;
    const width = Math.max(1, this.canvasHost.clientWidth);
    const height = Math.max(1, this.canvasHost.clientHeight);
    this.phaserGame?.scale?.resize?.(width, height);
    this.playerView?.layout();
    this.dogView?.layout();
    this.dogBoomerangView?.layout();
    this.boomerangViews.forEach((view) => view.layout());
    this.targetViews.forEach((view) => view.layout());
    this.layoutGrandmasterMarker();
  }

  setPlayerBoomerangCount(count) {
    this.desiredBoomerangCount = Math.max(0, Math.floor(count));
    if (!this.phaserScene) return;

    this.boomerangViews.forEach((view) => view.dispose());
    this.boomerangViews = Array.from({ length: this.desiredBoomerangCount }, (_, index) => new BoomerangView({
      scene: this.phaserScene,
      index,
      toScreenPoint: (point) => this.toScreenPoint(point),
      worldScale: (value) => this.worldScale(value),
    }));
  }

  setTargetCount(count) {
    this.desiredTargetCount = Math.max(1, Math.floor(count));
    if (!this.phaserScene) return;

    this.targetViews.forEach((view) => view.dispose());
    const positions = this.getTargetPositions(this.desiredTargetCount);
    this.targetViews = positions.map((position, index) => {
      const view = new TargetDummyView({
        scene: this.phaserScene,
        index,
        toScreenPoint: (point) => this.toScreenPoint(point),
        worldScale: (value) => this.worldScale(value),
      });
      view.setPosition(position);
      return view;
    });
  }

  getTargetPositions(count) {
    const formations = {
      1: [[0, 5, 0]],
      2: [[-1.4, 5, 0], [1.4, 5, 0]],
      3: [[0, 5.7, 0], [-1.3, 4.5, 0], [1.3, 4.5, 0]],
      4: [[-1.2, 5.6, 0], [1.2, 5.6, 0], [-1.2, 4.3, 0], [1.2, 4.3, 0]],
    };
    return formations[count] ?? formations[1];
  }

  setDogVisible(visible) {
    this.desiredDogVisible = Boolean(visible);
    if (!this.phaserScene) return;

    if (visible && !this.dogView) {
      this.dogView = new DogView({
        scene: this.phaserScene,
        toScreenPoint: (point) => this.toScreenPoint(point),
        worldScale: (value) => this.worldScale(value),
      });
    }

    if (visible && !this.dogBoomerangView) {
      this.dogBoomerangView = new BoomerangView({
        scene: this.phaserScene,
        index: 0,
        tint: 0x8fd36a,
        toScreenPoint: (point) => this.toScreenPoint(point),
        worldScale: (value) => this.worldScale(value),
      });
    }

    this.dogView?.setVisible(visible);
    if (!visible) this.dogBoomerangView?.reset();
  }

  isReducedMotionRequested(inGameReducedMotion = false) {
    const systemReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Boolean(inGameReducedMotion || systemReducedMotion);
  }

  getOwnerThrowPosition(ownerView) {
    return ownerView?.getWorldPosition?.() ?? { x: 0, y: 0 };
  }

  buildHitPath(ownerPosition, targetCount, lateralOffset = 0) {
    const ownerStart = { ...ownerPosition, x: ownerPosition.x + lateralOffset * 0.35 };
    const targetPoints = this.targetViews.slice(0, targetCount).map((target) => {
      const point = target.getWorldPosition();
      return { ...point, x: point.x + lateralOffset };
    });
    return [ownerStart, ...targetPoints, { ...ownerPosition }];
  }

  buildMissPath(ownerPosition, targetCount, index, lateralOffset = 0) {
    const targets = this.targetViews.slice(0, targetCount).map((target) => target.getWorldPosition());
    const maxTargetX = Math.max(0, ...targets.map((target) => Math.abs(target.x)));
    const maxTargetY = Math.max(5, ...targets.map((target) => target.y));
    const side = index % 2 === 0 ? 1 : -1;
    const bypassX = side * (maxTargetX + 1.35 + Math.abs(lateralOffset));
    const start = { ...ownerPosition, x: ownerPosition.x + lateralOffset * 0.35 };

    return [
      start,
      { x: bypassX, y: 0.5 },
      { x: bypassX, y: maxTargetY + 0.8 },
      { ...ownerPosition },
    ];
  }

  dispatchImpact({ targetIndex, result, dog = false, reducedMotion = false }) {
    if (!this.canvasHost || typeof CustomEvent === 'undefined') return;
    this.canvasHost.dispatchEvent(new CustomEvent('boomerangimpact', {
      detail: { targetIndex, result, dog, reducedMotion },
    }));
  }

  async playPlayerThrow({ result, targetCount, boomerangCount, reducedMotion = false }) {
    const motionReduced = this.isReducedMotionRequested(reducedMotion);
    this.playerResultReducedMotion = motionReduced;
    this.playerView?.playThrow({ reducedMotion: motionReduced });
    if (!this.playerView) return Promise.resolve();

    const ownerPosition = this.getOwnerThrowPosition(this.playerView);
    ownerPosition.x += 0.95;
    ownerPosition.y += 0.65;

    const activeCount = Math.min(boomerangCount, this.boomerangViews.length);
    const durationSeconds = motionReduced ? 0.18 : result === 'MISS' ? 0.72 : 0.62;
    const heroFinalFrameDelay = motionReduced ? 0.12 : 0.215;
    const reactedTargets = new Set();
    const onPathPoint = result === 'MISS' ? null : (pathPointIndex) => {
      const targetIndex = pathPointIndex - 1;
      if (targetIndex < 0 || targetIndex >= targetCount || reactedTargets.has(targetIndex)) return;
      reactedTargets.add(targetIndex);
      this.targetViews[targetIndex]?.playReaction(result, { reducedMotion: motionReduced });
      this.dispatchImpact({ targetIndex, result, reducedMotion: motionReduced });
    };

    this.boomerangViews.forEach((view, index) => {
      if (index >= activeCount) {
        view.reset();
        return;
      }
      const centeredIndex = index - (activeCount - 1) / 2;
      const lateralOffset = centeredIndex * 0.16;
      const delaySeconds = heroFinalFrameDelay + index * (motionReduced ? 0.015 : 0.055);
      const common = { durationSeconds, delaySeconds, reducedMotion: motionReduced };
      if (result === 'MISS') {
        view.playMissPath({ ...common, points: this.buildMissPath(ownerPosition, targetCount, index, lateralOffset) });
      } else {
        view.playHitPath({
          ...common,
          points: this.buildHitPath(ownerPosition, targetCount, lateralOffset),
          onPathPoint,
        });
      }
    });

    return Promise.resolve();
  }

  async playDogThrow({ targetCount, critical, reducedMotion = false }) {
    if (!this.dogView?.visible) return Promise.resolve();
    const motionReduced = this.isReducedMotionRequested(reducedMotion);
    this.dogView.playThrow({ critical, reducedMotion: motionReduced });

    if (this.dogBoomerangView) {
      const ownerPosition = this.getOwnerThrowPosition(this.dogView);
      const result = critical ? 'CRITICAL' : 'HIT';
      const reactedTargets = new Set();
      this.dogBoomerangView.playHitPath({
        points: this.buildHitPath(ownerPosition, targetCount, 0.08),
        durationSeconds: motionReduced ? 0.18 : 0.58,
        reducedMotion: motionReduced,
        onPathPoint: (pathPointIndex) => {
          const targetIndex = pathPointIndex - 1;
          if (targetIndex < 0 || targetIndex >= targetCount || reactedTargets.has(targetIndex)) return;
          reactedTargets.add(targetIndex);
          this.targetViews[targetIndex]?.playReaction(result, { reducedMotion: motionReduced });
          this.dispatchImpact({ targetIndex, result, dog: true, reducedMotion: motionReduced });
        },
      });
    }

    return Promise.resolve();
  }

  playResultFeedback(result) {
    if (result === 'MISS') {
      this.targetViews.forEach((target) => target.playReaction(result, {
        reducedMotion: this.playerResultReducedMotion,
      }));
    }
  }

  showGrandmasterTarget() {
    if (this.grandmasterMarker || !this.phaserScene || !this.targetViews[0]) return;
    this.grandmasterMarker = this.phaserScene.add.circle(0, 0, 1, 0x000000, 0)
      .setStrokeStyle(Math.max(2, this.worldScale(0.08)), 0xffe08a, 0.9)
      .setDepth(7);
    this.layoutGrandmasterMarker();
  }

  layoutGrandmasterMarker() {
    if (!this.grandmasterMarker || !this.targetViews[0]) return;
    const point = this.toScreenPoint(this.targetViews[0].getWorldPosition());
    this.grandmasterMarker.setPosition(point.x, point.y);
    this.grandmasterMarker.setRadius(this.worldScale(0.94));
    this.grandmasterMarker.setStrokeStyle(Math.max(2, this.worldScale(0.08)), 0xffe08a, 0.9);
  }

  hideGrandmasterTarget() {
    this.grandmasterMarker?.destroy();
    this.grandmasterMarker = null;
  }

  async playGrandmasterSequence({ reducedMotion = false } = {}) {
    const motionReduced = this.isReducedMotionRequested(reducedMotion);
    await Promise.all([
      this.playPlayerThrow({
        result: 'CRITICAL',
        targetCount: this.targetViews.length,
        boomerangCount: this.boomerangViews.length,
        reducedMotion: motionReduced,
      }),
      this.playDogThrow({
        targetCount: this.targetViews.length,
        critical: true,
        reducedMotion: motionReduced,
      }),
    ]);
  }

  update() {
    // Phaser owns its render/tween/animation loop. GameApp still owns gameplay timing.
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.root?.removeEventListener('pointerdown', this.handleGameplayPointer);
    this.root?.querySelector('[data-action="skills"]')?.removeEventListener('click', this.handleSkillsClick);
    this.root?.querySelector('[data-action="settings"]')?.removeEventListener('click', this.handleSettingsClick);
    this.root?.querySelector('[data-overlay]')?.removeEventListener('pointerdown', this.handleOverlayPointer);

    this.hideGrandmasterTarget();
    this.playerView?.dispose();
    this.dogView?.dispose();
    this.dogBoomerangView?.dispose();
    this.boomerangViews.forEach((view) => view.dispose());
    this.targetViews.forEach((view) => view.dispose());
    this.phaserGame?.destroy(true);
    this.phaserGame = null;
    this.phaserScene = null;
    this.root?.remove();
  }
}
