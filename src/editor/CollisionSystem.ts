import { Vector2 } from '../utils/Vector2';
import { Rect } from '../utils/Rect';
import { Renderer } from '../engine/Renderer';

export enum CollisionType {
  None = 'none',
  FullBlock = 'full',
  Polygon = 'polygon',
  OneWay = 'oneway'
}

export interface CollisionShape {
  type: CollisionType;
  points?: Vector2[]; // For polygon
  oneWayNormal?: Vector2; // For one-way platforms
}

export interface TileCollisionData {
  tileId: number;
  collision: CollisionShape;
}

export class CollisionSystem {
  private tileCollisions: Map<number, CollisionShape> = new Map();
  private defaultCollision: CollisionShape = { type: CollisionType.None };

  constructor() {}

  setTileCollision(tileId: number, collision: CollisionShape): void {
    this.tileCollisions.set(tileId, collision);
  }

  getTileCollision(tileId: number): CollisionShape {
    return this.tileCollisions.get(tileId) || this.defaultCollision;
  }

  // Create full block collision
  createFullBlock(): CollisionShape {
    return { type: CollisionType.FullBlock };
  }

  // Create polygon collision
  createPolygon(points: Vector2[]): CollisionShape {
    return { type: CollisionType.Polygon, points: points.map(p => p.copy()) };
  }

  // Create one-way platform
  createOneWay(normal: Vector2): CollisionShape {
    return { type: CollisionType.OneWay, oneWayNormal: normal.copy() };
  }

  // Test collision between object and tile
  testTileCollision(objectBounds: Rect, tileX: number, tileY: number, tileSize: number, tileId: number): boolean {
    const collision = this.getTileCollision(tileId);
    
    if (collision.type === CollisionType.None) {
      return false;
    }
    
    const tileWorldX = tileX * tileSize;
    const tileWorldY = tileY * tileSize;
    const tileBounds = new Rect(tileWorldX, tileWorldY, tileSize, tileSize);
    
    // AABB test first
    if (!objectBounds.intersects(tileBounds)) {
      return false;
    }
    
    if (collision.type === CollisionType.FullBlock) {
      return true;
    }
    
    if (collision.type === CollisionType.Polygon && collision.points) {
      // Convert polygon points to world coordinates
      const worldPoints = collision.points.map(p => 
        new Vector2(tileWorldX + p.x, tileWorldY + p.y)
      );
      return this.testPolygonCollision(objectBounds, worldPoints);
    }
    
    if (collision.type === CollisionType.OneWay) {
      // One-way platforms only collide from one direction
      // For MVP, treat as full block
      return true;
    }
    
    return false;
  }

  private testPolygonCollision(rect: Rect, polygon: Vector2[]): boolean {
    // Simple AABB test for MVP - full SAT implementation would be more accurate
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    const polyBounds = new Rect(minX, minY, maxX - minX, maxY - minY);
    return rect.intersects(polyBounds);
  }

  // Resolve collision for movement (axis-separated)
  resolveCollision(objectBounds: Rect, velocity: Vector2, tileX: number, tileY: number, tileSize: number, tileId: number): { resolved: boolean; newVelocity: Vector2 } {
    const collision = this.getTileCollision(tileId);
    
    if (collision.type === CollisionType.None) {
      return { resolved: false, newVelocity: velocity.copy() };
    }
    
    const tileWorldX = tileX * tileSize;
    const tileWorldY = tileY * tileSize;
    const tileBounds = new Rect(tileWorldX, tileWorldY, tileSize, tileSize);
    
    if (!objectBounds.intersects(tileBounds)) {
      return { resolved: false, newVelocity: velocity.copy() };
    }
    
    if (collision.type === CollisionType.FullBlock) {
      // Axis-separated resolution
      let newVelX = velocity.x;
      let newVelY = velocity.y;
      
      // Try X movement first
      const testBoundsX = new Rect(objectBounds.x + velocity.x, objectBounds.y, objectBounds.width, objectBounds.height);
      if (testBoundsX.intersects(tileBounds)) {
        if (velocity.x > 0) {
          // Moving right, hit left side
          newVelX = tileBounds.x - (objectBounds.x + objectBounds.width);
        } else if (velocity.x < 0) {
          // Moving left, hit right side
          newVelX = (tileBounds.x + tileBounds.width) - objectBounds.x;
        }
      }
      
      // Try Y movement
      const testBoundsY = new Rect(objectBounds.x + newVelX, objectBounds.y + velocity.y, objectBounds.width, objectBounds.height);
      if (testBoundsY.intersects(tileBounds)) {
        if (velocity.y > 0) {
          // Moving down, hit top
          newVelY = tileBounds.y - (objectBounds.y + objectBounds.height);
        } else if (velocity.y < 0) {
          // Moving up, hit bottom
          newVelY = (tileBounds.y + tileBounds.height) - objectBounds.y;
        }
      }
      
      return { resolved: true, newVelocity: new Vector2(newVelX, newVelY) };
    }
    
    // For polygon and one-way, use AABB approximation for MVP
    return { resolved: true, newVelocity: velocity.copy() };
  }

  // Query tiles in range for collision testing
  queryTilesInRange(bounds: Rect, tileSize: number, getTile: (x: number, y: number) => number, width: number, height: number): Array<{ x: number; y: number; tileId: number }> {
    const minCol = Math.floor(bounds.x / tileSize);
    const maxCol = Math.floor((bounds.x + bounds.width) / tileSize);
    const minRow = Math.floor(bounds.y / tileSize);
    const maxRow = Math.floor((bounds.y + bounds.height) / tileSize);
    
    const results: Array<{ x: number; y: number; tileId: number }> = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (col >= 0 && col < width && row >= 0 && row < height) {
          const tileId = getTile(col, row);
          if (tileId !== 0) {
            results.push({ x: col, y: row, tileId });
          }
        }
      }
    }
    
    return results;
  }

  // Render collision overlay
  renderCollisionOverlay(renderer: Renderer, tileX: number, tileY: number, tileSize: number, tileId: number, showOverlay: boolean): void {
    if (!showOverlay) return;
    
    const collision = this.getTileCollision(tileId);
    if (collision.type === CollisionType.None) return;
    
    const ctx = renderer.getContext();
    const worldX = tileX * tileSize;
    const worldY = tileY * tileSize;
    
    if (collision.type === CollisionType.FullBlock) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(worldX, worldY, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(worldX, worldY, tileSize, tileSize);
    } else if (collision.type === CollisionType.Polygon && collision.points && collision.points.length > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(worldX + collision.points[0].x, worldY + collision.points[0].y);
      for (let i = 1; i < collision.points.length; i++) {
        ctx.lineTo(worldX + collision.points[i].x, worldY + collision.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (collision.type === CollisionType.OneWay) {
      // One-way platform visualization
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(worldX, worldY + tileSize);
      ctx.lineTo(worldX + tileSize, worldY + tileSize);
      ctx.stroke();
      // Draw arrow indicating direction
      ctx.beginPath();
      ctx.moveTo(worldX + tileSize / 2, worldY + tileSize);
      ctx.lineTo(worldX + tileSize / 2 - 5, worldY + tileSize - 5);
      ctx.moveTo(worldX + tileSize / 2, worldY + tileSize);
      ctx.lineTo(worldX + tileSize / 2 + 5, worldY + tileSize - 5);
      ctx.stroke();
    }
  }
  
  // Render collision overlay for entire tilemap
  renderTilemapCollisionOverlay(renderer: Renderer, tilemap: any, showOverlay: boolean): void {
    if (!showOverlay) return;
    
    const tileSize = tilemap.tileSize;
    const ctx = renderer.getContext();
    
    for (let y = 0; y < tilemap.height; y++) {
      for (let x = 0; x < tilemap.width; x++) {
        // Get tile from first visible layer
        let tileId = 0;
        for (const layer of tilemap.layers) {
          if (layer.visible) {
            tileId = tilemap.getTile(layer.name, x, y);
            if (tileId > 0) break;
          }
        }
        
        if (tileId > 0) {
          this.renderCollisionOverlay(renderer, x, y, tileSize, tileId, true);
        }
      }
    }
  }
}

