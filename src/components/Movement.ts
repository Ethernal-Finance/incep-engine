import { Vector2 } from '../utils/Vector2';

export class Movement {
  public velocity: Vector2;
  public speed: number;
  public acceleration: number;
  public friction: number;
  public maxSpeed: number;

  constructor(speed: number = 100, maxSpeed: number = 200, acceleration: number = 500, friction: number = 0.8) {
    this.velocity = new Vector2(0, 0);
    this.speed = speed;
    this.maxSpeed = maxSpeed;
    this.acceleration = acceleration;
    this.friction = friction;
  }
}

