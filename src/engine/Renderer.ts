import { Vector2 } from '../utils/Vector2';
import { Rect } from '../utils/Rect';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraPosition: Vector2 = Vector2.zero();
  private cameraZoom: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Also resize when the canvas size changes (e.g., due to CSS)
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(canvas);
  }

  private resize(): void {
    // Use the canvas's display size (from CSS) for the internal resolution
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width || window.innerWidth;
    this.canvas.height = rect.height || window.innerHeight;
  }

  clear(color: string = '#000000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setCamera(position: Vector2, zoom: number = 1): void {
    this.cameraPosition = position;
    this.cameraZoom = zoom;
  }

  getCameraPosition(): Vector2 {
    return this.cameraPosition.clone();
  }

  getCameraZoom(): number {
    return this.cameraZoom;
  }

  worldToScreen(worldPos: Vector2): Vector2 {
    const screenX = (worldPos.x - this.cameraPosition.x) * this.cameraZoom + this.canvas.width / 2;
    const screenY = (worldPos.y - this.cameraPosition.y) * this.cameraZoom + this.canvas.height / 2;
    return new Vector2(screenX, screenY);
  }

  screenToWorld(screenPos: Vector2): Vector2 {
    const worldX = (screenPos.x - this.canvas.width / 2) / this.cameraZoom + this.cameraPosition.x;
    const worldY = (screenPos.y - this.canvas.height / 2) / this.cameraZoom + this.cameraPosition.y;
    return new Vector2(worldX, worldY);
  }

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }

  scale(x: number, y: number): void {
    this.ctx.scale(x, y);
  }

  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }

  drawImage(
    image: HTMLImageElement,
    x: number,
    y: number,
    width?: number,
    height?: number,
    sx?: number,
    sy?: number,
    sWidth?: number,
    sHeight?: number
  ): void {
    if (sx !== undefined && sy !== undefined && sWidth !== undefined && sHeight !== undefined) {
      // Draw from sprite sheet
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height);
      } else {
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, sWidth, sHeight);
      }
    } else {
      // Draw full image
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(image, x, y, width, height);
      } else {
        this.ctx.drawImage(image, x, y);
      }
    }
  }

  fillRect(x: number, y: number, width: number, height: number, color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
    }
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number, color?: string, lineWidth?: number): void {
    this.save();
    if (color) {
      this.ctx.strokeStyle = color;
    }
    if (lineWidth !== undefined) {
      this.ctx.lineWidth = lineWidth;
    }
    this.ctx.strokeRect(x, y, width, height);
    this.restore();
  }

  fillCircle(x: number, y: number, radius: number, color?: string): void {
    this.save();
    if (color) {
      this.ctx.fillStyle = color;
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.restore();
  }

  strokeCircle(x: number, y: number, radius: number, color?: string, lineWidth?: number): void {
    this.save();
    if (color) {
      this.ctx.strokeStyle = color;
    }
    if (lineWidth !== undefined) {
      this.ctx.lineWidth = lineWidth;
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.restore();
  }

  drawText(text: string, x: number, y: number, color?: string, fontSize?: string, fontFamily?: string): void {
    this.save();
    if (color) {
      this.ctx.fillStyle = color;
    }
    if (fontSize || fontFamily) {
      this.ctx.font = `${fontSize || '16px'} ${fontFamily || 'Arial'}`;
    }
    this.ctx.fillText(text, x, y);
    this.restore();
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getWidth(): number {
    return this.canvas.width;
  }

  getHeight(): number {
    return this.canvas.height;
  }
}

