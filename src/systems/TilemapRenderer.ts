import { Tilemap } from '../data/Tilemap';
import { Renderer } from '../engine/Renderer';
import { Vector2 } from '../utils/Vector2';

export class TilemapRenderer {
  static render(renderer: Renderer, tilemap: Tilemap, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    // Render tiles even without tileset (as colored rectangles)
    if (!tilemap.tileset || !tilemap.tileset.image) {
      TilemapRenderer.renderPlaceholder(renderer, tilemap, cameraX, cameraY, viewWidth, viewHeight);
      return;
    }

    const tileset = tilemap.tileset;
    const tileSize = tilemap.tileSize;

    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(cameraX / tileSize) - 1);
    const startY = Math.max(0, Math.floor(cameraY / tileSize) - 1);
    const endX = Math.min(tilemap.width, Math.ceil((cameraX + viewWidth) / tileSize) + 1);
    const endY = Math.min(tilemap.height, Math.ceil((cameraY + viewHeight) / tileSize) + 1);

    // Render each layer
    for (const layer of tilemap.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      renderer.save();
      renderer.getContext().globalAlpha = layer.opacity;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = layer.data[y * tilemap.width + x];
          if (tileId === 0) continue;

          const worldX = x * tileSize;
          const worldY = y * tileSize;
          const screenPos = renderer.worldToScreen(new Vector2(worldX, worldY));

          // Calculate source position in tileset
          const tileIndex = tileId - 1; // Assuming tile IDs are 1-indexed
          const tilesetX = (tileIndex % tileset.columns) * tileset.tileWidth;
          const tilesetY = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;

          renderer.drawImage(
            tileset.image,
            screenPos.x,
            screenPos.y,
            tileSize * renderer.getCameraZoom(),
            tileSize * renderer.getCameraZoom(),
            tilesetX,
            tilesetY,
            tileset.tileWidth,
            tileset.tileHeight
          );
        }
      }

      renderer.restore();
    }
  }

  static renderCollisionLayer(renderer: Renderer, tilemap: Tilemap, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    const tileSize = tilemap.tileSize;
    const startX = Math.max(0, Math.floor(cameraX / tileSize) - 1);
    const startY = Math.max(0, Math.floor(cameraY / tileSize) - 1);
    const endX = Math.min(tilemap.width, Math.ceil((cameraX + viewWidth) / tileSize) + 1);
    const endY = Math.min(tilemap.height, Math.ceil((cameraY + viewHeight) / tileSize) + 1);

    renderer.save();
    renderer.getContext().globalAlpha = 0.3;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (tilemap.isCollisionAt(x, y)) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          const screenPos = renderer.worldToScreen(new Vector2(worldX, worldY));
          renderer.fillRect(
            screenPos.x,
            screenPos.y,
            tileSize * renderer.getCameraZoom(),
            tileSize * renderer.getCameraZoom(),
            '#ff0000'
          );
        }
      }
    }

    renderer.restore();
  }

  private static renderPlaceholder(renderer: Renderer, tilemap: Tilemap, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    const tileSize = tilemap.tileSize;
    const startX = Math.max(0, Math.floor(cameraX / tileSize) - 1);
    const startY = Math.max(0, Math.floor(cameraY / tileSize) - 1);
    const endX = Math.min(tilemap.width, Math.ceil((cameraX + viewWidth) / tileSize) + 1);
    const endY = Math.min(tilemap.height, Math.ceil((cameraY + viewHeight) / tileSize) + 1);

    // Render background
    renderer.fillRect(0, 0, renderer.getWidth(), renderer.getHeight(), '#2a2a3e');

    // Render each layer
    for (const layer of tilemap.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      renderer.save();
      renderer.getContext().globalAlpha = layer.opacity;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = layer.data[y * tilemap.width + x];
          if (tileId === 0) continue;

          const worldX = x * tileSize;
          const worldY = y * tileSize;
          const screenPos = renderer.worldToScreen(new Vector2(worldX, worldY));

          // Draw colored tile based on tileId
          const hue = (tileId * 137.5) % 360; // Golden angle for color distribution
          const color = `hsl(${hue}, 50%, 40%)`;
          
          renderer.fillRect(
            screenPos.x,
            screenPos.y,
            tileSize * renderer.getCameraZoom(),
            tileSize * renderer.getCameraZoom(),
            color
          );
          
          // Draw border
          renderer.strokeRect(
            screenPos.x,
            screenPos.y,
            tileSize * renderer.getCameraZoom(),
            tileSize * renderer.getCameraZoom(),
            '#555',
            1
          );
        }
      }

      renderer.restore();
    }
  }
}

