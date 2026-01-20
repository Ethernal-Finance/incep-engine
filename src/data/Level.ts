import { Tilemap, TilemapLayer, Tileset } from './Tilemap';

export interface EntityData {
  type: string;
  x: number;
  y: number;
  [key: string]: any;
}

export interface LevelData {
  version: string;
  name: string;
  tilemap: {
    width: number;
    height: number;
    tileSize: number;
    layers: TilemapLayer[];
    collisionLayer: number[];
    tileset?: {
      name: string;
      imagePath: string;
      tileWidth: number;
      tileHeight: number;
      tileCount: number;
      columns: number;
    };
  };
  entities: EntityData[];
}

export class Level {
  public name: string;
  public tilemap: Tilemap;
  public entities: EntityData[] = [];

  constructor(name: string, tilemap: Tilemap) {
    this.name = name;
    this.tilemap = tilemap;
  }

  static fromJSON(data: LevelData): Level {
    const tilemap = new Tilemap(
      data.tilemap.width,
      data.tilemap.height,
      data.tilemap.tileSize
    );

    // Restore layers
    data.tilemap.layers.forEach(layerData => {
      tilemap.addLayer(layerData.name, layerData.data);
      const layer = tilemap.getLayer(layerData.name);
      if (layer) {
        layer.visible = layerData.visible;
        layer.opacity = layerData.opacity;
      }
    });

    // Restore collision layer
    tilemap.collisionLayer = data.tilemap.collisionLayer || [];

    // Restore tileset
    if (data.tilemap.tileset) {
      tilemap.tileset = {
        name: data.tilemap.tileset.name,
        imagePath: data.tilemap.tileset.imagePath,
        tileWidth: data.tilemap.tileset.tileWidth,
        tileHeight: data.tilemap.tileset.tileHeight,
        tileCount: data.tilemap.tileset.tileCount,
        columns: data.tilemap.tileset.columns
      } as Tileset;
    }

    const level = new Level(data.name, tilemap);
    level.entities = data.entities || [];
    return level;
  }

  toJSON(): LevelData {
    return {
      version: '1.0',
      name: this.name,
      tilemap: {
        width: this.tilemap.width,
        height: this.tilemap.height,
        tileSize: this.tilemap.tileSize,
        layers: this.tilemap.layers,
        collisionLayer: this.tilemap.collisionLayer,
        tileset: this.tilemap.tileset ? {
          name: this.tilemap.tileset.name,
          imagePath: this.tilemap.tileset.imagePath,
          tileWidth: this.tilemap.tileset.tileWidth,
          tileHeight: this.tilemap.tileset.tileHeight,
          tileCount: this.tilemap.tileset.tileCount,
          columns: this.tilemap.tileset.columns
        } : undefined
      },
      entities: this.entities
    };
  }
}

