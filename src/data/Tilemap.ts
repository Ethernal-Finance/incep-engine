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

  getLayer(name: string): TileLayer | null {
    return this.layers.find((l) => l.name === name) || null;
  }

  getTile(layerName: string, x: number, y: number): number {
    const layer = this.getLayer(layerName);
    if (!layer) return 0;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return layer.data[y * this.width + x] || 0;
  }

  setTile(layerName: string, x: number, y: number, tileId: number, tilesetName?: string | null): void {
    const layer = this.getLayer(layerName);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Tilemap.ts:58',message:'setTile called',data:{layerName,x,y,tileId,hasLayer:!!layer,width:this.width,height:this.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Tilemap.ts:62',message:'Tile data updated',data:{layerName,x,y,tileId,index,actualValue:layer.data[index]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
      return {
        ...layer,
        tilesetData
      };
    });
    tilemap.collisionData = data.collisionData || new Array(data.width * data.height).fill(false);
    return tilemap;
  }
}

