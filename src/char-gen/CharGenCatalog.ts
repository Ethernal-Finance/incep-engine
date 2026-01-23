import type { CharGenAsset, CharGenCategory } from './types';

const rawAssets = import.meta.glob('../../char-gen/Spritesheet/spritesheets/**/*.{png,PNG}', {
  eager: true,
  import: 'default'
}) as Record<string, string>;

const EXCLUDED_CATEGORIES = new Set(['palettes', 'oversize_xcf']);

let cachedAssets: CharGenAsset[] | null = null;
let cachedAssetMap: Map<string, CharGenAsset> | null = null;

const normalizePath = (path: string): string => path.replace(/\\/g, '/');

const parseAsset = (path: string, url: string): CharGenAsset | null => {
  const normalized = normalizePath(path);
  const marker = '/spritesheets/';
  const markerIndex = normalized.toLowerCase().indexOf(marker);
  if (markerIndex < 0) return null;

  const relative = normalized.slice(markerIndex + marker.length);
  const segments = relative.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const category = segments[0];
  if (!category || EXCLUDED_CATEGORIES.has(category)) return null;

  const fileName = segments[segments.length - 1] ?? '';
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  if (!baseName) return null;

  return {
    key: `${category}/${baseName}`,
    category,
    name: baseName,
    url
  };
};

const buildCache = (): void => {
  if (cachedAssets && cachedAssetMap) return;

  const assets: CharGenAsset[] = [];
  const assetMap = new Map<string, CharGenAsset>();

  Object.entries(rawAssets).forEach(([path, url]) => {
    const asset = parseAsset(path, url);
    if (!asset) return;
    assets.push(asset);
    assetMap.set(asset.key, asset);
  });

  cachedAssets = assets;
  cachedAssetMap = assetMap;
};

export const getCharGenAssets = (): CharGenAsset[] => {
  buildCache();
  return cachedAssets ? [...cachedAssets] : [];
};

export const getCharGenAssetByKey = (key: string): CharGenAsset | null => {
  if (!key) return null;
  buildCache();
  return cachedAssetMap?.get(key) ?? null;
};

export const getCharGenCategories = (): CharGenCategory[] => {
  buildCache();
  const categories = new Set<string>();
  cachedAssets?.forEach((asset) => {
    categories.add(asset.category);
  });
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
};

export const getCharGenAssetsByCategory = (category: CharGenCategory): CharGenAsset[] => {
  if (!category) return [];
  buildCache();
  return (cachedAssets ?? []).filter((asset) => asset.category === category);
};
