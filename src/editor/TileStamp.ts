import { Vector2 } from '../utils/Vector2';

export interface TileStamp {
  width: number;
  height: number;
  tileIds: number[];
  rotation: number; // 0, 90, 180, 270 degrees
  mirrorX: boolean;
  mirrorY: boolean;
}

export class TileStampManager {
  private currentStamp: TileStamp;
  private savedStamps: Map<string, TileStamp> = new Map();

  constructor() {
    // Default single tile stamp
    this.currentStamp = {
      width: 1,
      height: 1,
      tileIds: [1],
      rotation: 0,
      mirrorX: false,
      mirrorY: false
    };
  }

  setSingleTile(tileId: number): void {
    this.currentStamp = {
      width: 1,
      height: 1,
      tileIds: [tileId],
      rotation: 0,
      mirrorX: false,
      mirrorY: false
    };
  }

  setMultiTileStamp(tileIds: number[], width: number, height: number): void {
    if (tileIds.length !== width * height) {
      console.warn('Tile stamp size mismatch');
      return;
    }
    
    this.currentStamp = {
      width,
      height,
      tileIds: [...tileIds],
      rotation: 0,
      mirrorX: false,
      mirrorY: false
    };
  }

  getCurrentStamp(): TileStamp {
    return { ...this.currentStamp };
  }

  rotateStamp(degrees: number): void {
    // Only allow 90 degree increments
    const currentRot = this.currentStamp.rotation;
    const newRot = (currentRot + degrees) % 360;
    this.currentStamp.rotation = newRot;
    
    // Rotate the tile data
    if (degrees === 90 || degrees === -90 || degrees === 270) {
      const rotated = this.rotateTileData(this.currentStamp.tileIds, this.currentStamp.width, this.currentStamp.height, degrees > 0);
      this.currentStamp.tileIds = rotated.tileIds;
      this.currentStamp.width = rotated.width;
      this.currentStamp.height = rotated.height;
    }
  }

  mirrorStamp(horizontal: boolean): void {
    if (horizontal) {
      this.currentStamp.mirrorX = !this.currentStamp.mirrorX;
      this.currentStamp.tileIds = this.mirrorTileData(this.currentStamp.tileIds, this.currentStamp.width, this.currentStamp.height, true);
    } else {
      this.currentStamp.mirrorY = !this.currentStamp.mirrorY;
      this.currentStamp.tileIds = this.mirrorTileData(this.currentStamp.tileIds, this.currentStamp.width, this.currentStamp.height, false);
    }
  }

  private rotateTileData(tileIds: number[], width: number, height: number, clockwise: boolean): { tileIds: number[]; width: number; height: number } {
    const rotated: number[] = new Array(width * height);
    
    if (clockwise) {
      // 90 degrees clockwise
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = y * width + x;
          const dstX = height - 1 - y;
          const dstY = x;
          const dstIndex = dstY * height + dstX;
          rotated[dstIndex] = tileIds[srcIndex];
        }
      }
      return { tileIds: rotated, width: height, height: width };
    } else {
      // 90 degrees counter-clockwise
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = y * width + x;
          const dstX = y;
          const dstY = width - 1 - x;
          const dstIndex = dstY * width + dstX;
          rotated[dstIndex] = tileIds[srcIndex];
        }
      }
      return { tileIds: rotated, width: height, height: width };
    }
  }

  private mirrorTileData(tileIds: number[], width: number, height: number, horizontal: boolean): number[] {
    const mirrored: number[] = new Array(tileIds.length);
    
    if (horizontal) {
      // Mirror horizontally
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = y * width + x;
          const dstX = width - 1 - x;
          const dstY = y;
          const dstIndex = dstY * width + dstX;
          mirrored[dstIndex] = tileIds[srcIndex];
        }
      }
    } else {
      // Mirror vertically
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIndex = y * width + x;
          const dstX = x;
          const dstY = height - 1 - y;
          const dstIndex = dstY * width + dstX;
          mirrored[dstIndex] = tileIds[srcIndex];
        }
      }
    }
    
    return mirrored;
  }

  // Get tile ID at stamp position (accounting for rotation/mirror)
  getTileIdAt(stampX: number, stampY: number): number {
    if (stampX < 0 || stampX >= this.currentStamp.width || stampY < 0 || stampY >= this.currentStamp.height) {
      return 0;
    }
    
    let x = stampX;
    let y = stampY;
    
    // Apply mirroring
    if (this.currentStamp.mirrorX) {
      x = this.currentStamp.width - 1 - x;
    }
    if (this.currentStamp.mirrorY) {
      y = this.currentStamp.height - 1 - y;
    }
    
    // Apply rotation (simplified - full implementation would handle all rotations)
    // For now, just return the tile at the position
    const index = y * this.currentStamp.width + x;
    return this.currentStamp.tileIds[index] || 0;
  }

  saveStamp(name: string): void {
    this.savedStamps.set(name, { ...this.currentStamp });
  }

  loadStamp(name: string): boolean {
    const stamp = this.savedStamps.get(name);
    if (stamp) {
      this.currentStamp = { ...stamp };
      return true;
    }
    return false;
  }
}

