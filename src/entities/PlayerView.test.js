import { describe, expect, it } from 'vitest';
import { PlayerView } from './PlayerView.js';

describe('PlayerView', () => {
  it('builds the chibi player from named lightweight meshes', () => {
    const view = new PlayerView();

    expect(view.model.name).toBe('ChibiPlayer');
    expect(view.model.getObjectByName('Head')).toBeTruthy();
    expect(view.model.getObjectByName('Torso')).toBeTruthy();
    expect(view.model.getObjectByName('Hair_Cap')).toBeTruthy();
    expect(view.model.getObjectByName('Eye_L')).toBeTruthy();
    expect(view.model.getObjectByName('Eye_R')).toBeTruthy();
    expect(view.model.getObjectByName('Boomerang')).toBeFalsy();

    view.dispose();
  });

  it('keeps the existing throw animation hook', () => {
    const view = new PlayerView();

    view.playThrow();
    view.update(0.16);

    expect(view.body.rotation.z).not.toBe(0);
    expect(view.object3d.scale.x).toBeGreaterThan(1);

    view.update(0.16);
    expect(view.body.rotation.z).toBe(0);
    expect(view.object3d.scale.x).toBe(1);

    view.dispose();
  });
});
