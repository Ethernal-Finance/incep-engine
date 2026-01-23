import { AssetLoader } from '../engine/AssetLoader';
import {
  getCharGenAssetByKey,
  getCharGenAssetsByCategory,
  getCharGenCategories
} from './CharGenCatalog';
import type { CharGenComposeOptions, CharGenRandomOptions, CharGenSelection } from './types';

export const DEFAULT_LAYER_ORDER = [
  'behind_body',
  'body',
  'head',
  'hair',
  'facial',
  'torso',
  'arms',
  'hands',
  'legs',
  'feet',
  'belt',
  'accessories',
  'shoulders',
  'weapons'
];

const imageCache = new Map<string, Promise<HTMLImageElement>>();

const loadImage = (url: string): Promise<HTMLImageElement> => {
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      })
    );
  }

  return imageCache.get(url) as Promise<HTMLImageElement>;
};

const resolveLayerOrder = (
  selection: CharGenSelection,
  options?: CharGenComposeOptions
): string[] => {
  const order = options?.layerOrder?.length
    ? [...options.layerOrder]
    : [...DEFAULT_LAYER_ORDER];

  Object.keys(selection).forEach((category) => {
    if (!order.includes(category)) {
      order.push(category);
    }
  });

  return order;
};

const resolveSelectionKey = (category: string, key: string | null | undefined): string | null => {
  if (!key) return null;
  if (key.includes('/')) {
    return key;
  }
  return `${category}/${key}`;
};

export const createRandomSelection = (options: CharGenRandomOptions = {}): CharGenSelection => {
  const allCategories = options.categories?.length
    ? [...options.categories]
    : getCharGenCategories();
  const allowNone = options.allowNone ?? false;
  const selection: CharGenSelection = { ...options.overrides };

  allCategories.forEach((category) => {
    if (selection[category] !== undefined) return;
    const assets = getCharGenAssetsByCategory(category);
    if (assets.length === 0) {
      selection[category] = null;
      return;
    }

    const filtered = allowNone
      ? assets
      : assets.filter((asset) => asset.name.toLowerCase() !== 'none');
    const pool = filtered.length > 0 ? filtered : assets;
    const index = Math.floor(Math.random() * pool.length);
    selection[category] = pool[index]?.key ?? null;
  });

  return selection;
};

export const composeSpriteSheet = async (
  selection: CharGenSelection,
  options?: CharGenComposeOptions
): Promise<HTMLCanvasElement> => {
  const layerOrder = resolveLayerOrder(selection, options);
  const layerAssets = layerOrder
    .map((category) => {
      const resolvedKey = resolveSelectionKey(category, selection[category]);
      if (!resolvedKey) return null;
      return getCharGenAssetByKey(resolvedKey);
    })
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  if (layerAssets.length === 0) {
    throw new Error('No character layers selected.');
  }

  const images = await Promise.all(layerAssets.map((asset) => loadImage(asset.url)));
  const baseImage = images[0];
  const canvas = document.createElement('canvas');
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context.');
  }

  images.forEach((img) => {
    ctx.drawImage(img, 0, 0);
  });

  return canvas;
};

export const registerCompositeSprite = async (
  spriteName: string,
  selection: CharGenSelection,
  options?: CharGenComposeOptions
): Promise<HTMLCanvasElement> => {
  const canvas = await composeSpriteSheet(selection, options);
  await AssetLoader.loadImage(canvas.toDataURL('image/png'), spriteName);
  return canvas;
};

export const generateRandomSprite = async (
  spriteName: string,
  options: CharGenRandomOptions = {},
  composeOptions?: CharGenComposeOptions
): Promise<{ selection: CharGenSelection; canvas: HTMLCanvasElement }> => {
  const selection = createRandomSelection(options);
  const canvas = await registerCompositeSprite(spriteName, selection, composeOptions);
  return { selection, canvas };
};
