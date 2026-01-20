import { Tilemap } from '../data/Tilemap';
import { Tileset } from '../data/Tilemap';
import { AssetLoader } from '../engine/AssetLoader';
import { Level } from '../data/Level';
import { TileClassifier, TileType } from './TileClassifier';

export interface WorldAsset {
  path: string;
  category: string;
  name: string;
}

export interface WorldGeneratorConfig {
  width: number;
  height: number;
  tileSize: number;
  seed?: number;
  terrainDensity?: number; // 0-1, how much of the world is terrain vs empty
  structureDensity?: number; // 0-1, how many structures to place
  screenWidth?: number; // Screen width in pixels (for room-based generation)
  screenHeight?: number; // Screen height in pixels (for room-based generation)
  roomBased?: boolean; // If true, generates rooms that fit the screen
}

export class WorldGenerator {
  private static assetManifest: WorldAsset[] = [];
  private static tilesetCache: Map<string, HTMLImageElement> = new Map();
  private static tilesetCanvas: HTMLCanvasElement | null = null;
  private static tilesetImage: HTMLImageElement | null = null;
  private static tilesetColumns: number = 0;
  private static tileIndexMap: Map<string, number> = new Map(); // Maps asset path to tile ID
  private static assetClassifications: Map<string, TileType> = new Map(); // Maps asset path to tile type
  private static assetsByType: Map<TileType, WorldAsset[]> = new Map(); // Groups assets by type

  /**
   * Initialize the world generator with a list of asset paths
   * In a real scenario, this would be loaded from a manifest file
   */
  static async initialize(assetPaths: string[], maxAssets: number = 1000): Promise<void> {
    // Parse asset paths and categorize them
    WorldGenerator.assetManifest = assetPaths.map(path => {
      const parts = path.split('/');
      const filename = parts[parts.length - 1];
      const category = parts.length > 1 ? parts[parts.length - 2] : 'unknown';
      
      return {
        path,
        category,
        name: filename.replace('.png', '')
      };
    });

    // Sample a subset of assets for performance (too many assets can be slow to load)
    if (WorldGenerator.assetManifest.length > maxAssets) {
      console.log(`Sampling ${maxAssets} assets from ${WorldGenerator.assetManifest.length} total assets`);
      const sampled: WorldAsset[] = [];
      const step = Math.floor(WorldGenerator.assetManifest.length / maxAssets);
      for (let i = 0; i < WorldGenerator.assetManifest.length && sampled.length < maxAssets; i += step) {
        sampled.push(WorldGenerator.assetManifest[i]);
      }
      // Fill remaining slots with random samples
      while (sampled.length < maxAssets) {
        const randomIndex = Math.floor(Math.random() * WorldGenerator.assetManifest.length);
        if (!sampled.includes(WorldGenerator.assetManifest[randomIndex])) {
          sampled.push(WorldGenerator.assetManifest[randomIndex]);
        }
      }
      WorldGenerator.assetManifest = sampled;
    }

    // Classify all assets by type
    WorldGenerator.classifyAssets();

    // Build a dynamic tileset from sampled assets
    await WorldGenerator.buildDynamicTileset();
  }

  /**
   * Classify all assets and group them by type
   */
  private static classifyAssets(): void {
    WorldGenerator.assetsByType.clear();
    WorldGenerator.assetClassifications.clear();

    for (const asset of WorldGenerator.assetManifest) {
      const classification = TileClassifier.classify(asset.name, asset.category);
      WorldGenerator.assetClassifications.set(asset.path, classification.type);

      if (!WorldGenerator.assetsByType.has(classification.type)) {
        WorldGenerator.assetsByType.set(classification.type, []);
      }
      WorldGenerator.assetsByType.get(classification.type)!.push(asset);
    }

    console.log('Asset classification complete:');
    for (const [type, assets] of WorldGenerator.assetsByType.entries()) {
      console.log(`  ${type}: ${assets.length} assets`);
    }
  }

  /**
   * Build a dynamic tileset by combining all individual tile images into a single canvas
   */
  private static async buildDynamicTileset(): Promise<void> {
    const assets = WorldGenerator.assetManifest;
    if (assets.length === 0) return;

    // Load all images first
    const images: HTMLImageElement[] = [];
    for (const asset of assets) {
      try {
        const img = await AssetLoader.loadImage(asset.path);
        images.push(img);
        WorldGenerator.tilesetCache.set(asset.path, img);
      } catch (error) {
        console.warn(`Failed to load asset: ${asset.path}`, error);
      }
    }

    if (images.length === 0) {
      console.warn('No images loaded for tileset');
      return;
    }

    // Assume all tiles are 16x16 (based on folder names)
    const tileSize = 16;
    const tilesPerRow = Math.ceil(Math.sqrt(images.length));
    const tilesetWidth = tilesPerRow * tileSize;
    const tilesetHeight = Math.ceil(images.length / tilesPerRow) * tileSize;

    // Create canvas for tileset
    const canvas = document.createElement('canvas');
    canvas.width = tilesetWidth;
    canvas.height = tilesetHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw all tiles onto the canvas
    let tileIndex = 1; // Start at 1 (0 is empty)
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const x = (i % tilesPerRow) * tileSize;
      const y = Math.floor(i / tilesPerRow) * tileSize;
      
      ctx.drawImage(img, x, y, tileSize, tileSize);
      
      // Map asset path to tile ID
      WorldGenerator.tileIndexMap.set(assets[i].path, tileIndex);
      tileIndex++;
    }

    // Convert canvas to image
    const tilesetImg = new Image();
    tilesetImg.src = canvas.toDataURL();
    await new Promise((resolve) => {
      tilesetImg.onload = resolve;
    });

    WorldGenerator.tilesetCanvas = canvas;
    WorldGenerator.tilesetImage = tilesetImg;
    WorldGenerator.tilesetColumns = tilesPerRow;
  }

  /**
   * Generate a random world based on the configuration
   */
  static async generate(config: WorldGeneratorConfig): Promise<Level> {
    // Ensure tileset is built
    if (!WorldGenerator.tilesetImage) {
      throw new Error('WorldGenerator not initialized. Call initialize() first.');
    }

    const { 
      width, 
      height, 
      tileSize, 
      seed, 
      terrainDensity = 0.7, 
      structureDensity = 0.3,
      screenWidth,
      screenHeight,
      roomBased = false
    } = config;

    // If room-based, calculate room dimensions to fit screen
    let roomWidth = width;
    let roomHeight = height;
    if (roomBased && screenWidth && screenHeight) {
      // Calculate how many tiles fit on screen
      roomWidth = Math.floor(screenWidth / tileSize);
      roomHeight = Math.floor(screenHeight / tileSize);
      // Make sure room dimensions are odd numbers for better centering
      if (roomWidth % 2 === 0) roomWidth--;
      if (roomHeight % 2 === 0) roomHeight--;
    }

    // Initialize random seed if provided
    let random = Math.random;
    if (seed !== undefined) {
      // Simple seeded random function
      let seedValue = seed;
      random = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
    }

    const tilemap = new Tilemap(roomWidth, roomHeight, tileSize);
    
    // Add layers
    tilemap.addLayer('background');
    tilemap.addLayer('terrain');
    tilemap.addLayer('structures');

    // Get assets by category
    let terrainAssets = WorldGenerator.getAssetsByCategory([
      'Terrains', 'City_Terrains', 'Grass', 'Water', 'Fence'
    ]);
    let structureAssets = WorldGenerator.getAssetsByCategory([
      'Building', 'Villa', 'Shopping', 'Office', 'School', 
      'Hotel', 'Hospital', 'Police', 'Fire', 'Post_Office', 
      'Military', 'Camping', 'Swimming', 'Garden', 'Graveyard',
      'Subway', 'Train', 'Beach', 'House'
    ]);

    // Fallback: if category filtering doesn't find enough assets, use all assets
    if (terrainAssets.length === 0) {
      console.warn('No terrain assets found, using all assets');
      terrainAssets = WorldGenerator.assetManifest;
    }
    if (structureAssets.length === 0) {
      console.warn('No structure assets found, using all assets');
      structureAssets = WorldGenerator.assetManifest;
    }

    // Generate terrain layer with compatibility checking
    const tileTypeMap: Map<number, TileType> = new Map(); // Maps tile ID to type
    
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        // Border tiles - use walls or fences
        if (x === 0 || x === roomWidth - 1 || y === 0 || y === roomHeight - 1) {
          const borderAssets = WorldGenerator.getAssetsByType(TileType.WALL, TileType.FENCE);
          if (borderAssets.length === 0) {
            // Fallback to any terrain
            const borderAsset = terrainAssets[Math.floor(random() * terrainAssets.length)];
            const tileId = WorldGenerator.tileIndexMap.get(borderAsset.path) || 0;
            if (tileId > 0) {
              tilemap.setTileAt('background', x, y, tileId);
              tileTypeMap.set(tileId, WorldGenerator.assetClassifications.get(borderAsset.path) || TileType.UNKNOWN);
              tilemap.setCollisionAt(x, y, true);
            }
          } else {
            const borderAsset = borderAssets[Math.floor(random() * borderAssets.length)];
            const tileId = WorldGenerator.tileIndexMap.get(borderAsset.path) || 0;
            if (tileId > 0) {
              tilemap.setTileAt('background', x, y, tileId);
              tileTypeMap.set(tileId, WorldGenerator.assetClassifications.get(borderAsset.path) || TileType.UNKNOWN);
              tilemap.setCollisionAt(x, y, true);
            }
          }
          continue;
        }

        // Get compatible tiles based on neighbors
        const compatibleAssets = WorldGenerator.getCompatibleTilesForPosition(
          tilemap, x, y, tileTypeMap, random
        );

        if (compatibleAssets.length > 0 && random() < terrainDensity) {
          const asset = compatibleAssets[Math.floor(random() * compatibleAssets.length)];
          const tileId = WorldGenerator.tileIndexMap.get(asset.path) || 0;
          if (tileId > 0) {
            tilemap.setTileAt('terrain', x, y, tileId);
            tileTypeMap.set(tileId, WorldGenerator.assetClassifications.get(asset.path) || TileType.UNKNOWN);
          }
        }
      }
    }

    // Place structures randomly (on compatible terrain)
    const numStructures = Math.floor(roomWidth * roomHeight * structureDensity * 0.01);
    const structureTypes = [TileType.BUILDING, TileType.STRUCTURE, TileType.PROP, TileType.DECORATION];
    
    for (let i = 0; i < numStructures; i++) {
      const x = Math.floor(random() * (roomWidth - 4)) + 2;
      const y = Math.floor(random() * (roomHeight - 4)) + 2;
      
      // Check if area is clear
      let canPlace = true;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (tilemap.getTileAt('structures', x + dx, y + dy) !== 0) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }

      if (canPlace) {
        // Get the terrain type at this position
        const terrainTileId = tilemap.getTileAt('terrain', x, y);
        const terrainType = terrainTileId > 0 ? tileTypeMap.get(terrainTileId) : TileType.GRASS;
        
        // Get compatible structure assets
        const compatibleStructureAssets = WorldGenerator.getCompatibleStructuresForTerrain(
          terrainType || TileType.GRASS
        );

        if (compatibleStructureAssets.length > 0) {
          const asset = compatibleStructureAssets[Math.floor(random() * compatibleStructureAssets.length)];
          const tileId = WorldGenerator.tileIndexMap.get(asset.path) || 0;
          if (tileId > 0) {
            tilemap.setTileAt('structures', x, y, tileId);
            tileTypeMap.set(tileId, WorldGenerator.assetClassifications.get(asset.path) || TileType.STRUCTURE);
            // Add collision for structures
            tilemap.setCollisionAt(x, y, true);
          }
        }
      }
    }

    // Set up tileset
    tilemap.tileset = {
      name: 'Dynamic World Tileset',
      imagePath: '',
      image: WorldGenerator.tilesetImage,
      tileWidth: 16,
      tileHeight: 16,
      tileCount: WorldGenerator.tileIndexMap.size,
      columns: WorldGenerator.tilesetColumns
    };

    const level = new Level('Random World', tilemap);
    return level;
  }

  /**
   * Get assets filtered by category keywords
   */
  private static getAssetsByCategory(keywords: string[]): WorldAsset[] {
    return WorldGenerator.assetManifest.filter(asset => {
      return keywords.some(keyword => 
        asset.category.toLowerCase().includes(keyword.toLowerCase()) ||
        asset.path.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Get assets by tile type
   */
  private static getAssetsByType(...types: TileType[]): WorldAsset[] {
    const result: WorldAsset[] = [];
    for (const type of types) {
      const assets = WorldGenerator.assetsByType.get(type) || [];
      result.push(...assets);
    }
    return result;
  }

  /**
   * Get compatible tiles for a position based on neighboring tiles
   */
  private static getCompatibleTilesForPosition(
    tilemap: Tilemap,
    x: number,
    y: number,
    tileTypeMap: Map<number, TileType>,
    random: () => number
  ): WorldAsset[] {
    // Get neighbor tile types
    const neighbors: TileType[] = [];
    const neighborPositions = [
      { x: x - 1, y }, // Left
      { x, y: y - 1 }, // Top
      { x: x + 1, y }, // Right
      { x, y: y + 1 }  // Bottom
    ];

    for (const pos of neighborPositions) {
      if (pos.x >= 0 && pos.x < tilemap.width && pos.y >= 0 && pos.y < tilemap.height) {
        const tileId = tilemap.getTileAt('terrain', pos.x, pos.y) || 
                      tilemap.getTileAt('background', pos.x, pos.y);
        if (tileId > 0) {
          const tileType = tileTypeMap.get(tileId);
          if (tileType) {
            neighbors.push(tileType);
          }
        }
      }
    }

    // If we have neighbors, find compatible tiles
    if (neighbors.length > 0) {
      // Find the most common neighbor type
      const typeCounts = new Map<TileType, number>();
      for (const type of neighbors) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
      
      let mostCommonType = neighbors[0];
      let maxCount = 0;
      for (const [type, count] of typeCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonType = type;
        }
      }

      // Get compatible assets for the most common neighbor type
      const compatibleAssets = WorldGenerator.getAssetsByType(mostCommonType);
      
      // Also include assets compatible with the neighbor type
      const compatibleTypes = TileClassifier.compatibilityRules.get(mostCommonType) || [];
      for (const compatibleType of compatibleTypes) {
        const additionalAssets = WorldGenerator.getAssetsByType(compatibleType);
        compatibleAssets.push(...additionalAssets);
      }

      return compatibleAssets.length > 0 ? compatibleAssets : WorldGenerator.getAssetsByType(TileType.GRASS);
    }

    // No neighbors - use base terrain types (grass, sand, pavement)
    return WorldGenerator.getAssetsByType(TileType.GRASS, TileType.SAND, TileType.PAVEMENT);
  }

  /**
   * Get compatible structures for a terrain type
   */
  private static getCompatibleStructuresForTerrain(terrainType: TileType): WorldAsset[] {
    // Structures can be placed on grass, pavement, sand
    if (terrainType === TileType.GRASS) {
      return WorldGenerator.getAssetsByType(
        TileType.BUILDING, 
        TileType.STRUCTURE, 
        TileType.PROP, 
        TileType.DECORATION
      );
    } else if (terrainType === TileType.PAVEMENT || terrainType === TileType.ROAD) {
      return WorldGenerator.getAssetsByType(
        TileType.BUILDING, 
        TileType.STRUCTURE, 
        TileType.VEHICLE,
        TileType.PROP
      );
    } else if (terrainType === TileType.SAND) {
      return WorldGenerator.getAssetsByType(
        TileType.PROP, 
        TileType.DECORATION
      );
    }
    
    // Default: allow props and decorations
    return WorldGenerator.getAssetsByType(TileType.PROP, TileType.DECORATION);
  }

  /**
   * Get all available asset categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    WorldGenerator.assetManifest.forEach(asset => {
      categories.add(asset.category);
    });
    return Array.from(categories);
  }

  /**
   * Get asset count
   */
  static getAssetCount(): number {
    return WorldGenerator.assetManifest.length;
  }
}

