import { Tilemap } from '../data/Tilemap';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';
import { AssetLoader } from '../engine/AssetLoader';
import { EditorTool } from './Editor';
import { PaintingTools } from './PaintingTools';
import { UndoSystem } from './UndoSystem';
import { CollisionSystem, CollisionType } from './CollisionSystem';

export class TilemapEditor {
  private selectedTile: number = 1;
  private isStretching: boolean = false;
  private stretchStart: Vector2 | null = null;
  private stretchEnd: Vector2 | null = null;
  private activeLayerIndex: number = 0;
  private currentTool: EditorTool = EditorTool.Paint;
  private showCollisionOverlay: boolean = true;
  private paintingTools: PaintingTools;
  private undoSystem: UndoSystem | null = null;
  private collisionSystem: CollisionSystem | null = null;
  private currentStroke: any = null;
  private paintMode: 'brush' | 'rectangle' | 'floodfill' | 'line' = 'brush';
  private lineStart: Vector2 | null = null;

  constructor(private tilemap: Tilemap, undoSystem?: UndoSystem, collisionSystem?: CollisionSystem) {
    // Ensure we have at least a background layer
    if (this.tilemap.layers.length === 0) {
      this.tilemap.addLayer('background');
    }
    
    this.paintingTools = new PaintingTools();
    this.undoSystem = undoSystem || null;
    this.collisionSystem = collisionSystem || null;
  }
  
  setUndoSystem(undoSystem: UndoSystem): void {
    this.undoSystem = undoSystem;
  }
  
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
  }
  
  getPaintingTools(): PaintingTools {
    return this.paintingTools;
  }
  
  setPaintMode(mode: 'brush' | 'rectangle' | 'floodfill' | 'line'): void {
    this.paintMode = mode;
  }

  setActiveLayer(layerIndex: number): void {
    this.activeLayerIndex = Math.max(0, Math.min(this.tilemap.layers.length - 1, layerIndex));
  }

  getActiveLayerIndex(): number {
    return this.activeLayerIndex;
  }

  setSelectedTile(tileId: number): void {
    this.selectedTile = tileId;
    this.paintingTools.getStampManager().setSingleTile(tileId);
  }

  setSelectedStamp(tileIds: number[], width: number, height: number): void {
    if (!tileIds.length) return;
    this.selectedTile = tileIds[0];
    this.paintingTools.getStampManager().setMultiTileStamp(tileIds, width, height);
  }

  getSelectedTile(): number {
    return this.selectedTile;
  }

  setTool(tool: EditorTool): void {
    this.currentTool = tool;
  }

  setShowCollisionOverlay(show: boolean): void {
    this.showCollisionOverlay = show;
  }

  getShowCollisionOverlay(): boolean {
    return this.showCollisionOverlay;
  }

  update(_deltaTime: number, worldPos: Vector2, _camera: Camera, _zoom: number, _viewportWidth: number, _viewportHeight: number, mouseButtonDown: boolean, mouseButton: boolean): void {
    // Snap to grid (worldPos is already in world coordinates)
    // The grid size is derived from the tilemap dimensions
    const tileX = Math.floor(worldPos.x / this.tilemap.tileSize);
    const tileY = Math.floor(worldPos.y / this.tilemap.tileSize);
    
    // Clamp to grid bounds
    const clampedX = Math.max(0, Math.min(this.tilemap.width - 1, tileX));
    const clampedY = Math.max(0, Math.min(this.tilemap.height - 1, tileY));

    const activeLayer = this.tilemap.layers[this.activeLayerIndex];
    if (!activeLayer) {
      console.warn('No active layer found!');
      return;
    }

    // Helper functions for painting tools
    const getTile = (x: number, y: number): number => {
      return this.tilemap.getTile(activeLayer.name, x, y);
    };
    
    const setTile = (x: number, y: number, tileId: number): void => {
      this.tilemap.setTile(activeLayer.name, x, y, tileId);
    };

    // Handle Paint/Brush tools
    if (this.currentTool === EditorTool.Paint || this.currentTool === EditorTool.Brush) {
      // #region agent log
      if (mouseButtonDown) {
        fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TilemapEditor.ts:109',message:'Paint tool mouse down',data:{tool:this.currentTool,paintMode:this.paintMode,selectedTile:this.selectedTile,clampedX,clampedY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      if (mouseButtonDown) {
        if (this.paintMode === 'brush') {
          // Start brush stroke
          // #region agent log
          const stampBefore = this.paintingTools.getStampManager().getCurrentStamp();
          fetch('http://127.0.0.1:7242/ingest/10de58a5-2726-402d-81b3-a13049e4a979',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TilemapEditor.ts:113',message:'Starting brush stroke',data:{stampTileIds:stampBefore.tileIds,stampWidth:stampBefore.width,stampHeight:stampBefore.height,clampedX,clampedY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          this.currentStroke = this.paintingTools.startBrushStroke(
            activeLayer.name,
            clampedX,
            clampedY,
            getTile,
            setTile
          );
        } else if (this.paintMode === 'rectangle') {
          // Start rectangle fill
          this.isStretching = true;
          this.stretchStart = new Vector2(clampedX, clampedY);
          this.stretchEnd = new Vector2(clampedX, clampedY);
        } else if (this.paintMode === 'floodfill') {
          // Flood fill
          const stroke = this.paintingTools.floodFill(
            activeLayer.name,
            clampedX,
            clampedY,
            getTile,
            setTile,
            this.tilemap.width,
            this.tilemap.height,
            Input.getKey('Shift') // Shift for diagonal fill
          );
          if (this.undoSystem && stroke.changes.length > 0) {
            this.undoSystem.pushPaintStroke(
              stroke,
              (s) => this.applyStroke(s, setTile),
              (s) => this.revertStroke(s, setTile)
            );
          }
        } else if (this.paintMode === 'line') {
          // Start line
          this.lineStart = new Vector2(clampedX, clampedY);
        }
      }

      if (mouseButton && this.paintMode === 'brush' && this.currentStroke) {
        // Continue brush stroke
        this.paintingTools.continueBrushStroke(clampedX, clampedY, getTile, setTile);
      }

      if (mouseButton && this.paintMode === 'rectangle' && this.isStretching && this.stretchStart) {
        // Update rectangle
        this.stretchEnd = new Vector2(clampedX, clampedY);
      }

      if (Input.getMouseButtonUp(0)) {
        if (this.paintMode === 'brush' && this.currentStroke) {
          // End brush stroke and push to undo
          const stroke = this.paintingTools.endBrushStroke();
          if (this.undoSystem && stroke && stroke.changes.length > 0) {
            this.undoSystem.pushPaintStroke(
              stroke,
              (s) => this.applyStroke(s, setTile),
              (s) => this.revertStroke(s, setTile)
            );
          }
          this.currentStroke = null;
        } else if (this.paintMode === 'rectangle' && this.isStretching && this.stretchStart && this.stretchEnd) {
          // Complete rectangle fill
          const stroke = this.paintingTools.fillRectangle(
            activeLayer.name,
            this.stretchStart.x,
            this.stretchStart.y,
            this.stretchEnd.x,
            this.stretchEnd.y,
            getTile,
            setTile
          );
          if (this.undoSystem && stroke.changes.length > 0) {
            this.undoSystem.pushPaintStroke(
              stroke,
              (s) => this.applyStroke(s, setTile),
              (s) => this.revertStroke(s, setTile)
            );
          }
          this.isStretching = false;
          this.stretchStart = null;
          this.stretchEnd = null;
        } else if (this.paintMode === 'line' && this.lineStart) {
          // Complete line
          const stroke = this.paintingTools.drawLine(
            activeLayer.name,
            this.lineStart.x,
            this.lineStart.y,
            clampedX,
            clampedY,
            getTile,
            setTile
          );
          if (this.undoSystem && stroke.changes.length > 0) {
            this.undoSystem.pushPaintStroke(
              stroke,
              (s) => this.applyStroke(s, setTile),
              (s) => this.revertStroke(s, setTile)
            );
          }
          this.lineStart = null;
        }
      }

      // Right click - erase (always works regardless of tool)
      if (Input.getMouseButton(2)) {
        if (activeLayer) {
          this.tilemap.setTile(activeLayer.name, clampedX, clampedY, 0);
        }
      }
    }
    
    // Handle Eyedropper tool
    if (this.currentTool === EditorTool.Eyedropper && mouseButtonDown) {
      const pickedTile = this.paintingTools.pickTile(clampedX, clampedY, getTile);
      if (pickedTile > 0) {
        this.setSelectedTile(pickedTile);
      }
    }
    
    // Handle Erase tool
    else if (this.currentTool === EditorTool.Erase) {
      if (mouseButtonDown) {
        // Start erasing
        this.isStretching = true;
        this.stretchStart = new Vector2(clampedX, clampedY);
        this.stretchEnd = new Vector2(clampedX, clampedY);
        
        // Erase tile immediately on click
        if (clampedX >= 0 && clampedX < this.tilemap.width && clampedY >= 0 && clampedY < this.tilemap.height) {
          this.tilemap.setTile(activeLayer.name, clampedX, clampedY, 0);
        }
      }

      if (mouseButton && this.isStretching && this.stretchStart) {
        // Update stretch end
        this.stretchEnd = new Vector2(clampedX, clampedY);
        
        // Erase rectangle
        const minX = Math.max(0, Math.min(this.stretchStart.x, this.stretchEnd.x));
        const maxX = Math.min(this.tilemap.width - 1, Math.max(this.stretchStart.x, this.stretchEnd.x));
        const minY = Math.max(0, Math.min(this.stretchStart.y, this.stretchEnd.y));
        const maxY = Math.min(this.tilemap.height - 1, Math.max(this.stretchStart.y, this.stretchEnd.y));

        // Erase the rectangle
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            this.tilemap.setTile(activeLayer.name, x, y, 0);
          }
        }
      }

      if (Input.getMouseButtonUp(0)) {
        this.isStretching = false;
        this.stretchStart = null;
        this.stretchEnd = null;
      }
    }
    
    // Handle Collision tool
    else if (this.currentTool === EditorTool.Collision && this.collisionSystem) {
      if (mouseButtonDown) {
        // Toggle collision on click
        if (clampedX >= 0 && clampedX < this.tilemap.width && clampedY >= 0 && clampedY < this.tilemap.height) {
          const tileId = this.tilemap.getTile(activeLayer.name, clampedX, clampedY);
          if (tileId > 0) {
            const currentCollision = this.collisionSystem.getTileCollision(tileId);
            // Toggle between none and full block for MVP
            if (currentCollision.type === CollisionType.None) {
              this.collisionSystem.setTileCollision(tileId, this.collisionSystem.createFullBlock());
            } else {
              this.collisionSystem.setTileCollision(tileId, { type: CollisionType.None });
            }
          }
        }
      }

      // Right click - remove collision
      if (Input.getMouseButton(2)) {
        if (clampedX >= 0 && clampedX < this.tilemap.width && clampedY >= 0 && clampedY < this.tilemap.height) {
          const tileId = this.tilemap.getTile(activeLayer.name, clampedX, clampedY);
          if (tileId > 0) {
            this.collisionSystem.setTileCollision(tileId, { type: CollisionType.None });
          }
        }
      }
    }
  }
  
  private applyStroke(stroke: any, setTile: (x: number, y: number, tileId: number) => void): void {
    for (const change of stroke.changes) {
      setTile(change.x, change.y, change.newTileId);
    }
  }
  
  private revertStroke(stroke: any, setTile: (x: number, y: number, tileId: number) => void): void {
    for (const change of stroke.changes) {
      setTile(change.x, change.y, change.oldTileId);
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
      // Use different colors for paint vs erase
      ctx.strokeStyle = this.currentTool === EditorTool.Erase ? '#ff0000' : '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        minX * tileSize,
        minY * tileSize,
        (maxX - minX + 1) * tileSize,
        (maxY - minY + 1) * tileSize
      );
    }

    // Render collision overlay (always show when enabled, or when collision tool is active)
    if ((this.showCollisionOverlay || this.currentTool === EditorTool.Collision) && this.collisionSystem) {
      this.collisionSystem.renderTilemapCollisionOverlay(renderer, this.tilemap, true);
    }
    
    // Note: Line preview would need worldPos from update method - can be added later
  }
}
