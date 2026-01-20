import { Component } from './Component';
import { Vector2 } from '../utils/Vector2';

export class Movement extends Component {
  public velocity: Vector2 = Vector2.zero();
  public speed: number = 100;
  public acceleration: number = 500;
  public friction: number = 0.9;
  public maxSpeed: number = 200;
  public direction: Vector2 = Vector2.zero();

  clone(): Movement {
    const movement = new Movement();
    movement.velocity = this.velocity.clone();
    movement.speed = this.speed;
    movement.acceleration = this.acceleration;
    movement.friction = this.friction;
    movement.maxSpeed = this.maxSpeed;
    movement.direction = this.direction.clone();
    return movement;
  }
}

