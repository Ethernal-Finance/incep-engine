import { Vector2 } from '../utils/Vector2';
import { TileStampManager } from './TileStamp';

export interface PaintStroke {
  layerName: string;
  changes: Array<{ x: number; y: number; oldTileId: number; newTileId: number }>;
}

export class PaintingTools {
  private stampManager: TileStampManager;
  private currentStroke: PaintStroke | null = null;
  private visitedCells: Set<string> = new Set();
  private isPainting: boolean = false;
  private lastPaintCell: Vector2 | null = null;

  constructor() {
    this.stampManager = new TileStampManager();
  }

  getStampManager(): TileStampManager {
    return this.stampManager;
  }

  // Brush tool - paint with stamp
  startBrushStroke(layerName: string, tileX: number, tileY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): PaintStroke | null {
    this.isPainting = true;
    this.visitedCells.clear();
    this.lastPaintCell = null;
    
    this.currentStroke = {
      layerName,
      changes: []
    };
    
    this.paintAtCell(tileX, tileY, getTile, setTile);
    return this.currentStroke;
  }

  continueBrushStroke(tileX: number, tileY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): void {
    if (!this.isPainting || !this.currentStroke) return;
    
    // Avoid repainting same cell during drag
    const cellKey = `${tileX},${tileY}`;
    if (this.visitedCells.has(cellKey)) return;

    if (this.lastPaintCell) {
      this.paintLineBetween(this.lastPaintCell.x, this.lastPaintCell.y, tileX, tileY, getTile, setTile);
    } else {
      this.paintAtCell(tileX, tileY, getTile, setTile);
    }
  }

  private paintAtCell(tileX: number, tileY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): void {
    if (!this.currentStroke) return;
    
    const stamp = this.stampManager.getCurrentStamp();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PaintingTools.ts:49',message:'paintAtCell called',data:{tileX,tileY,stampTileIds:stamp.tileIds,stampWidth:stamp.width,stampHeight:stamp.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Paint stamp pattern
    for (let sy = 0; sy < stamp.height; sy++) {
      for (let sx = 0; sx < stamp.width; sx++) {
        const x = tileX + sx;
        const y = tileY + sy;
        const subCellKey = `${x},${y}`;
        
        if (this.visitedCells.has(subCellKey)) continue;
        this.visitedCells.add(subCellKey);
        
        const oldTileId = getTile(x, y);
        const newTileId = this.stampManager.getTileIdAt(sx, sy);
        // #region agent log
        if (sx === 0 && sy === 0) {
          fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PaintingTools.ts:66',message:'About to set tile',data:{x,y,oldTileId,newTileId,stampX:sx,stampY:sy},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        }
        // #endregion
        
        if (oldTileId !== newTileId) {
          setTile(x, y, newTileId);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PaintingTools.ts:69',message:'Tile set called',data:{x,y,newTileId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          this.currentStroke.changes.push({ x, y, oldTileId, newTileId });
        }
      }
    }
    
    this.lastPaintCell = new Vector2(tileX, tileY);
  }

  private paintLineBetween(startX: number, startY: number, endX: number, endY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): void {
    let x0 = startX;
    let y0 = startY;
    const x1 = endX;
    const y1 = endY;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.paintAtCell(x0, y0, getTile, setTile);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  endBrushStroke(): PaintStroke | null {
    this.isPainting = false;
    this.visitedCells.clear();
    this.lastPaintCell = null;
    
    const stroke = this.currentStroke;
    this.currentStroke = null;
    return stroke;
  }

  // Rectangle fill tool
  fillRectangle(layerName: string, startX: number, startY: number, endX: number, endY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): PaintStroke {
    const stroke: PaintStroke = {
      layerName,
      changes: []
    };
    
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    const stamp = this.stampManager.getCurrentStamp();
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const stampX = (x - minX) % stamp.width;
        const stampY = (y - minY) % stamp.height;
        
        const oldTileId = getTile(x, y);
        const newTileId = this.stampManager.getTileIdAt(stampX, stampY);
        
        if (oldTileId !== newTileId) {
          setTile(x, y, newTileId);
          stroke.changes.push({ x, y, oldTileId, newTileId });
        }
      }
    }
    
    return stroke;
  }

  // Flood fill tool
  floodFill(layerName: string, startX: number, startY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void, width: number, height: number, diagonal: boolean = false): PaintStroke {
    const stroke: PaintStroke = {
      layerName,
      changes: []
    };
    
    const targetTileId = getTile(startX, startY);
    const fillTileId = this.stampManager.getCurrentStamp().tileIds[0];
    
    if (targetTileId === fillTileId) return stroke; // Already filled
    
    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    
    const neighbors = diagonal 
      ? [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
      : [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
    
    while (stack.length > 0) {
      const cell = stack.pop()!;
      const key = `${cell.x},${cell.y}`;
      
      if (visited.has(key)) continue;
      if (cell.x < 0 || cell.x >= width || cell.y < 0 || cell.y >= height) continue;
      
      const currentTileId = getTile(cell.x, cell.y);
      if (currentTileId !== targetTileId) continue;
      
      visited.add(key);
      
      const oldTileId = currentTileId;
      setTile(cell.x, cell.y, fillTileId);
      stroke.changes.push({ x: cell.x, y: cell.y, oldTileId, newTileId: fillTileId });
      
      // Add neighbors
      for (const neighbor of neighbors) {
        const nx = cell.x + neighbor.x;
        const ny = cell.y + neighbor.y;
        const nKey = `${nx},${ny}`;
        
        if (!visited.has(nKey) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
          stack.push({ x: nx, y: ny });
        }
      }
    }
    
    return stroke;
  }

  // Line tool (Bresenham's algorithm)
  drawLine(layerName: string, startX: number, startY: number, endX: number, endY: number, getTile: (x: number, y: number) => number, setTile: (x: number, y: number, tileId: number) => void): PaintStroke {
    const stroke: PaintStroke = {
      layerName,
      changes: []
    };
    
    const stamp = this.stampManager.getCurrentStamp();
    const fillTileId = stamp.tileIds[0];
    
    let x0 = startX;
    let y0 = startY;
    let x1 = endX;
    let y1 = endY;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      const oldTileId = getTile(x0, y0);
      if (oldTileId !== fillTileId) {
        setTile(x0, y0, fillTileId);
        stroke.changes.push({ x: x0, y: y0, oldTileId, newTileId: fillTileId });
      }
      
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    
    return stroke;
  }

  // Eyedropper tool
  pickTile(tileX: number, tileY: number, getTile: (x: number, y: number) => number): number {
    return getTile(tileX, tileY);
  }
}

