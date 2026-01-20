import { Vector2 } from '../utils/Vector2';
import { MathUtils } from '../utils/Math';
import { Transform } from '../components/Transform';

export class Camera {
  public position: Vector2;
  public target: Vector2 | null = null;
  public zoom: number = 1;
  public smoothness: number = 0.1;
  public bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  constructor(x: number = 0, y: number = 0) {
    this.position = new Vector2(x, y);
  }

  setTarget(target: Vector2 | Transform): void {
    if (target instanceof Transform) {
      this.target = target.position.copy();
    } else {
      this.target = target.copy();
    }
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.bounds = { minX, minY, maxX, maxY };
  }

  update(deltaTime: number, viewportWidth: number, viewportHeight: number): void {
    if (this.target) {
      const targetX = this.target.x - viewportWidth / 2 / this.zoom;
      const targetY = this.target.y - viewportHeight / 2 / this.zoom;

      // Smooth follow
      const lerpFactor = 1 - Math.pow(1 - this.smoothness, deltaTime * 60);
      this.position.x = MathUtils.lerp(this.position.x, targetX, lerpFactor);
      this.position.y = MathUtils.lerp(this.position.y, targetY, lerpFactor);
    }

    // Apply bounds
    if (this.bounds) {
      const halfWidth = viewportWidth / 2 / this.zoom;
      const halfHeight = viewportHeight / 2 / this.zoom;

      this.position.x = MathUtils.clamp(
        this.position.x,
        this.bounds.minX,
        this.bounds.maxX - viewportWidth / this.zoom
      );
      this.position.y = MathUtils.clamp(
        this.position.y,
        this.bounds.minY,
        this.bounds.maxY - viewportHeight / this.zoom
      );
    }
  }

  worldToScreen(worldPos: Vector2, viewportWidth: number, viewportHeight: number): Vector2 {
    const screenX = (worldPos.x - this.position.x) * this.zoom + viewportWidth / 2;
    const screenY = (worldPos.y - this.position.y) * this.zoom + viewportHeight / 2;
    return new Vector2(screenX, screenY);
  }

  screenToWorld(screenPos: Vector2, viewportWidth: number, viewportHeight: number): Vector2 {
    const worldX = (screenPos.x - viewportWidth / 2) / this.zoom + this.position.x;
    const worldY = (screenPos.y - viewportHeight / 2) / this.zoom + this.position.y;
    return new Vector2(worldX, worldY);
  }
}

export class CameraSystem {
  public camera: Camera;

  constructor() {
    this.camera = new Camera();
  }

  update(deltaTime: number, viewportWidth: number, viewportHeight: number): void {
    this.camera.update(deltaTime, viewportWidth, viewportHeight);
  }
}

