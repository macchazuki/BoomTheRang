import * as THREE from 'three';
import { PlayerView } from '../entities/PlayerView.js';
import { BoomerangView } from '../entities/BoomerangView.js';
import { TargetDummyView } from '../entities/TargetDummyView.js';
import { DogView } from '../entities/DogView.js';

/**
 * Three.js scene plus gameplay-screen DOM shell.
 *
 * Authoritative gameplay results are decided before animation reaches this class.
 * No collision, raycast, or animation callback may award XP.
 */
export class GameScene {
  constructor({ mountElement }) {
    this.mountElement = mountElement;

    this.root = null;
    this.canvasHost = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.resizeObserver = null;

    this.playerView = null;
    this.dogView = null;
    this.dogBoomerangView = null;
    this.boomerangViews = [];
    this.targetViews = [];
    this.playerResultReducedMotion = false;

    this.handleResize = this.handleResize.bind(this);
    this.handleGameplayPointer = null;
    this.handleSkillsClick = null;
    this.handleSettingsClick = null;
    this.handleOverlayPointer = null;
  }

  /**
   * Create DOM hosts and basic Three.js renderer.
   * Returns mount points needed by DOM UI classes.
   */
  mount() {
    this.root = document.createElement('section');
    this.root.className = 'game-screen';
    this.root.setAttribute('aria-label', 'BoomTheRang gameplay');
    this.root.innerHTML = `
      <div class="hud" data-hud aria-label="Game status"></div>
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
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.canvasHost.append(this.renderer.domElement);

    this.createLighting();
    this.createEnvironment();

    this.playerView = new PlayerView();
    this.scene.add(this.playerView.object3d);

    this.setTargetCount(1);
    this.setPlayerBoomerangCount(1);
    this.setDogVisible(false);

    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvasHost);
    }
    this.handleResize();

    return {
      hud: this.root.querySelector('[data-hud]'),
      gauge: this.root.querySelector('[data-gauge]'),
      feedback: this.root.querySelector('[data-feedback]'),
      overlay: this.root.querySelector('[data-overlay]'),
      skillsButton: this.root.querySelector('[data-action="skills"]'),
      settingsButton: this.root.querySelector('[data-action="settings"]'),
      gameplayArea: this.root,
    };
  }

  /** Build fixed orthographic portrait camera. */
  createCamera() {
    const camera = new THREE.OrthographicCamera(-5, 5, 9, -9, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  /** Create simple lights. */
  createLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 5, 8);
    this.scene.add(ambient, key);
  }

  /** Create background/floor presentation without gameplay significance. */
  createEnvironment() {
    this.scene.background = new THREE.Color(0x0d1220);
  }

  /**
   * Bind controller input callbacks after GameController has been created.
   * UI controls and overlay content are excluded at the gameplay input boundary.
   */
  bindInput({ onGameplayPointer, onOpenSkills, onOpenSettings }) {
    this.handleGameplayPointer = (event) => {
      if (event.defaultPrevented || event.isPrimary === false) return;
      if (typeof event.button === 'number' && event.button !== 0) return;

      const target = event.target;
      if (
        target?.closest?.(
          '[data-overlay], button, input, select, textarea, a, [role="button"]',
        )
      ) {
        return;
      }

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
    this.handleOverlayPointer = (event) => {
      event.stopPropagation();
    };

    skillsButton?.addEventListener('click', this.handleSkillsClick);
    settingsButton?.addEventListener('click', this.handleSettingsClick);
    overlay?.addEventListener('pointerdown', this.handleOverlayPointer);
  }

  /** Resize renderer/camera while preserving an authoritative portrait composition. */
  handleResize() {
    if (!this.canvasHost || !this.renderer || !this.camera) return;

    const width = Math.max(1, this.canvasHost.clientWidth);
    const height = Math.max(1, this.canvasHost.clientHeight);
    const aspect = width / height;
    const halfHeight = 9;
    const halfWidth = halfHeight * aspect;

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
  }

  /** Set visual boomerang count to match derived progression state. */
  setPlayerBoomerangCount(count) {
    for (const view of this.boomerangViews) {
      this.scene?.remove(view.object3d);
      view.dispose();
    }

    this.boomerangViews = Array.from({ length: count }, (_, index) => {
      const view = new BoomerangView({ index });
      this.scene?.add(view.object3d);
      return view;
    });
  }

  /** Set visible target formation for 1-4 targets. */
  setTargetCount(count) {
    for (const view of this.targetViews) {
      this.scene?.remove(view.object3d);
      view.dispose();
    }

    const positions = this.getTargetPositions(count);
    this.targetViews = positions.map((position, index) => {
      const view = new TargetDummyView({ index });
      view.setPosition(position);
      this.scene?.add(view.object3d);
      return view;
    });
  }

  /** Return deterministic readable formations for 1-4 targets. */
  getTargetPositions(count) {
    const formations = {
      1: [[0, 5, 0]],
      2: [[-1.4, 5, 0], [1.4, 5, 0]],
      3: [[0, 5.7, 0], [-1.3, 4.5, 0], [1.3, 4.5, 0]],
      4: [[-1.2, 5.6, 0], [1.2, 5.6, 0], [-1.2, 4.3, 0], [1.2, 4.3, 0]],
    };
    return formations[count] ?? formations[1];
  }

  /** Show/hide the companion view after Dog Companion is purchased. */
  setDogVisible(visible) {
    if (visible && !this.dogView) {
      this.dogView = new DogView();
      this.scene?.add(this.dogView.object3d);
    }

    if (visible && !this.dogBoomerangView) {
      this.dogBoomerangView = new BoomerangView({ index: 0 });
      this.dogBoomerangView.object3d.material.color.setHex(0x8fd36a);
      this.scene?.add(this.dogBoomerangView.object3d);
    }

    if (this.dogView) {
      this.dogView.object3d.visible = visible;
    }
    if (!visible) {
      this.dogBoomerangView?.reset();
    }
  }

  /** Honor either the in-game option or the operating-system/browser preference. */
  isReducedMotionRequested(inGameReducedMotion = false) {
    const systemReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Boolean(inGameReducedMotion || systemReducedMotion);
  }

  /** Return a render-space owner position slightly in front of the primitive meshes. */
  getOwnerThrowPosition(ownerView) {
    const position = ownerView?.object3d?.position?.clone?.() ?? new THREE.Vector3();
    position.z = 0.45;
    return position;
  }

  /** Build Player/Dog -> target chain -> owner points with a small readability offset. */
  buildHitPath(ownerPosition, targetCount, lateralOffset = 0) {
    const ownerStart = ownerPosition.clone();
    ownerStart.x += lateralOffset * 0.35;
    const targetPoints = this.targetViews.slice(0, targetCount).map((target) => {
      const point = target.object3d.position.clone();
      point.x += lateralOffset;
      point.z = 0.45;
      return point;
    });
    return [ownerStart, ...targetPoints, ownerPosition.clone()];
  }

  /** Build a deterministic route that clearly passes beside, not through, the target formation. */
  buildMissPath(ownerPosition, targetCount, index, lateralOffset = 0) {
    const targets = this.targetViews.slice(0, targetCount);
    const maxTargetX = Math.max(0, ...targets.map((target) => Math.abs(target.object3d.position.x)));
    const maxTargetY = Math.max(5, ...targets.map((target) => target.object3d.position.y));
    const side = index % 2 === 0 ? 1 : -1;
    const bypassX = side * (maxTargetX + 1.35 + Math.abs(lateralOffset));
    const start = ownerPosition.clone();
    start.x += lateralOffset * 0.35;

    return [
      start,
      new THREE.Vector3(bypassX, 0.5, 0.45),
      new THREE.Vector3(bypassX, maxTargetY + 0.8, 0.45),
      ownerPosition.clone(),
    ];
  }

  /**
   * Animate a resolved player throw.
   * The result is already authoritative; paths are presentation only.
   */
  async playPlayerThrow({ result, targetCount, boomerangCount, reducedMotion = false }) {
    const motionReduced = this.isReducedMotionRequested(reducedMotion);
    this.playerResultReducedMotion = motionReduced;
    this.playerView?.playThrow({ reducedMotion: motionReduced });

    const ownerPosition = this.getOwnerThrowPosition(this.playerView);
    const activeCount = Math.min(boomerangCount, this.boomerangViews.length);
    const durationSeconds = motionReduced ? 0.18 : result === 'MISS' ? 0.72 : 0.62;

    this.boomerangViews.forEach((view, index) => {
      if (index >= activeCount) {
        view.reset();
        return;
      }

      const centeredIndex = index - (activeCount - 1) / 2;
      const lateralOffset = centeredIndex * 0.16;
      const delaySeconds = index * (motionReduced ? 0.015 : 0.055);

      if (result === 'MISS') {
        view.playMissPath({
          points: this.buildMissPath(ownerPosition, targetCount, index, lateralOffset),
          durationSeconds,
          delaySeconds,
          reducedMotion: motionReduced,
        });
      } else {
        view.playHitPath({
          points: this.buildHitPath(ownerPosition, targetCount, lateralOffset),
          durationSeconds,
          delaySeconds,
          reducedMotion: motionReduced,
        });
      }
    });

    return Promise.resolve();
  }

  /** Animate a resolved dog throw without blocking the player state machine. */
  async playDogThrow({ targetCount, critical, reducedMotion = false }) {
    if (!this.dogView?.object3d.visible) return Promise.resolve();

    const motionReduced = this.isReducedMotionRequested(reducedMotion);
    this.dogView.playThrow({ critical, reducedMotion: motionReduced });

    if (this.dogBoomerangView) {
      const ownerPosition = this.getOwnerThrowPosition(this.dogView);
      this.dogBoomerangView.playHitPath({
        points: this.buildHitPath(ownerPosition, targetCount, 0.08),
        durationSeconds: motionReduced ? 0.18 : 0.58,
        reducedMotion: motionReduced,
      });
    }

    const result = critical ? 'CRITICAL' : 'HIT';
    for (const target of this.targetViews.slice(0, targetCount)) {
      target.playReaction(result, { reducedMotion: motionReduced });
    }

    return Promise.resolve();
  }

  /** Play hit/critical/miss target feedback after outcome is already known. */
  playResultFeedback(result) {
    for (const target of this.targetViews) {
      target.playReaction(result, { reducedMotion: this.playerResultReducedMotion });
    }
  }

  /** Replace normal targets with the special Grandmaster challenge target. */
  showGrandmasterTarget() {
    // Ticket 08 owns the special final-target presentation.
  }

  /** Play final multi-boomerang/dog celebration after completion is authoritative. */
  async playGrandmasterSequence({ reducedMotion = false } = {}) {
    void reducedMotion;
    // Ticket 08 owns the final challenge celebration sequence.
    return Promise.resolve();
  }

  /** Advance visual-only animations and render one frame. */
  update(deltaSeconds) {
    this.playerView?.update(deltaSeconds);
    this.dogView?.update(deltaSeconds);
    this.dogBoomerangView?.update(deltaSeconds);
    this.boomerangViews.forEach((view) => view.update(deltaSeconds));
    this.targetViews.forEach((view) => view.update(deltaSeconds));

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Release GPU resources, views, DOM, and listeners. */
  dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();

    if (this.handleGameplayPointer) {
      this.root?.removeEventListener('pointerdown', this.handleGameplayPointer);
    }

    const skillsButton = this.root?.querySelector('[data-action="skills"]');
    const settingsButton = this.root?.querySelector('[data-action="settings"]');
    const overlay = this.root?.querySelector('[data-overlay]');
    if (this.handleSkillsClick) skillsButton?.removeEventListener('click', this.handleSkillsClick);
    if (this.handleSettingsClick) settingsButton?.removeEventListener('click', this.handleSettingsClick);
    if (this.handleOverlayPointer) {
      overlay?.removeEventListener('pointerdown', this.handleOverlayPointer);
    }

    this.playerView?.dispose();
    this.dogView?.dispose();
    this.dogBoomerangView?.dispose();
    this.boomerangViews.forEach((view) => view.dispose());
    this.targetViews.forEach((view) => view.dispose());

    this.renderer?.dispose();
    this.root?.remove();

    this.root = null;
    this.canvasHost = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.resizeObserver = null;
  }
}
