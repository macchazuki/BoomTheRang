import { describe, expect, it, vi } from 'vitest';
import { preloadAssets } from './assetPreloader.js';

describe('preloadAssets', () => {
  it('loads every asset and reports progress through completion', async () => {
    const load = vi.fn(async (url) => ({ url, ok: true }));
    const onProgress = vi.fn();
    const urls = ['hero.png', 'target.png', 'background.png'];

    const results = await preloadAssets({ urls, load, onProgress });

    expect(load).toHaveBeenCalledTimes(3);
    expect(results).toEqual(urls.map((url) => ({ url, ok: true })));
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      completed: 0,
      total: 3,
      progress: 0,
    });
    expect(onProgress).toHaveBeenLastCalledWith({
      completed: 3,
      total: 3,
      progress: 1,
    });
  });

  it('completes immediately when there are no assets', async () => {
    const onProgress = vi.fn();

    await expect(preloadAssets({ urls: [], onProgress })).resolves.toEqual([]);
    expect(onProgress).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith({ completed: 0, total: 0, progress: 1 });
  });
});
