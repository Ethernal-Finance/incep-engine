import { Tilemap } from './Tilemap';

export interface LevelEntity {
  type: string;
  id: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export class Level {
  public version: string;
  public name: string;
  public tilemap: Tilemap;
  public entities: LevelEntity[];

  constructor(name: string = 'Level 1', version: string = '1.0') {
    this.version = version;
    this.name = name;
    // 50x50 grid to build full maps with tileset assets
    this.tilemap = new Tilemap(50, 50, 32);
    this.entities = [];
  }

  addEntity(entity: LevelEntity): void {
    this.entities.push(entity);
  }

  removeEntity(id: string): void {
    this.entities = this.entities.filter((e) => e.id !== id);
  }

  toJSON(): any {
    return {
      version: this.version,
      name: this.name,
      tilemap: this.tilemap.toJSON(),
      entities: this.entities
    };
  }

  static fromJSON(data: any): Level {
    const level = new Level(data.name, data.version);
    level.tilemap = Tilemap.fromJSON(data.tilemap);
    level.entities = data.entities || [];
    return level;
  }
}
