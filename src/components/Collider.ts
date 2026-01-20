import { Rect } from '../utils/Rect';
import { Vector2 } from '../utils/Vector2';

export enum CollisionLayer {
  None = 0,
  Solid = 1,
  Trigger = 2,
  Player = 4,
  Enemy = 8,
  Item = 16
}

export class Collider {
  public bounds: Rect;
  public layer: CollisionLayer;
  public isTrigger: boolean;
  public onCollision?: (other: Collider) => void;

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 32,
    height: number = 32,
    layer: CollisionLayer = CollisionLayer.Solid,
    isTrigger: boolean = false
  ) {
    this.bounds = new Rect(x, y, width, height);
    this.layer = layer;
    this.isTrigger = isTrigger;
  }

  getPosition(): Vector2 {
    return this.bounds.position;
  }

  setPosition(x: number, y: number): void {
    this.bounds.x = x;
    this.bounds.y = y;
  }
}

