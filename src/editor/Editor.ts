import { Game } from '../engine/Game';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { TilemapEditor } from './TilemapEditor';
import { EntityPlacer } from './EntityPlacer';
import { PropertyInspector } from './PropertyInspector';
import { Level } from '../data/Level';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';
import { AssetLoader } from '../engine/AssetLoader';
import { TilesetGenerator } from './TilesetGenerator';
import { ViewControls } from './ViewControls';
import { SelectionSystem } from './SelectionSystem';
import { LayerSystem } from './LayerSystem';
import { PaintingTools } from './PaintingTools';
import { UndoSystem } from './UndoSystem';
import { CollisionSystem } from './CollisionSystem';

export enum EditorTool {
  Select = 'select',
  Paint = 'paint',
  Brush = 'brush',
  Erase = 'erase',
  FloodFill = 'floodfill',
  Line = 'line',
  Rectangle = 'rectangle',
  Eyedropper = 'eyedropper',
  Entity = 'entity',
  Collision = 'collision',
  Spawn = 'spawn',
  Door = 'door'
}

export class Editor {
  private game: Game;
  private renderer: Renderer;
  private currentLevel: Level;
  private currentTool: EditorTool = EditorTool.Select;
  private camera: Camera;
  private zoom: number = 1;
  private panning: boolean = false;
  private panStart: Vector2 = new Vector2();
  private activeLayer: number = 0;
  private mousePosition: Vector2 = new Vector2();
  private gridOffset: Vector2 = new Vector2();
  private isDoorStretching: boolean = false;
  private doorStretchStart: Vector2 | null = null;
  private doorStretchEnd: Vector2 | null = null;
  private doorEditExisting: boolean = false;

  private tilemapEditor: TilemapEditor;
  private entityPlacer: EntityPlacer;
  private _propertyInspector: PropertyInspector;
  
  // New systems
  private viewControls: ViewControls;
  private selectionSystem: SelectionSystem;
  private layerSystem: LayerSystem;
  private paintingTools: PaintingTools;
  private undoSystem: UndoSystem;
  private collisionSystem: CollisionSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.game = new Game(canvas);
    this.renderer = this.game.getRenderer();
    this.currentLevel = new Level('Layout 1');
    
    // Initialize with default tileset
    this.initializeTileset();
    
    this.camera = new Camera();
    
    this.updateGridMetrics();
    
    // Initialize new systems
    this.viewControls = new ViewControls();
    this.selectionSystem = new SelectionSystem();
    this.layerSystem = new LayerSystem();
    this.paintingTools = new PaintingTools();
    this.undoSystem = new UndoSystem();
    this.collisionSystem = new CollisionSystem();
    
    // Set layout boundary
    const gridWidth = this.currentLevel.tilemap.width * this.currentLevel.tilemap.tileSize;
    const gridHeight = this.currentLevel.tilemap.height * this.currentLevel.tilemap.tileSize;
    this.viewControls.setLayoutBoundary({ x: 0, y: 0, width: gridWidth, height: gridHeight });
    
    this.tilemapEditor = new TilemapEditor(this.currentLevel.tilemap, this.undoSystem, this.collisionSystem);
    this.entityPlacer = new EntityPlacer(this.currentLevel);
    this._propertyInspector = new PropertyInspector();
    this.setupUI();
  }

  private initializeTileset(): void {
    const tileSize = 32;
    const cols = 8;
    const rows = 8;
    
    // Generate default tileset
    const tilesetImage = TilesetGenerator.generateDefaultTileset(tileSize, cols, rows);
    
    // Register with AssetLoader immediately
    AssetLoader.images.set('default-tileset', tilesetImage);
    
    // Update tilemap with tileset info
    this.currentLevel.tilemap.tilesetImage = 'default-tileset';
    this.currentLevel.tilemap.tilesetColumns = cols;
    this.currentLevel.tilemap.tilesetRows = rows;
  }

  private updateGridMetrics(): void {
    const gridWidth = this.currentLevel.tilemap.width * this.currentLevel.tilemap.tileSize;
    const gridHeight = this.currentLevel.tilemap.height * this.currentLevel.tilemap.tileSize;
    this.gridOffset.x = -gridWidth / 2;
    this.gridOffset.y = -gridHeight / 2;
    this.camera.position.x = this.gridOffset.x;
    this.camera.position.y = this.gridOffset.y;
  }

  refreshTilemapMetrics(): void {
    this.updateGridMetrics();
  }

  private setupUI(): void {
    // UI setup will be handled by the HTML/CSS
  }

  setTool(tool: EditorTool): void {
    this.currentTool = tool;
    console.log(`Tool set to: ${tool}`);
  }

  getTool(): EditorTool {
    return this.currentTool;
  }

  setActiveLayer(layer: number): void {
    this.activeLayer = layer;
  }

  getActiveLayer(): number {
    return this.activeLayer;
  }

  setZoom(zoom: number): void {
    this.viewControls.setTargetZoom(zoom);
    this.zoom = Math.max(0.1, Math.min(5, zoom));
    this.camera.zoom = this.zoom;
  }

  getZoom(): number {
    return this.viewControls.getCurrentZoom();
  }
  
  // New system getters
  getViewControls(): ViewControls {
    return this.viewControls;
  }
  
  getSelectionSystem(): SelectionSystem {
    return this.selectionSystem;
  }
  
  getLayerSystem(): LayerSystem {
    return this.layerSystem;
  }
  
  getPaintingTools(): PaintingTools {
    return this.paintingTools;
  }
  
  getUndoSystem(): UndoSystem {
    return this.undoSystem;
  }
  
  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }
  
  getGridOffset(): Vector2 {
    return this.gridOffset.copy();
  }
  
  setGridOffset(offset: Vector2): void {
    this.gridOffset = offset.copy();
  }

  update(deltaTime: number): void {
    // IMPORTANT: Check mouse button down BEFORE Input.update() clears it
    // We need to capture the state before it's cleared in the next frame
    const mouseButtonDown = Input.getMouseButtonDown(0);
    const mouseButton = Input.getMouseButton(0);
    
    this.mousePosition = Input.getMousePosition();
    
    // Update smooth zoom
    this.zoom = this.viewControls.updateZoom(deltaTime);
    this.camera.zoom = this.zoom;

    // Handle panning (middle mouse or space + drag)
    if (Input.getMouseButton(2) || (Input.getKey(' ') && mouseButton)) {
      if (Input.getKey(' ') && mouseButton) {
        // Space + drag panning
        if (!this.viewControls.isSpacePanning()) {
          this.viewControls.startSpacePan(this.mousePosition);
        }
        this.gridOffset = this.viewControls.updateSpacePan(this.mousePosition, this.gridOffset, this.zoom);
      } else if (Input.getMouseButton(2)) {
        // Middle mouse button
        if (!this.panning) {
          this.panning = true;
          this.panStart = this.mousePosition.copy();
        } else {
          const delta = Vector2.subtract(this.panStart, this.mousePosition);
          this.gridOffset.add(Vector2.multiply(delta, 1 / this.zoom));
          this.panStart = this.mousePosition.copy();
        }
      }
    } else {
      this.panning = false;
      if (this.viewControls.isSpacePanning()) {
        this.viewControls.stopSpacePan();
      }
    }

    // Update tools - convert screen to world coordinates accounting for centered grid
    const viewportWidth = this.renderer.getWidth();
    const viewportHeight = this.renderer.getHeight();
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    // Convert screen coordinates to world coordinates
    // The rendering transform is: translate(center) -> scale(zoom) -> translate(gridOffset)
    // To reverse this: world = (screen - center) / zoom - gridOffset
    // gridOffset is negative, so subtracting it moves into grid space
    const worldX = (this.mousePosition.x - centerX) / this.zoom - this.gridOffset.x;
    const worldY = (this.mousePosition.y - centerY) / this.zoom - this.gridOffset.y;
    const worldPos = new Vector2(worldX, worldY);
    
    // Update active layer in tilemap editor
    this.tilemapEditor.setActiveLayer(this.activeLayer);
    
    // Update tool in tilemap editor
    this.tilemapEditor.setTool(this.currentTool);
    
    // Debug: log mouse click
    if (mouseButtonDown) {
      console.log(`✓ Mouse click detected! Tool: ${this.currentTool}, WorldPos: (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}), ScreenPos: (${this.mousePosition.x}, ${this.mousePosition.y})`);
    }
    
    // Handle keyboard shortcuts
    if (Input.getKeyDown('z') && (Input.getKey('Control') || Input.getKey('Meta'))) {
      if (Input.getKey('Shift')) {
        this.undoSystem.redo();
      } else {
        this.undoSystem.undo();
      }
    }
    
    // Handle arrow key nudging for selection
    if (this.currentTool === EditorTool.Select) {
      const nudgeDir = new Vector2(0, 0);
      if (Input.getKeyDown('ArrowLeft')) nudgeDir.x = -1;
      if (Input.getKeyDown('ArrowRight')) nudgeDir.x = 1;
      if (Input.getKeyDown('ArrowUp')) nudgeDir.y = -1;
      if (Input.getKeyDown('ArrowDown')) nudgeDir.y = 1;
      
      if (nudgeDir.x !== 0 || nudgeDir.y !== 0) {
        const gridStep = this.viewControls.getSettings().gridSize;
        const useGrid = this.viewControls.getSettings().snapToGrid;
        this.selectionSystem.nudge(nudgeDir, gridStep, useGrid);
      }
    }
    
    if (this.currentTool === EditorTool.Spawn) {
      if (mouseButtonDown) {
        const tileSize = this.currentLevel.tilemap.tileSize;
        const tileX = Math.floor(worldPos.x / tileSize);
        const tileY = Math.floor(worldPos.y / tileSize);
        const clampedX = Math.max(0, Math.min(this.currentLevel.tilemap.width - 1, tileX));
        const clampedY = Math.max(0, Math.min(this.currentLevel.tilemap.height - 1, tileY));
        this.currentLevel.spawnPoint = {
          x: clampedX * tileSize,
          y: clampedY * tileSize
        };
      }
    } else if (this.currentTool === EditorTool.Door) {
      const tileSize = this.currentLevel.tilemap.tileSize;
      const tileX = Math.floor(worldPos.x / tileSize);
      const tileY = Math.floor(worldPos.y / tileSize);
      const clampedX = Math.max(0, Math.min(this.currentLevel.tilemap.width - 1, tileX));
      const clampedY = Math.max(0, Math.min(this.currentLevel.tilemap.height - 1, tileY));

      if (mouseButtonDown) {
        this.doorStretchStart = new Vector2(clampedX, clampedY);
        this.doorStretchEnd = new Vector2(clampedX, clampedY);
        const hasExistingDoor = !!this.currentLevel.getDoorAt(clampedX, clampedY);
        this.isDoorStretching = Input.getKey('Shift');
        this.doorEditExisting = hasExistingDoor && !this.isDoorStretching;
      }

      if (mouseButton && this.isDoorStretching && this.doorStretchStart) {
        this.doorStretchEnd = new Vector2(clampedX, clampedY);
      }

      if (Input.getMouseButtonUp(0) && this.doorStretchStart) {
        const endPoint = this.isDoorStretching && this.doorStretchEnd
          ? this.doorStretchEnd
          : this.doorStretchStart;
        this.finalizeDoorPlacement(this.doorStretchStart, endPoint, this.doorEditExisting);
        this.isDoorStretching = false;
        this.doorStretchStart = null;
        this.doorStretchEnd = null;
        this.doorEditExisting = false;
      }
    } else if (this.currentTool === EditorTool.Paint || this.currentTool === EditorTool.Erase || this.currentTool === EditorTool.Collision || 
        this.currentTool === EditorTool.Brush || this.currentTool === EditorTool.FloodFill || this.currentTool === EditorTool.Line || 
        this.currentTool === EditorTool.Rectangle || this.currentTool === EditorTool.Eyedropper) {
      // Pass mouse button state to tilemap editor
      this.tilemapEditor.update(deltaTime, worldPos, this.camera, this.zoom, viewportWidth, viewportHeight, mouseButtonDown, mouseButton);
    } else if (this.currentTool === EditorTool.Entity) {
      this.entityPlacer.update(deltaTime, worldPos, this.camera, this.zoom, viewportWidth, viewportHeight);
    } else if (this.currentTool === EditorTool.Select) {
      // Handle selection
      if (mouseButtonDown) {
        const shiftKey = Input.getKey('Shift');
        this.selectionSystem.selectAtPoint(worldPos, shiftKey);
      }
      
      if (Input.getMouseButton(0) && !mouseButtonDown) {
        // Box select
        if (!this.selectionSystem.isBoxSelectingActive()) {
          const shiftKey = Input.getKey('Shift');
          this.selectionSystem.startBoxSelect(worldPos, shiftKey);
        } else {
          this.selectionSystem.updateBoxSelect(worldPos);
        }
      }
      
      if (Input.getMouseButtonUp(0)) {
        this.selectionSystem.endBoxSelect();
      }
    }
  }

  render(): void {
    this.renderer.clear('#2a2a2a');

    const viewportWidth = this.renderer.getWidth();
    const viewportHeight = this.renderer.getHeight();
    
    // Render rulers (before transform)
    this.viewControls.renderRulers(this.renderer, this.gridOffset, this.zoom, viewportWidth, viewportHeight);

    // Apply camera transform - center the grid
    this.renderer.save();
    
    // Center the grid in the viewport
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    this.renderer.translate(centerX, centerY);
    this.renderer.scale(this.zoom, this.zoom);
    this.renderer.translate(this.gridOffset.x, this.gridOffset.y);

    // Render layout boundary
    this.viewControls.renderLayoutBoundary(this.renderer, this.gridOffset, this.zoom, viewportWidth, viewportHeight);

    // Render grid overlay
    this.viewControls.renderGrid(this.renderer, this.gridOffset, this.zoom, viewportWidth, viewportHeight, this.currentLevel.tilemap.tileSize);

    // Render tilemap
    this.tilemapEditor.render(this.renderer);

    this.renderDoorMarkers();
    this.renderDoorStretchPreview();

    // Render spawn point marker
    if (this.currentLevel.spawnPoint) {
      const tileSize = this.currentLevel.tilemap.tileSize;
      const ctx = this.renderer.getContext();
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.currentLevel.spawnPoint.x,
        this.currentLevel.spawnPoint.y,
        tileSize,
        tileSize
      );
      ctx.beginPath();
      ctx.moveTo(this.currentLevel.spawnPoint.x, this.currentLevel.spawnPoint.y);
      ctx.lineTo(this.currentLevel.spawnPoint.x + tileSize, this.currentLevel.spawnPoint.y + tileSize);
      ctx.moveTo(this.currentLevel.spawnPoint.x + tileSize, this.currentLevel.spawnPoint.y);
      ctx.lineTo(this.currentLevel.spawnPoint.x, this.currentLevel.spawnPoint.y + tileSize);
      ctx.stroke();
    }

    // Render entities
    this.entityPlacer.render(this.renderer);
    
    // Render selection and transform handles
    this.selectionSystem.render(this.renderer, this.zoom);

    // Render grid boundary (legacy)
    this.renderGrid();

    this.renderer.restore();
    
    // Render minimap (after transform)
    const gridWidth = this.currentLevel.tilemap.width * this.currentLevel.tilemap.tileSize;
    const gridHeight = this.currentLevel.tilemap.height * this.currentLevel.tilemap.tileSize;
    this.viewControls.renderMinimap(
      this.renderer,
      viewportWidth,
      viewportHeight,
      gridWidth,
      gridHeight,
      this.gridOffset.x,
      this.gridOffset.y,
      this.zoom
    );
  }

  private renderGrid(): void {
    const tileSize = this.currentLevel.tilemap.tileSize;
    const gridWidth = this.currentLevel.tilemap.width * tileSize;
    const gridHeight = this.currentLevel.tilemap.height * tileSize;
    
    const startX = 0;
    const endX = gridWidth;
    const startY = 0;
    const endY = gridHeight;

    const ctx = this.renderer.getContext();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;

    // Draw grid lines
    for (let x = startX; x <= endX; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw grid boundary
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, gridWidth, gridHeight);
  }

  private finalizeDoorPlacement(start: Vector2, end: Vector2, preserveExistingTile: boolean = false): void {
    const minX = Math.max(0, Math.min(start.x, end.x));
    const maxX = Math.min(this.currentLevel.tilemap.width - 1, Math.max(start.x, end.x));
    const minY = Math.max(0, Math.min(start.y, end.y));
    const maxY = Math.min(this.currentLevel.tilemap.height - 1, Math.max(start.y, end.y));
    const existingDoor = this.currentLevel.getDoorAt(start.x, start.y);
    const targetLevel = prompt(
      existingDoor
        ? 'Door target level name (blank to remove)'
        : 'Door target level name',
      existingDoor?.targetLevel || ''
    );
    if (targetLevel === null) return;

    const doorsLayer = this.currentLevel.tilemap.getLayer('Doors') || this.currentLevel.tilemap.addLayer('Doors');
    const selectedTile = this.tilemapEditor.getSelectedTile();
    const trimmedTarget = targetLevel.trim();
    const isSingleTile = minX === maxX && minY === maxY;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (trimmedTarget.length === 0) {
          this.currentLevel.removeDoorAt(x, y);
          this.currentLevel.tilemap.setTile(doorsLayer.name, x, y, 0);
        } else {
          this.currentLevel.upsertDoor({
            x,
            y,
            targetLevel: trimmedTarget
          });
          const shouldPreserve = preserveExistingTile && isSingleTile;
          const existingTile = this.currentLevel.tilemap.getTile(doorsLayer.name, x, y);
          const nextTile = shouldPreserve && existingTile !== 0 ? existingTile : selectedTile;
          this.currentLevel.tilemap.setTile(doorsLayer.name, x, y, nextTile);
        }
      }
    }
  }

  private renderDoorStretchPreview(): void {
    if (this.currentTool !== EditorTool.Door || !this.doorStretchStart) return;
    const endPoint = this.doorStretchEnd ?? this.doorStretchStart;
    const minX = Math.min(this.doorStretchStart.x, endPoint.x);
    const maxX = Math.max(this.doorStretchStart.x, endPoint.x);
    const minY = Math.min(this.doorStretchStart.y, endPoint.y);
    const maxY = Math.max(this.doorStretchStart.y, endPoint.y);
    const tileSize = this.currentLevel.tilemap.tileSize;

    const ctx = this.renderer.getContext();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      minX * tileSize,
      minY * tileSize,
      (maxX - minX + 1) * tileSize,
      (maxY - minY + 1) * tileSize
    );
  }

  private renderDoorMarkers(): void {
    const doors = this.currentLevel.doors;
    if (!doors || doors.length === 0) return;
    const tileSize = this.currentLevel.tilemap.tileSize;
    const ctx = this.renderer.getContext();
    ctx.strokeStyle = '#ff2fbf';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 47, 191, 0.2)';

    for (const door of doors) {
      const x = door.x * tileSize;
      const y = door.y * tileSize;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + tileSize - 4, y + tileSize - 4);
      ctx.moveTo(x + tileSize - 4, y + 4);
      ctx.lineTo(x + 4, y + tileSize - 4);
      ctx.stroke();
    }
  }

  getLevel(): Level {
    return this.currentLevel;
  }

  getPropertyInspector(): PropertyInspector {
    return this._propertyInspector;
  }

  getTilemapEditor(): TilemapEditor {
    return this.tilemapEditor;
  }

  loadLevel(level: Level): void {
    this.currentLevel = level;
    this.tilemapEditor = new TilemapEditor(level.tilemap, this.undoSystem, this.collisionSystem);
    this.entityPlacer = new EntityPlacer(level);
    this.updateGridMetrics();
  }

  saveLevel(): string {
    return JSON.stringify(this.currentLevel.toJSON(), null, 2);
  }
}
