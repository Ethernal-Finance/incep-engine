import { AssetLoader } from '../../engine/AssetLoader';

export interface TilesetInfo {
  name: string;
  path: string;
  tileSize: number;
  columns: number;
  rows: number;
}

export class AssetManager {
  private onTilesetLoaded?: (tilesetName: string, info: TilesetInfo) => void;
  private availableTilesets: TilesetInfo[] = [];

  constructor() {
    this.scanAssetsFolder();
  }

  private async scanAssetsFolder(): Promise<void> {
    // Pre-defined tilesets in the assets folder
    const tilesets = [
      {
        name: 'Modern Exteriors Complete Tileset',
        path: '/assets/Modern_Exteriors_Complete_Tileset.png',
        tileSize: 32, // Common tile size, will be auto-detected
        columns: 0, // Will be calculated
        rows: 0 // Will be calculated
      }
    ];

    // Load each tileset
    for (const tileset of tilesets) {
      try {
        await this.loadTilesetFromPath(tileset.path, tileset.name, tileset.tileSize);
      } catch (error) {
        console.warn(`Failed to load tileset ${tileset.name}:`, error);
      }
    }
  }

  async loadTilesetFromPath(path: string, name: string, defaultTileSize: number = 32): Promise<TilesetInfo> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        
        let tileSize = defaultTileSize;
        let columns = 0;
        let rows = 0;

        // Try to detect tile size
        if (width % 16 === 0 && height % 16 === 0) {
          tileSize = 16;
          columns = width / 16;
          rows = height / 16;
        } else if (width % 32 === 0 && height % 32 === 0) {
          tileSize = 32;
          columns = width / 32;
          rows = height / 32;
        } else if (width % 64 === 0 && height % 64 === 0) {
          tileSize = 64;
          columns = width / 64;
          rows = height / 64;
        } else {
          // Use default and calculate
          tileSize = defaultTileSize;
          columns = Math.floor(width / defaultTileSize);
          rows = Math.floor(height / defaultTileSize);
        }

        const tilesetName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        AssetLoader.images.set(tilesetName, img);

        const info: TilesetInfo = {
          name,
          path: tilesetName,
          tileSize,
          columns,
          rows
        };

        this.availableTilesets.push(info);

        if (this.onTilesetLoaded) {
          this.onTilesetLoaded(tilesetName, info);
        }

        resolve(info);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
      img.src = path;
    });
  }

  getAvailableTilesets(): TilesetInfo[] {
    return this.availableTilesets;
  }

  async loadTilesetFromFile(file: File): Promise<TilesetInfo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Auto-detect tile size (assume square tiles)
          // Try common sizes: 16, 32, 64
          const width = img.width;
          const height = img.height;
          
          let tileSize = 32;
          let columns = 8;
          let rows = 8;

          // Try to detect tile size
          if (width % 16 === 0 && height % 16 === 0) {
            tileSize = 16;
            columns = width / 16;
            rows = height / 16;
          } else if (width % 32 === 0 && height % 32 === 0) {
            tileSize = 32;
            columns = width / 32;
            rows = height / 32;
          } else if (width % 64 === 0 && height % 64 === 0) {
            tileSize = 64;
            columns = width / 64;
            rows = height / 64;
          } else {
            // Default to 32px tiles
            columns = Math.floor(width / 32);
            rows = Math.floor(height / 32);
          }

          const tilesetName = `tileset-${Date.now()}`;
          AssetLoader.images.set(tilesetName, img);

          const info: TilesetInfo = {
            name: file.name.replace(/\.[^/.]+$/, ''),
            path: tilesetName,
            tileSize,
            columns,
            rows
          };

          if (this.onTilesetLoaded) {
            this.onTilesetLoaded(tilesetName, info);
          }

          resolve(info);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  setOnTilesetLoaded(callback: (tilesetName: string, info: TilesetInfo) => void): void {
    this.onTilesetLoaded = callback;
  }
}

