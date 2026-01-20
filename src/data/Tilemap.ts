export interface TileLayer {
  name: string;
  data: number[];
  visible: boolean;
  opacity: number;
}

export class Tilemap {
  public width: number;
  public height: number;
  public tileSize: number;
  public layers: TileLayer[];
  public tilesetImage: string;
  public tilesetColumns: number;
  public tilesetRows: number;

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
  }

  addLayer(name: string, data?: number[]): TileLayer {
    const layer: TileLayer = {
      name,
      data: data || new Array(this.width * this.height).fill(0),
      visible: true,
      opacity: 1
    };
    this.layers.push(layer);
    return layer;
  }

  getLayer(name: string): TileLayer | null {
    return this.layers.find((l) => l.name === name) || null;
  }

  getTile(layerName: string, x: number, y: number): number {
    const layer = this.getLayer(layerName);
    if (!layer) return 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return layer.data[y * this.width + x] || 0;
  }

  setTile(layerName: string, x: number, y: number, tileId: number): void {
    const layer = this.getLayer(layerName);
    if (!layer) return;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    layer.data[y * this.width + x] = tileId;
  }

  toJSON(): any {
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      tilesetImage: this.tilesetImage,
      tilesetColumns: this.tilesetColumns,
      tilesetRows: this.tilesetRows,
      layers: this.layers
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
    tilemap.layers = data.layers || [];
    return tilemap;
  }
}

