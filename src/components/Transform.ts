import { Vector2 } from '../utils/Vector2';

export class Transform {
  public position: Vector2;
  public rotation: number;
  public scale: Vector2;

  constructor(x: number = 0, y: number = 0, rotation: number = 0, scaleX: number = 1, scaleY: number = 1) {
    this.position = new Vector2(x, y);
    this.rotation = rotation;
    this.scale = new Vector2(scaleX, scaleY);
  }

  copy(): Transform {
    return new Transform(
      this.position.x,
      this.position.y,
      this.rotation,
      this.scale.x,
      this.scale.y
    );
  }
}

