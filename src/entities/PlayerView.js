import * as THREE from 'three';

/**
 * Render-only player avatar.
 * Owns visual construction/animation only; gameplay results stay outside this class.
 */
export class PlayerView {
  constructor() {
    this.object3d = new THREE.Group();
    this.object3d.position.set(0, -5.5, 0);

    // Keep animation on a stable center pivot.
    this.body = new THREE.Group();
    this.object3d.add(this.body);
    this.model = this.createCharacter();
    this.body.add(this.model);

    this.throwAnimationDuration = 0.32;
    this.throwAnimationRemaining = 0;
    this.throwReducedMotion = false;
  }

  createMaterial(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
  }

  addBox(group, name, size, position, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.createMaterial(color));
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  }

  addSphere(group, name, scale, position, color, segments = 12) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, Math.max(8, Math.floor(segments * 0.75))),
      this.createMaterial(color),
    );
    mesh.name = name;
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  }

  addLimb(group, name, start, end, radius, color) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const length = direction.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 8),
      this.createMaterial(color),
    );
    mesh.name = name;
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(mesh);
    return mesh;
  }

  /** Build the lightweight chibi/anime player directly in Three.js. */
  createCharacter() {
    const model = new THREE.Group();
    model.name = 'ChibiPlayer';

    const skin = 0xf4b183;
    const hair = 0x5a3626;
    const shirt = 0x35a7a0;
    const scarf = 0xf28c3a;
    const shorts = 0x3d4b66;
    const boots = 0x7a4c2a;
    const belt = 0x5b3824;
    const buckle = 0xe8c35a;
    const eye = 0x1e2024;

    this.addBox(model, 'Torso', [0.48, 0.56, 0.28], [0, 0.16, 0], shirt);
    this.addBox(model, 'Shorts', [0.46, 0.22, 0.27], [0, -0.19, 0], shorts);
    this.addBox(model, 'Belt', [0.49, 0.08, 0.3], [0, -0.08, 0.005], belt);
    this.addBox(model, 'Buckle', [0.09, 0.07, 0.035], [0, -0.08, 0.17], buckle);
    this.addBox(model, 'Scarf', [0.4, 0.1, 0.32], [0, 0.44, 0.015], scarf);

    this.addLimb(model, 'Leg_L', [-0.13, -0.25, 0], [-0.13, -0.51, 0], 0.095, skin);
    this.addLimb(model, 'Leg_R', [0.13, -0.25, 0], [0.13, -0.51, 0], 0.095, skin);
    this.addSphere(model, 'Boot_L', [0.14, 0.12, 0.2], [-0.13, -0.65, 0.07], boots, 8);
    this.addSphere(model, 'Boot_R', [0.14, 0.12, 0.2], [0.13, -0.65, 0.07], boots, 8);

    this.addLimb(model, 'Arm_L', [-0.24, 0.34, 0], [-0.38, 0.04, 0.01], 0.085, skin);
    this.addLimb(model, 'Arm_R', [0.24, 0.34, 0], [0.39, 0.06, 0.01], 0.085, skin);
    this.addSphere(model, 'Hand_L', [0.1, 0.11, 0.09], [-0.4, -0.03, 0.01], skin, 8);
    this.addSphere(model, 'Hand_R', [0.1, 0.11, 0.09], [0.42, -0.01, 0.01], skin, 8);

    this.addSphere(model, 'Head', [0.39, 0.43, 0.35], [0, 0.79, 0], skin, 16);
    this.addSphere(model, 'Hair_Cap', [0.405, 0.3, 0.365], [0, 1.02, -0.02], hair, 12);
    this.addSphere(model, 'Eye_L', [0.043, 0.062, 0.025], [-0.135, 0.8, 0.337], eye, 8);
    this.addSphere(model, 'Eye_R', [0.043, 0.062, 0.025], [0.135, 0.8, 0.337], eye, 8);

    const bangPositions = [
      [-0.18, 0.99, 0.28],
      [-0.06, 1.02, 0.32],
      [0.08, 1.02, 0.31],
      [0.2, 0.98, 0.27],
    ];
    bangPositions.forEach((position, index) => {
      const bang = new THREE.Mesh(
        new THREE.ConeGeometry(0.105, 0.28, 6),
        this.createMaterial(hair),
      );
      bang.name = `Hair_Bang_${index + 1}`;
      bang.position.set(...position);
      bang.rotation.z = Math.PI;
      model.add(bang);
    });

    model.scale.setScalar(1.3);
    model.position.y = -0.12;
    return model;
  }

  /** Visual-only frame update for the active throw pose. */
  update(deltaSeconds) {
    if (this.throwAnimationRemaining <= 0) return;

    this.throwAnimationRemaining = Math.max(0, this.throwAnimationRemaining - deltaSeconds);
    const progress = 1 - this.throwAnimationRemaining / this.throwAnimationDuration;
    const pulse = Math.sin(progress * Math.PI);
    const motionScale = this.throwReducedMotion ? 0.3 : 1;

    this.body.rotation.z = -0.22 * pulse * motionScale;
    this.body.rotation.x = 0.12 * pulse * motionScale;
    this.object3d.scale.set(
      1 + 0.05 * pulse * motionScale,
      1 - 0.03 * pulse * motionScale,
      1,
    );

    if (this.throwAnimationRemaining === 0) {
      this.body.rotation.set(0, 0, 0);
      this.object3d.scale.setScalar(1);
      this.throwReducedMotion = false;
    }
  }

  /** Visual hook called when a manual throw begins. */
  playThrow({ reducedMotion = false } = {}) {
    this.throwReducedMotion = reducedMotion;
    this.throwAnimationDuration = reducedMotion ? 0.18 : 0.32;
    this.throwAnimationRemaining = this.throwAnimationDuration;
  }

  /** Dispose owned geometries/materials. */
  dispose() {
    this.object3d.traverse((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    });
    this.object3d.clear();
  }
}
