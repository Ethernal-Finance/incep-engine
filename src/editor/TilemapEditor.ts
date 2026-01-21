import { Tilemap } from '../data/Tilemap';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';
import { AssetLoader } from '../engine/AssetLoader';

export class TilemapEditor {
  private selectedTile: number = 1;
  private isStretching: boolean = false;
  private stretchStart: Vector2 | null = null;
  private stretchEnd: Vector2 | null = null;
  private activeLayerIndex: number = 0;

  constructor(private tilemap: Tilemap) {
    // Ensure we have at least a background layer
    if (this.tilemap.layers.length === 0) {
      this.tilemap.addLayer('background');
    }
  }

  setActiveLayer(layerIndex: number): void {
    this.activeLayerIndex = Math.max(0, Math.min(this.tilemap.layers.length - 1, layerIndex));
  }

  getActiveLayerIndex(): number {
    return this.activeLayerIndex;
  }

  setSelectedTile(tileId: number): void {
    this.selectedTile = tileId;
  }

  getSelectedTile(): number {
    return this.selectedTile;
  }

  update(_deltaTime: number, worldPos: Vector2, _camera: Camera, _zoom: number, _viewportWidth: number, _viewportHeight: number, mouseButtonDown: boolean, mouseButton: boolean): void {
    // Snap to grid (worldPos is already in world coordinates)
    // The grid in world space goes from 0 to 256 (8 tiles * 32px)
    // So we can directly calculate tile coordinates
    const tileX = Math.floor(worldPos.x / this.tilemap.tileSize);
    const tileY = Math.floor(worldPos.y / this.tilemap.tileSize);
    
    // Clamp to grid bounds (0-7 for 8x8 grid)
    const clampedX = Math.max(0, Math.min(this.tilemap.width - 1, tileX));
    const clampedY = Math.max(0, Math.min(this.tilemap.height - 1, tileY));

    const activeLayer = this.tilemap.layers[this.activeLayerIndex];
    if (!activeLayer) {
      console.warn('No active layer found!');
      return;
    }

    if (mouseButtonDown) {
      // Start stretching and place initial tile
      this.isStretching = true;
      this.stretchStart = new Vector2(clampedX, clampedY);
      this.stretchEnd = new Vector2(clampedX, clampedY);
      
      // Place tile immediately on click
      if (clampedX >= 0 && clampedX < this.tilemap.width && clampedY >= 0 && clampedY < this.tilemap.height) {
        this.tilemap.setTile(activeLayer.name, clampedX, clampedY, this.selectedTile);
      }
    }

    if (mouseButton && this.isStretching && this.stretchStart) {
      // Update stretch end
      this.stretchEnd = new Vector2(clampedX, clampedY);
      
      // Fill rectangle
      const minX = Math.max(0, Math.min(this.stretchStart.x, this.stretchEnd.x));
      const maxX = Math.min(7, Math.max(this.stretchStart.x, this.stretchEnd.x));
      const minY = Math.max(0, Math.min(this.stretchStart.y, this.stretchEnd.y));
      const maxY = Math.min(7, Math.max(this.stretchStart.y, this.stretchEnd.y));

      // Fill the rectangle with tiles
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          this.tilemap.setTile(activeLayer.name, x, y, this.selectedTile);
        }
      }
    }

    if (Input.getMouseButtonUp(0)) {
      this.isStretching = false;
      this.stretchStart = null;
      this.stretchEnd = null;
    }

    // Right click - erase (check Input directly since we only pass left button state)
    if (Input.getMouseButton(2)) {
      if (activeLayer) {
        this.tilemap.setTile(activeLayer.name, clampedX, clampedY, 0);
      }
    }
  }

  render(renderer: Renderer): void {
    const tilesetImage = AssetLoader.getImage(this.tilemap.tilesetImage);
    if (!tilesetImage) {
      console.warn(`Tileset image not found: ${this.tilemap.tilesetImage}`);
      return;
    }

    const tileSize = this.tilemap.tileSize;
    const tilesPerRow = this.tilemap.tilesetColumns;

    for (const layer of this.tilemap.layers) {
      if (!layer.visible) continue;

      for (let y = 0; y < this.tilemap.height; y++) {
        for (let x = 0; x < this.tilemap.width; x++) {
          const tileId = layer.data[y * this.tilemap.width + x];
          if (tileId === 0) continue; // Skip empty tiles

          const tileX = x * tileSize;
          const tileY = y * tileSize;

          // Calculate source position in tileset
          const srcX = ((tileId - 1) % tilesPerRow) * tileSize;
          const srcY = Math.floor((tileId - 1) / tilesPerRow) * tileSize;

          renderer.drawImage(
            tilesetImage,
            tileX,
            tileY,
            tileSize,
            tileSize,
            srcX,
            srcY,
            tileSize,
            tileSize
          );
        }
      }
    }

    // Render stretch preview
    if (this.isStretching && this.stretchStart && this.stretchEnd) {
      const minX = Math.min(this.stretchStart.x, this.stretchEnd.x);
      const maxX = Math.max(this.stretchStart.x, this.stretchEnd.x);
      const minY = Math.min(this.stretchStart.y, this.stretchEnd.y);
      const maxY = Math.max(this.stretchStart.y, this.stretchEnd.y);

      const ctx = renderer.getContext();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        minX * tileSize,
        minY * tileSize,
        (maxX - minX + 1) * tileSize,
        (maxY - minY + 1) * tileSize
      );
    }
  }
}

