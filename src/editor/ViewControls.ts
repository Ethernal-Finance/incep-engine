import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../engine/Renderer';

export interface ViewSettings {
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapToTileGrid: boolean;
  angleSnap: boolean;
  angleSnapDegrees: number;
  showRulers: boolean;
  showMinimap: boolean;
  layoutBoundary: { x: number; y: number; width: number; height: number };
}

export class ViewControls {
  private settings: ViewSettings;
  private targetZoom: number = 1;
  private currentZoom: number = 1;
  private zoomSmoothing: number = 0.15;
  private spacePanning: boolean = false;
  private spacePanStart: Vector2 = new Vector2();

  constructor() {
    this.settings = {
      showGrid: true,
      gridSize: 32,
      snapToGrid: false,
      snapToObjects: false,
      snapToTileGrid: true,
      angleSnap: false,
      angleSnapDegrees: 15,
      showRulers: true,
      showMinimap: false,
      layoutBoundary: { x: 0, y: 0, width: 1600, height: 1200 }
    };
  }

  getSettings(): ViewSettings {
    return this.settings;
  }

  setShowGrid(show: boolean): void {
    this.settings.showGrid = show;
  }

  setGridSize(size: number): void {
    this.settings.gridSize = size;
  }

  setSnapToGrid(snap: boolean): void {
    this.settings.snapToGrid = snap;
  }

  setSnapToTileGrid(snap: boolean): void {
    this.settings.snapToTileGrid = snap;
  }

  setAngleSnap(snap: boolean): void {
    this.settings.angleSnap = snap;
  }

  setShowRulers(show: boolean): void {
    this.settings.showRulers = show;
  }

  setShowMinimap(show: boolean): void {
    this.settings.showMinimap = show;
  }

  setLayoutBoundary(boundary: { x: number; y: number; width: number; height: number }): void {
    this.settings.layoutBoundary = boundary;
  }

  // Zoom centered on mouse cursor
  zoomAtPoint(currentZoom: number, delta: number, mousePos: Vector2, viewportWidth: number, viewportHeight: number, gridOffset: Vector2): { newZoom: number; newOffset: Vector2 } {
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, currentZoom * zoomFactor));
    
    // Calculate world position under mouse before zoom
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const worldX = (mousePos.x - centerX) / currentZoom - gridOffset.x;
    const worldY = (mousePos.y - centerY) / currentZoom - gridOffset.y;
    
    // Calculate new offset to keep same world position under mouse
    const newOffsetX = (mousePos.x - centerX) / newZoom - worldX;
    const newOffsetY = (mousePos.y - centerY) / newZoom - worldY;
    
    return {
      newZoom,
      newOffset: new Vector2(newOffsetX, newOffsetY)
    };
  }

  // Smooth zoom interpolation
  updateZoom(deltaTime: number): number {
    const diff = this.targetZoom - this.currentZoom;
    if (Math.abs(diff) < 0.001) {
      this.currentZoom = this.targetZoom;
      return this.currentZoom;
    }
    
    const lerpFactor = 1 - Math.pow(1 - this.zoomSmoothing, deltaTime * 60);
    this.currentZoom += diff * lerpFactor;
    return this.currentZoom;
  }

  setTargetZoom(zoom: number): void {
    this.targetZoom = Math.max(0.1, Math.min(5, zoom));
  }

  getCurrentZoom(): number {
    return this.currentZoom;
  }

  // Discrete zoom steps
  zoomIn(step: number = 0.1): number {
    const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    const current = this.targetZoom;
    for (let i = 0; i < steps.length; i++) {
      if (current < steps[i] - 0.01) {
        this.targetZoom = steps[i];
        return this.targetZoom;
      }
    }
    this.targetZoom = 5;
    return this.targetZoom;
  }

  zoomOut(step: number = 0.1): number {
    const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    const current = this.targetZoom;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (current > steps[i] + 0.01) {
        this.targetZoom = steps[i];
        return this.targetZoom;
      }
    }
    this.targetZoom = 0.1;
    return this.targetZoom;
  }

  // Space + drag panning
  startSpacePan(mousePos: Vector2): void {
    this.spacePanning = true;
    this.spacePanStart = mousePos.copy();
  }

  updateSpacePan(mousePos: Vector2, currentOffset: Vector2, zoom: number): Vector2 {
    if (!this.spacePanning) return currentOffset;
    
    const delta = Vector2.subtract(this.spacePanStart, mousePos);
    const newOffset = currentOffset.copy();
    newOffset.add(Vector2.multiply(delta, 1 / zoom));
    this.spacePanStart = mousePos.copy();
    return newOffset;
  }

  stopSpacePan(): void {
    this.spacePanning = false;
  }

  isSpacePanning(): boolean {
    return this.spacePanning;
  }

  // Snap functions
  snapToGridPosition(pos: Vector2, gridSize: number): Vector2 {
    if (!this.settings.snapToGrid) return pos;
    return new Vector2(
      Math.round(pos.x / gridSize) * gridSize,
      Math.round(pos.y / gridSize) * gridSize
    );
  }

  snapAngle(angle: number): number {
    if (!this.settings.angleSnap) return angle;
    const snapDeg = this.settings.angleSnapDegrees;
    return Math.round(angle / snapDeg) * snapDeg;
  }

  // Render grid overlay
  renderGrid(renderer: Renderer, gridOffset: Vector2, zoom: number, viewportWidth: number, viewportHeight: number, tileSize: number): void {
    if (!this.settings.showGrid) return;

    const ctx = renderer.getContext();
    const gridSize = this.settings.gridSize;
    
    // Calculate visible grid bounds
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    const worldLeft = (0 - centerX) / zoom - gridOffset.x;
    const worldRight = (viewportWidth - centerX) / zoom - gridOffset.x;
    const worldTop = (0 - centerY) / zoom - gridOffset.y;
    const worldBottom = (viewportHeight - centerY) / zoom - gridOffset.y;
    
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endY = Math.ceil(worldBottom / gridSize) * gridSize;

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1 / zoom;
    
    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  // Render rulers
  renderRulers(renderer: Renderer, gridOffset: Vector2, zoom: number, viewportWidth: number, viewportHeight: number): void {
    if (!this.settings.showRulers) return;

    const ctx = renderer.getContext();
    const rulerHeight = 20;
    const rulerWidth = 20;
    
    // Top ruler
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, viewportWidth, rulerHeight);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, viewportWidth, rulerHeight);
    
    // Left ruler
    ctx.fillRect(0, rulerHeight, rulerWidth, viewportHeight - rulerHeight);
    ctx.strokeRect(0, rulerHeight, rulerWidth, viewportHeight - rulerHeight);
    
    // Ruler markings
    ctx.fillStyle = '#aaa';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const gridSize = this.settings.gridSize;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    const worldLeft = (0 - centerX) / zoom - gridOffset.x;
    const worldRight = (viewportWidth - centerX) / zoom - gridOffset.x;
    const worldTop = (0 - centerY) / zoom - gridOffset.y;
    
    // Top ruler markings
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = (x + gridOffset.x) * zoom + centerX;
      if (screenX >= rulerWidth && screenX < viewportWidth) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, rulerHeight);
        ctx.stroke();
        ctx.fillText(x.toString(), screenX, rulerHeight / 2);
      }
    }
    
    // Left ruler markings
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endY = Math.ceil((viewportHeight - centerY) / zoom - gridOffset.y) * gridSize;
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = (y + gridOffset.y) * zoom + centerY;
      if (screenY >= rulerHeight && screenY < viewportHeight) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(rulerWidth, screenY);
        ctx.stroke();
        ctx.save();
        ctx.translate(rulerWidth / 2, screenY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(y.toString(), 0, 0);
        ctx.restore();
      }
    }
  }

  // Render layout boundary
  renderLayoutBoundary(renderer: Renderer, gridOffset: Vector2, zoom: number, viewportWidth: number, viewportHeight: number): void {
    const ctx = renderer.getContext();
    const boundary = this.settings.layoutBoundary;
    
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(boundary.x, boundary.y, boundary.width, boundary.height);
    ctx.setLineDash([]);
  }

  // Render minimap (simple overview)
  renderMinimap(renderer: Renderer, viewportWidth: number, viewportHeight: number, layoutWidth: number, layoutHeight: number, cameraX: number, cameraY: number, cameraZoom: number): void {
    if (!this.settings.showMinimap) return;

    const ctx = renderer.getContext();
    const minimapSize = 200;
    const minimapX = viewportWidth - minimapSize - 10;
    const minimapY = 10;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Scale
    const scaleX = minimapSize / layoutWidth;
    const scaleY = minimapSize / layoutHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Draw layout boundary
    ctx.fillStyle = '#444';
    ctx.fillRect(
      minimapX + (layoutWidth * scale) / 2,
      minimapY + (layoutHeight * scale) / 2,
      layoutWidth * scale,
      layoutHeight * scale
    );
    
    // Draw viewport indicator
    const viewportWorldWidth = viewportWidth / cameraZoom;
    const viewportWorldHeight = viewportHeight / cameraZoom;
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      minimapX + (cameraX + layoutWidth / 2) * scale - (viewportWorldWidth * scale) / 2,
      minimapY + (cameraY + layoutHeight / 2) * scale - (viewportWorldHeight * scale) / 2,
      viewportWorldWidth * scale,
      viewportWorldHeight * scale
    );
  }
}

