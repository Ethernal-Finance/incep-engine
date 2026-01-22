import { Tilemap } from './Tilemap';

export interface LevelEntity {
  type: string;
  id: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export interface LevelDoor {
  x: number;
  y: number;
  targetLevel: string;
}

export class Level {
  public version: string;
  public name: string;
  public tilemap: Tilemap;
  public entities: LevelEntity[];
  public spawnPoint: { x: number; y: number } | null;
  public doors: LevelDoor[];
  public backgroundSound: string | null;

  constructor(name: string = 'Level 1', version: string = '1.0') {
    this.version = version;
    this.name = name;
    // 50x50 grid to build full maps with tileset assets
    this.tilemap = new Tilemap(50, 50, 32);
    this.entities = [];
    this.spawnPoint = null;
    this.doors = [];
    this.backgroundSound = null;
  }

  addEntity(entity: LevelEntity): void {
    this.entities.push(entity);
  }

  removeEntity(id: string): void {
    this.entities = this.entities.filter((e) => e.id !== id);
  }

  getDoorAt(x: number, y: number): LevelDoor | null {
    return this.doors.find((door) => door.x === x && door.y === y) || null;
  }

  upsertDoor(door: LevelDoor): void {
    const existingIndex = this.doors.findIndex((d) => d.x === door.x && d.y === door.y);
    if (existingIndex >= 0) {
      this.doors[existingIndex] = door;
    } else {
      this.doors.push(door);
    }
  }

  removeDoorAt(x: number, y: number): void {
    this.doors = this.doors.filter((door) => door.x !== x || door.y !== y);
  }

  toJSON(): any {
    const doors = this.doors.filter((door) => this.tilemap.getTile('Doors', door.x, door.y) !== 0);
    this.doors = doors;
    return {
      version: this.version,
      name: this.name,
      tilemap: this.tilemap.toJSON(),
      entities: this.entities,
      spawnPoint: this.spawnPoint,
      doors,
      backgroundSound: this.backgroundSound
    };
  }

  static fromJSON(data: any): Level {
    const level = new Level(data.name, data.version);
    level.tilemap = Tilemap.fromJSON(data.tilemap);
    level.entities = data.entities || [];
    level.spawnPoint = data.spawnPoint || null;
    level.doors = data.doors || [];
    level.backgroundSound = data.backgroundSound || null;
    return level;
  }
}
