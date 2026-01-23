export interface TileLayer {
  name: string;
  data: number[];
  visible: boolean;
  opacity: number;
  tilesetData?: string[];
}

export class Tilemap {
  public width: number;
  public height: number;
  public tileSize: number;
  public layers: TileLayer[];
  public tilesetImage: string;
  public tilesetColumns: number;
  public tilesetRows: number;
  public collisionData: boolean[]; // Collision data for each tile position

  constructor(
    width: number,
    height: number,
    tileSize: number = 32,
    tilesetImage: string = '',
    tilesetColumns: number = 0,
    tilesetRows: number = 0
  ) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.tilesetImage = tilesetImage;
    this.tilesetColumns = tilesetColumns;
    this.tilesetRows = tilesetRows;
    this.layers = [];
    this.collisionData = new Array(width * height).fill(false);
  }

  addLayer(name: string, data?: number[]): TileLayer {
    const layer: TileLayer = {
      name,
      data: data || new Array(this.width * this.height).fill(0),
      visible: true,
      opacity: 1,
      tilesetData: new Array(this.width * this.height).fill('')
    };
    this.layers.push(layer);
    return layer;
  }

  getLayerByIndex(index: number): TileLayer | null {
    if (index < 0 || index >= this.layers.length) return null;
    return this.layers[index];
  }

  getLayer(name: string): TileLayer | null {
    return this.layers.find((l) => l.name === name) || null;
  }

  getTileByIndex(layerIndex: number, x: number, y: number): number {
    const layer = this.getLayerByIndex(layerIndex);
    if (!layer) return 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return layer.data[y * this.width + x] || 0;
  }

  getTile(layerName: string, x: number, y: number): number {
    const layer = this.getLayer(layerName);
    if (!layer) return 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return layer.data[y * this.width + x] || 0;
  }

  setTileByIndex(layerIndex: number, x: number, y: number, tileId: number, tilesetName?: string | null): void {
    const layer = this.getLayerByIndex(layerIndex);
    if (!layer) return;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = y * this.width + x;
    layer.data[index] = tileId;
    if (!layer.tilesetData && (tilesetName || tileId === 0)) {
      layer.tilesetData = new Array(this.width * this.height).fill('');
    }
    if (layer.tilesetData) {
      if (tileId === 0) {
        layer.tilesetData[index] = '';
      } else if (tilesetName) {
        layer.tilesetData[index] = tilesetName;
      }
    }
  }

  setTile(layerName: string, x: number, y: number, tileId: number, tilesetName?: string | null): void {
    const layerIndex = this.layers.findIndex((layer) => layer.name === layerName);
    if (layerIndex === -1) return;
    this.setTileByIndex(layerIndex, x, y, tileId, tilesetName);
  }

  getTileTilesetByIndex(layerIndex: number, x: number, y: number): string | null {
    const layer = this.getLayerByIndex(layerIndex);
    if (!layer || !layer.tilesetData) return null;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const tilesetName = layer.tilesetData[y * this.width + x];
    return tilesetName ? tilesetName : null;
  }

  getTileTileset(layerName: string, x: number, y: number): string | null {
    const layer = this.getLayer(layerName);
    if (!layer || !layer.tilesetData) return null;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const tilesetName = layer.tilesetData[y * this.width + x];
    return tilesetName ? tilesetName : null;
  }

  setCollision(x: number, y: number, hasCollision: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.collisionData[y * this.width + x] = hasCollision;
  }

  getCollision(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.collisionData[y * this.width + x];
  }

  toJSON(): any {
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      tilesetImage: this.tilesetImage,
      tilesetColumns: this.tilesetColumns,
      tilesetRows: this.tilesetRows,
      layers: this.layers,
      collisionData: this.collisionData
    };
  }

  static fromJSON(data: any): Tilemap {
    const tilemap = new Tilemap(
      data.width,
      data.height,
      data.tileSize,
      data.tilesetImage,
      data.tilesetColumns,
      data.tilesetRows
    );
    const rawLayers = data.layers || [];
    tilemap.layers = rawLayers.map((layer: TileLayer) => {
      const tilesetData = Array.isArray(layer.tilesetData)
        ? layer.tilesetData.slice(0, data.width * data.height)
        : undefined;
      if (tilesetData && tilesetData.length < data.width * data.height) {
        tilesetData.push(...new Array(data.width * data.height - tilesetData.length).fill(''));
      }
      const visible = typeof layer.visible === 'boolean' ? layer.visible : true;
      const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
      return {
        ...layer,
        tilesetData,
        visible,
        opacity
      };
    });
    tilemap.collisionData = data.collisionData || new Array(data.width * data.height).fill(false);
    return tilemap;
  }
}

