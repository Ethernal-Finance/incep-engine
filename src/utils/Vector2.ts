export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  static add(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static subtract(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static multiply(v: Vector2, scalar: number): Vector2 {
    return new Vector2(v.x * scalar, v.y * scalar);
  }

  static divide(v: Vector2, scalar: number): Vector2 {
    return new Vector2(v.x / scalar, v.y / scalar);
  }

  static distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distanceSquared(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  static normalize(v: Vector2): Vector2 {
    const mag = v.magnitude();
    if (mag === 0) return new Vector2(0, 0);
    return new Vector2(v.x / mag, v.y / mag);
  }

  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  add(other: Vector2): Vector2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  subtract(other: Vector2): Vector2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  multiply(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  divide(scalar: number): Vector2 {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return this;
    this.x /= mag;
    this.y /= mag;
    return this;
  }

  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

