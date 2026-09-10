import { describe, it } from 'vitest';

describe('SaveManager contract', () => {
  it.todo('returns fresh defaults when no save exists');
  it.todo('round-trips valid v1 data');
  it.todo('fills missing fields');
  it.todo('recovers from corrupted JSON');
  it.todo('ignores unknown upgrades/fields safely');
  it.todo('clamps unsafe numeric/settings values');
  it.todo('keeps migration path explicit by version');
});
