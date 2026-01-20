import { AssetLoader } from '../engine/AssetLoader';
import { Tileset } from '../data/Tilemap';

export class TileSelector {
  private canvas: HTMLCanvasElement;
  private tileset: Tileset | null = null;
  private selectedTileId: number = 0;
  private tileSize: number = 16;
  private scale: number = 2; // Display scale for better visibility
  private onTileSelectedCallback?: (tileId: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.cursor = 'crosshair';
    
    this.canvas.addEventListener('click', (e) => {
      this.handleTileClick(e);
    });
  }

  async loadTileset(imagePath: string, tileSize: number = 16): Promise<void> {
    try {
      const image = await AssetLoader.loadImage(imagePath);
      
      // Calculate tileset properties
      const columns = Math.floor(image.width / tileSize);
      const rows = Math.floor(image.height / tileSize);
      const tileCount = columns * rows;

      this.tileset = {
        name: imagePath.split('/').pop() || 'tileset',
        imagePath,
        image,
        tileWidth: tileSize,
        tileHeight: tileSize,
        tileCount,
        columns
      };

      this.tileSize = tileSize;
      this.render();
    } catch (error) {
      console.error('Failed to load tileset:', error);
    }
  }

  private render(): void {
    if (!this.tileset || !this.tileset.image) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const displayTileSize = this.tileSize * this.scale;
    const columns = this.tileset.columns;
    const rows = Math.ceil(this.tileset.tileCount / columns);

    // Set canvas size
    this.canvas.width = columns * displayTileSize;
    this.canvas.height = rows * displayTileSize;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tileset grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const tileId = y * columns + x;
        if (tileId >= this.tileset.tileCount) break;

        const destX = x * displayTileSize;
        const destY = y * displayTileSize;
        const srcX = (tileId % columns) * this.tileSize;
        const srcY = Math.floor(tileId / columns) * this.tileSize;

        // Draw tile
        ctx.drawImage(
          this.tileset.image,
          srcX, srcY, this.tileSize, this.tileSize,
          destX, destY, displayTileSize, displayTileSize
        );

        // Draw grid lines
        ctx.strokeRect(destX, destY, displayTileSize, displayTileSize);
      }
    }

    // Highlight selected tile
    if (this.selectedTileId > 0) {
      const selectedX = (this.selectedTileId % columns) * displayTileSize;
      const selectedY = Math.floor(this.selectedTileId / columns) * displayTileSize;
      
      ctx.strokeStyle = '#0078d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(selectedX, selectedY, displayTileSize, displayTileSize);
    }
  }

  private handleTileClick(e: MouseEvent): void {
    if (!this.tileset) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const displayTileSize = this.tileSize * this.scale;
    const tileX = Math.floor(x / displayTileSize);
    const tileY = Math.floor(y / displayTileSize);
    const columns = this.tileset.columns;
    const tileId = tileY * columns + tileX;

    if (tileId >= 0 && tileId < this.tileset.tileCount) {
      this.selectedTileId = tileId;
      this.render();
      
      if (this.onTileSelectedCallback) {
        // Tile IDs start at 1 (0 is empty)
        this.onTileSelectedCallback(tileId + 1);
      }
    }
  }

  setOnTileSelected(callback: (tileId: number) => void): void {
    this.onTileSelectedCallback = callback;
  }

  getSelectedTileId(): number {
    return this.selectedTileId;
  }

  getTileset(): Tileset | null {
    return this.tileset;
  }
}

