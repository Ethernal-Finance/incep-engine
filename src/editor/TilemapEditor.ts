import { Tilemap } from '../data/Tilemap';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';
import { AssetLoader } from '../engine/AssetLoader';
import { MathUtils } from '../utils/Math';

export class TilemapEditor {
  private selectedTile: number = 1;
  private painting: boolean = false;
  private erasing: boolean = false;

  constructor(private tilemap: Tilemap) {
    // Ensure we have at least a background layer
    if (this.tilemap.layers.length === 0) {
      this.tilemap.addLayer('background');
    }
  }

  setSelectedTile(tileId: number): void {
    this.selectedTile = tileId;
  }

  getSelectedTile(): number {
    return this.selectedTile;
  }

  update(deltaTime: number, mousePos: Vector2, camera: Camera, zoom: number, viewportWidth: number, viewportHeight: number): void {
    // Convert screen to world coordinates
    const worldPos = camera.screenToWorld(mousePos, viewportWidth, viewportHeight);

    // Snap to grid
    const tileX = Math.floor(worldPos.x / this.tilemap.tileSize);
    const tileY = Math.floor(worldPos.y / this.tilemap.tileSize);

    const activeLayer = this.tilemap.layers[0]; // TODO: get active layer

    if (Input.getMouseButton(0)) {
      // Left click - paint
      if (activeLayer) {
        this.tilemap.setTile(activeLayer.name, tileX, tileY, this.selectedTile);
      }
    } else if (Input.getMouseButton(2)) {
      // Right click - erase
      if (activeLayer) {
        this.tilemap.setTile(activeLayer.name, tileX, tileY, 0);
      }
    }
  }

  render(renderer: Renderer): void {
    const tilesetImage = AssetLoader.getImage(this.tilemap.tilesetImage);
    if (!tilesetImage) return;

    const tileSize = this.tilemap.tileSize;
    const tilesPerRow = this.tilemap.tilesetColumns;

    for (const layer of this.tilemap.layers) {
      if (!layer.visible) continue;

      for (let y = 0; y < this.tilemap.height; y++) {
        for (let x = 0; x < this.tilemap.width; x++) {
          const tileId = layer.data[y * this.tilemap.width + x];
          if (tileId === 0) continue;

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
  }
}

