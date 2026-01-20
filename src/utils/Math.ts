export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  static sign(value: number): number {
    return value < 0 ? -1 : value > 0 ? 1 : 0;
  }

  static floor(value: number): number {
    return Math.floor(value);
  }

  static ceil(value: number): number {
    return Math.ceil(value);
  }

  static round(value: number): number {
    return Math.round(value);
  }

  static abs(value: number): number {
    return Math.abs(value);
  }

  static min(a: number, b: number): number {
    return Math.min(a, b);
  }

  static max(a: number, b: number): number {
    return Math.max(a, b);
  }

  static random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

