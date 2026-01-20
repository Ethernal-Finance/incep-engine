import { Component } from './Component';
import { Rect } from '../utils/Rect';
import { Vector2 } from '../utils/Vector2';

export enum CollisionLayer {
  None = 0,
  Solid = 1,
  Trigger = 2,
  Player = 4,
  Enemy = 8,
  Item = 16,
  NPC = 32
}

export class Collider extends Component {
  public bounds: Rect;
  public layer: CollisionLayer = CollisionLayer.Solid;
  public isTrigger: boolean = false;
  public offset: Vector2 = Vector2.zero();
  public onCollisionEnter?: (other: Collider) => void;
  public onCollisionExit?: (other: Collider) => void;
  public onCollisionStay?: (other: Collider) => void;

  constructor(width: number = 0, height: number = 0, x: number = 0, y: number = 0) {
    super();
    this.bounds = new Rect(x, y, width, height);
  }

  getWorldBounds(transform: Vector2): Rect {
    return new Rect(
      transform.x + this.offset.x + this.bounds.x,
      transform.y + this.offset.y + this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );
  }

  clone(): Collider {
    const collider = new Collider(this.bounds.width, this.bounds.height, this.bounds.x, this.bounds.y);
    collider.layer = this.layer;
    collider.isTrigger = this.isTrigger;
    collider.offset = this.offset.clone();
    return collider;
  }
}

