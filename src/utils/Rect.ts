import { Vector2 } from './Vector2';

export class Rect {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0
  ) {}

  static fromCenter(center: Vector2, width: number, height: number): Rect {
    return new Rect(
      center.x - width / 2,
      center.y - height / 2,
      width,
      height
    );
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  get center(): Vector2 {
    return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
  }

  get position(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  get size(): Vector2 {
    return new Vector2(this.width, this.height);
  }

  contains(point: Vector2): boolean {
    return (
      point.x >= this.x &&
      point.x <= this.right &&
      point.y >= this.y &&
      point.y <= this.bottom
    );
  }

  intersects(other: Rect): boolean {
    return !(
      this.right < other.x ||
      this.x > other.right ||
      this.bottom < other.y ||
      this.y > other.bottom
    );
  }

  copy(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  containsPoint(point: Vector2): boolean {
    return this.contains(point);
  }

  static fromPoints(p1: Vector2, p2: Vector2): Rect {
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxX = Math.max(p1.x, p2.x);
    const maxY = Math.max(p1.y, p2.y);
    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }
}

