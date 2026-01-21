export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = context;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  clear(color: string = '#000000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getWidth(): number {
    return this.canvas.width;
  }

  getHeight(): number {
    return this.canvas.height;
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
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height);
      } else {
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, sWidth, sHeight);
      }
    } else {
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(image, x, y, width, height);
      } else {
        this.ctx.drawImage(image, x, y);
      }
    }
  }

  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  fillText(text: string, x: number, y: number, color: string, font: string = '16px Arial'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number, color: string, font: string = '16px Arial'): void {
    this.ctx.strokeStyle = color;
    this.ctx.font = font;
    this.ctx.strokeText(text, x, y);
  }
}

