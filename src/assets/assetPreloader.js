const ASSET_URLS = [
  new URL('./background/forest_path.png', import.meta.url).href,
  new URL('./sprites/boomerang.png', import.meta.url).href,
  new URL('./sprites/environment.png', import.meta.url).href,
  new URL('./sprites/hero.png', import.meta.url).href,
  new URL('./sprites/target_dummy.png', import.meta.url).href,
];

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ url, ok: true });
    image.onerror = () => resolve({ url, ok: false });
    image.src = url;
  });
}

/**
 * Warm the browser cache for authored image assets before the main menu appears.
 * Individual failures do not block startup; the normal asset users can still retry.
 */
export async function preloadAssets({
  urls = ASSET_URLS,
  onProgress = () => {},
  load = loadImage,
} = {}) {
  const total = urls.length;
  let completed = 0;

  onProgress({ completed, total, progress: total === 0 ? 1 : 0 });

  if (total === 0) return [];

  const results = await Promise.all(urls.map(async (url) => {
    const result = await load(url);
    completed += 1;
    onProgress({ completed, total, progress: completed / total });
    return result;
  }));

  return results;
}

export { ASSET_URLS };
