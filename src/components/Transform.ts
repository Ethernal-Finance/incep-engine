import { Component } from './Component';
import { Vector2 } from '../utils/Vector2';

export class Transform extends Component {
  public position: Vector2;
  public rotation: number = 0;
  public scale: Vector2;

  constructor(x: number = 0, y: number = 0, scaleX: number = 1, scaleY: number = 1) {
    super();
    this.position = new Vector2(x, y);
    this.scale = new Vector2(scaleX, scaleY);
  }

  clone(): Transform {
    const transform = new Transform(this.position.x, this.position.y, this.scale.x, this.scale.y);
    transform.rotation = this.rotation;
    return transform;
  }
}

