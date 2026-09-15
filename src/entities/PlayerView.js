const SPRITE_HEIGHT = 3.2;
const SOURCE_HEIGHT = 724;

/** Phaser-backed render-only player avatar. */
export class PlayerView {
  constructor({ scene, toScreenPoint, worldScale }) {
    this.scene = scene;
    this.toScreenPoint = toScreenPoint;
    this.worldScale = worldScale;
    this.worldPosition = { x: 0, y: -5.5 };
    this.sprite = scene.add.sprite(0, 0, 'hero', 'hero-0').setDepth(10);
    this.layout();
  }

  getWorldPosition() {
    return { ...this.worldPosition };
  }

  layout() {
    const point = this.toScreenPoint(this.worldPosition);
    this.sprite.setPosition(point.x, point.y);
    this.sprite.setScale(this.worldScale(SPRITE_HEIGHT) / SOURCE_HEIGHT);
  }

  playThrow({ reducedMotion = false } = {}) {
    const animationKey = reducedMotion ? 'hero-throw-reduced' : 'hero-throw';
    this.sprite.stop();
    this.sprite.setFrame('hero-1');
    this.sprite.play(animationKey);
  }

  dispose() {
    this.sprite.destroy();
  }
}
