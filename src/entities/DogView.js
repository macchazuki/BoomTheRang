/** Phaser-backed render-only dog companion shown beside the player after unlock. */
export class DogView {
  constructor({ scene, toScreenPoint, worldScale }) {
    this.scene = scene;
    this.toScreenPoint = toScreenPoint;
    this.worldScale = worldScale;
    this.worldPosition = { x: 1.8, y: -5.7 };
    this.body = scene.add.rectangle(0, 0, 1, 1, 0x9a673c).setDepth(9);
    this.throwTween = null;
    this.layout();
  }

  getWorldPosition() {
    return { ...this.worldPosition };
  }

  get visible() {
    return this.body.visible;
  }

  setVisible(visible) {
    this.body.setVisible(visible);
  }

  layout() {
    const point = this.toScreenPoint(this.worldPosition);
    this.body.setPosition(point.x, point.y);
    this.body.setSize(this.worldScale(1.2), this.worldScale(0.8));
  }

  playThrow({ critical = false, reducedMotion = false } = {}) {
    this.throwTween?.stop?.();
    this.throwTween?.remove?.();

    const basePoint = this.toScreenPoint(this.worldPosition);
    const motionScale = reducedMotion ? 0.3 : 1;
    const duration = (reducedMotion ? 0.18 : critical ? 0.42 : 0.35) * 1000;
    const state = { pulse: 0 };

    this.throwTween = this.scene.tweens.add({
      targets: state,
      pulse: 1,
      duration,
      ease: 'Sine.InOut',
      yoyo: true,
      onUpdate: () => {
        const pulse = state.pulse;
        const scaleAmount = critical ? 0.18 : 0.08;
        this.body.setPosition(basePoint.x, basePoint.y - this.worldScale(0.3) * pulse * motionScale);
        this.body.setScale(1 + pulse * scaleAmount * motionScale);
        this.body.setAngle((critical ? 7 : 3.5) * pulse * motionScale);
      },
      onComplete: () => {
        this.body.setPosition(basePoint.x, basePoint.y).setScale(1).setAngle(0);
        this.throwTween = null;
      },
    });
  }

  dispose() {
    this.throwTween?.stop?.();
    this.throwTween?.remove?.();
    this.body.destroy();
  }
}
