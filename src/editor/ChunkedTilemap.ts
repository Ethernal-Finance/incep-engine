export interface TileChunk {
  x: number;
  y: number;
  data: number[];
  dirty: boolean;
}

export class ChunkedTilemap {
  private chunks: Map<string, TileChunk> = new Map();
  private chunkSize: number;
  private width: number;
  private height: number;

  constructor(width: number, height: number, chunkSize: number = 32) {
    this.width = width;
    this.height = height;
    this.chunkSize = chunkSize;
  }

  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  private getChunkCoords(tileX: number, tileY: number): { chunkX: number; chunkY: number; localX: number; localY: number } {
    const chunkX = Math.floor(tileX / this.chunkSize);
    const chunkY = Math.floor(tileY / this.chunkSize);
    const localX = tileX % this.chunkSize;
    const localY = tileY % this.chunkSize;
    return { chunkX, chunkY, localX, localY };
  }

  private getOrCreateChunk(chunkX: number, chunkY: number): TileChunk {
    const key = this.getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);
    
    if (!chunk) {
      chunk = {
        x: chunkX,
        y: chunkY,
        data: new Array(this.chunkSize * this.chunkSize).fill(0),
        dirty: false
      };
      this.chunks.set(key, chunk);
    }
    
    return chunk;
  }

  getTile(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return 0;
    }
    
    const { chunkX, chunkY, localX, localY } = this.getChunkCoords(tileX, tileY);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkY));
    
    if (!chunk) {
      return 0; // Empty chunk means all zeros
    }
    
    return chunk.data[localY * this.chunkSize + localX] || 0;
  }

  setTile(tileX: number, tileY: number, tileId: number): void {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return;
    }
    
    const { chunkX, chunkY, localX, localY } = this.getChunkCoords(tileX, tileY);
    const chunk = this.getOrCreateChunk(chunkX, chunkY);
    
    chunk.data[localY * this.chunkSize + localX] = tileId;
    chunk.dirty = true;
  }

  // Get all chunks in viewport for rendering
  getChunksInViewport(worldLeft: number, worldTop: number, worldRight: number, worldBottom: number, tileSize: number): TileChunk[] {
    const tileLeft = Math.floor(worldLeft / tileSize);
    const tileTop = Math.floor(worldTop / tileSize);
    const tileRight = Math.ceil(worldRight / tileSize);
    const tileBottom = Math.ceil(worldBottom / tileSize);
    
    const startChunkX = Math.floor(tileLeft / this.chunkSize);
    const startChunkY = Math.floor(tileTop / this.chunkSize);
    const endChunkX = Math.floor(tileRight / this.chunkSize);
    const endChunkY = Math.floor(tileBottom / this.chunkSize);
    
    const visibleChunks: TileChunk[] = [];
    
    for (let cy = startChunkY; cy <= endChunkY; cy++) {
      for (let cx = startChunkX; cx <= endChunkX; cx++) {
        const chunk = this.chunks.get(this.getChunkKey(cx, cy));
        if (chunk) {
          visibleChunks.push(chunk);
        }
      }
    }
    
    return visibleChunks;
  }

  // Convert to flat array (for serialization)
  toFlatArray(): number[] {
    const data = new Array(this.width * this.height).fill(0);
    
    for (const chunk of this.chunks.values()) {
      const startX = chunk.x * this.chunkSize;
      const startY = chunk.y * this.chunkSize;
      
      for (let ly = 0; ly < this.chunkSize; ly++) {
        for (let lx = 0; lx < this.chunkSize; lx++) {
          const tileX = startX + lx;
          const tileY = startY + ly;
          
          if (tileX < this.width && tileY < this.height) {
            const tileId = chunk.data[ly * this.chunkSize + lx];
            if (tileId !== 0) {
              data[tileY * this.width + tileX] = tileId;
            }
          }
        }
      }
    }
    
    return data;
  }

  // Load from flat array
  fromFlatArray(data: number[]): void {
    this.chunks.clear();
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileId = data[y * this.width + x];
        if (tileId !== 0) {
          this.setTile(x, y, tileId);
        }
      }
    }
  }

  clear(): void {
    this.chunks.clear();
  }
}

