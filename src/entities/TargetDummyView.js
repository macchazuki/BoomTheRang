const SPRITE_HEIGHT = 3.7;

/** Phaser-backed render-only target dummy. */
export class TargetDummyView {
  constructor({ scene, index = 0, toScreenPoint, worldScale }) {
    this.scene = scene;
    this.index = index;
    this.toScreenPoint = toScreenPoint;
    this.worldScale = worldScale;
    this.worldPosition = { x: 0, y: 5 };
    this.sprite = scene.add.sprite(0, 0, 'target-dummy', 'target-0').setDepth(8);
    this.layout();
  }

  setPosition([x, y]) {
    this.worldPosition = { x, y };
    this.layout();
  }

  getWorldPosition() {
    return { ...this.worldPosition };
  }

  layout() {
    const point = this.toScreenPoint(this.worldPosition);
    const sourceHeight = this.sprite.frame?.height || this.sprite.height || 1;
    this.sprite.setPosition(point.x, point.y);
    this.sprite.setScale(this.worldScale(SPRITE_HEIGHT) / sourceHeight);
  }

  playReaction(result, { reducedMotion = false } = {}) {
    if (result === 'MISS') return;
    const animationKey = reducedMotion
      ? 'target-hit-reduced'
      : result === 'CRITICAL'
        ? 'target-critical'
        : 'target-hit';
    this.sprite.stop();
    this.sprite.setFrame('target-1');
    this.sprite.play(animationKey);
  }

  dispose() {
    this.sprite.destroy();
  }
}
