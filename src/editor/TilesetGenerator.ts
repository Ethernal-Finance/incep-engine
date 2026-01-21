export class TilesetGenerator {
  static generateDefaultTileset(tileSize: number = 32, cols: number = 8, rows: number = 8): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = cols * tileSize;
    canvas.height = rows * tileSize;
    const ctx = canvas.getContext('2d')!;

    // Generate a simple colored tileset
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const tileId = row * cols + col + 1;

        // Create different colors for different tiles
        const hue = (tileId * 30) % 360;
        const saturation = 50 + (tileId % 3) * 20;
        const lightness = 40 + (tileId % 2) * 20;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, y, tileSize, tileSize);

        // Add border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);

        // Add tile number for identification
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tileId.toString(), x + tileSize / 2, y + tileSize / 2);
      }
    }

    // Convert canvas to image
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
}

