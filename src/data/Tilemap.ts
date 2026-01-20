export interface TilemapLayer {
  name: string;
  data: number[];
  visible: boolean;
  opacity: number;
}

export interface Tileset {
  name: string;
  imagePath: string;
  image?: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  tileCount: number;
  columns: number;
}

export class Tilemap {
  public width: number;
  public height: number;
  public tileSize: number;
  public layers: TilemapLayer[] = [];
  public tileset: Tileset | null = null;
  public collisionLayer: number[] = []; // 1 = solid, 0 = passable

  constructor(width: number, height: number, tileSize: number = 32) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
  }

  addLayer(name: string, data?: number[]): TilemapLayer {
    const layer: TilemapLayer = {
      name,
      data: data || new Array(this.width * this.height).fill(0),
      visible: true,
      opacity: 1
    };
    this.layers.push(layer);
    return layer;
  }

  getLayer(name: string): TilemapLayer | undefined {
    return this.layers.find(l => l.name === name);
  }

  getTileAt(layerName: string, x: number, y: number): number {
    const layer = this.getLayer(layerName);
    if (!layer) return 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return layer.data[y * this.width + x] || 0;
  }

  setTileAt(layerName: string, x: number, y: number, tileId: number): void {
    const layer = this.getLayer(layerName);
    if (!layer) return;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    layer.data[y * this.width + x] = tileId;
  }

  isCollisionAt(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    const index = y * this.width + x;
    // Initialize collision layer if needed
    if (this.collisionLayer.length === 0) {
      this.collisionLayer = new Array(this.width * this.height).fill(0);
    }
    return this.collisionLayer[index] === 1;
  }

  setCollisionAt(x: number, y: number, solid: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = y * this.width + x;
    this.collisionLayer[index] = solid ? 1 : 0;
  }

  worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }

  tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * this.tileSize,
      y: tileY * this.tileSize
    };
  }

  getWorldWidth(): number {
    return this.width * this.tileSize;
  }

  getWorldHeight(): number {
    return this.height * this.tileSize;
  }
}

