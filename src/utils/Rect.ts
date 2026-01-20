import { Vector2 } from './Vector2';

export class Rect {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0
  ) {}

  static fromPositionAndSize(position: Vector2, size: Vector2): Rect {
    return new Rect(position.x, position.y, size.x, size.y);
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

  containsRect(other: Rect): boolean {
    return (
      this.x <= other.x &&
      this.right >= other.right &&
      this.y <= other.y &&
      this.bottom >= other.bottom
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

  getIntersection(other: Rect): Rect | null {
    if (!this.intersects(other)) return null;

    const left = Math.max(this.x, other.x);
    const top = Math.max(this.y, other.y);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);

    return new Rect(left, top, right - left, bottom - top);
  }

  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  toString(): string {
    return `Rect(${this.x}, ${this.y}, ${this.width}, ${this.height})`;
  }
}

