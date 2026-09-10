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

    this.playerView = null;
    this.dogView = null;
    this.boomerangViews = [];
    this.targetViews = [];

    this.handleResize = this.handleResize.bind(this);
    this.handleGameplayPointer = null;
  }

  /**
   * Create DOM hosts and basic Three.js renderer.
   * Returns mount points needed by DOM UI classes.
   */
  mount() {
    this.root = document.createElement('section');
    this.root.className = 'game-screen';
    this.root.innerHTML = `
      <div class="hud" data-hud></div>
      <div class="game-canvas-host" data-canvas-host></div>
      <div class="game-controls">
        <div data-gauge></div>
        <div class="feedback" data-feedback aria-live="polite"></div>
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

  /** Create simple lights. TODO: tune values during visual implementation. */
  createLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 5, 8);
    this.scene.add(ambient, key);
  }

  /** Create background/floor presentation without gameplay significance. */
  createEnvironment() {
    this.scene.background = new THREE.Color(0x0d1220);
    // TODO: add lightweight floor/background shapes if they improve readability.
  }

  /**
   * Bind controller input callbacks after GameController has been created.
   * UI buttons stop propagation and must never trigger a gameplay throw.
   */
  bindInput({ onGameplayPointer, onOpenSkills, onOpenSettings }) {
    this.handleGameplayPointer = onGameplayPointer;
    this.root?.addEventListener('pointerdown', onGameplayPointer);

    this.root?.querySelector('[data-action="skills"]')?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onOpenSkills();
    });

    this.root?.querySelector('[data-action="settings"]')?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onOpenSettings();
    });
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

    if (this.dogView) {
      this.dogView.object3d.visible = visible;
    }
  }

  /**
   * Animate a resolved player throw.
   * TODO: create deterministic path Player -> targets -> Player (or miss curve).
   */
  async playPlayerThrow({ result, targetCount, boomerangCount, reducedMotion = false }) {
    void result;
    void targetCount;
    void boomerangCount;
    void reducedMotion;
    return Promise.resolve();
  }

  /** Animate a resolved dog throw without blocking the player state machine. */
  async playDogThrow({ targetCount, critical, reducedMotion = false }) {
    void targetCount;
    void critical;
    void reducedMotion;
    return Promise.resolve();
  }

  /** Play hit/critical/miss target feedback after outcome is already known. */
  playResultFeedback(result) {
    for (const target of this.targetViews) {
      target.playReaction(result);
    }
  }

  /** Replace normal targets with the special Grandmaster challenge target. */
  showGrandmasterTarget() {
    // TODO: visually distinguish the final target without changing gauge rules.
  }

  /** Play final multi-boomerang/dog celebration after completion is authoritative. */
  async playGrandmasterSequence({ reducedMotion = false } = {}) {
    void reducedMotion;
    return Promise.resolve();
  }

  /** Advance visual-only animations and render one frame. */
  update(deltaSeconds) {
    this.playerView?.update(deltaSeconds);
    this.dogView?.update(deltaSeconds);
    this.boomerangViews.forEach((view) => view.update(deltaSeconds));
    this.targetViews.forEach((view) => view.update(deltaSeconds));

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Release GPU resources, views, DOM, and listeners. */
  dispose() {
    window.removeEventListener('resize', this.handleResize);

    if (this.handleGameplayPointer) {
      this.root?.removeEventListener('pointerdown', this.handleGameplayPointer);
    }

    this.playerView?.dispose();
    this.dogView?.dispose();
    this.boomerangViews.forEach((view) => view.dispose());
    this.targetViews.forEach((view) => view.dispose());

    this.renderer?.dispose();
    this.root?.remove();

    this.root = null;
    this.canvasHost = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
