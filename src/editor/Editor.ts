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

export enum EditorTool {
  Select = 'select',
  Paint = 'paint',
  Erase = 'erase',
  Entity = 'entity'
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

  private tilemapEditor: TilemapEditor;
  private entityPlacer: EntityPlacer;
  private _propertyInspector: PropertyInspector;

  constructor(canvas: HTMLCanvasElement) {
    this.game = new Game(canvas);
    this.renderer = this.game.getRenderer();
    this.currentLevel = new Level('Layout 1');
    
    // Initialize with default tileset
    this.initializeTileset();
    
    this.camera = new Camera();
    
    // Center the 256x256 grid (8x8 tiles * 32px = 256x256)
    const gridSize = 256;
    this.gridOffset.x = -gridSize / 2;
    this.gridOffset.y = -gridSize / 2;
    this.camera.position.x = this.gridOffset.x;
    this.camera.position.y = this.gridOffset.y;
    
    this.tilemapEditor = new TilemapEditor(this.currentLevel.tilemap);
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

  private setupUI(): void {
    // UI setup will be handled by the HTML/CSS
  }

  setTool(tool: EditorTool): void {
    this.currentTool = tool;
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
    this.zoom = Math.max(0.1, Math.min(5, zoom));
    this.camera.zoom = this.zoom;
  }

  getZoom(): number {
    return this.zoom;
  }

  update(deltaTime: number): void {
    this.mousePosition = Input.getMousePosition();

    // Handle panning
    if (Input.getMouseButton(2)) {
      // Middle mouse button
      if (!this.panning) {
        this.panning = true;
        this.panStart = this.mousePosition.copy();
      } else {
        const delta = Vector2.subtract(this.panStart, this.mousePosition);
        this.gridOffset.add(Vector2.multiply(delta, 1 / this.zoom));
        this.panStart = this.mousePosition.copy();
      }
    } else {
      this.panning = false;
    }

    // Update tools - convert screen to world coordinates accounting for centered grid
    const viewportWidth = this.renderer.getWidth();
    const viewportHeight = this.renderer.getHeight();
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    // Convert screen coordinates to world coordinates (accounting for grid offset and zoom)
    const worldX = (this.mousePosition.x - centerX) / this.zoom - this.gridOffset.x;
    const worldY = (this.mousePosition.y - centerY) / this.zoom - this.gridOffset.y;
    const worldPos = new Vector2(worldX, worldY);
    
    if (this.currentTool === EditorTool.Paint || this.currentTool === EditorTool.Erase) {
      this.tilemapEditor.update(deltaTime, worldPos, this.camera, this.zoom, viewportWidth, viewportHeight);
    } else if (this.currentTool === EditorTool.Entity) {
      this.entityPlacer.update(deltaTime, worldPos, this.camera, this.zoom, viewportWidth, viewportHeight);
    }
  }

  render(): void {
    this.renderer.clear('#2a2a2a');

    // Apply camera transform - center the grid
    this.renderer.save();
    const viewportWidth = this.renderer.getWidth();
    const viewportHeight = this.renderer.getHeight();
    
    // Center the grid in the viewport
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    this.renderer.translate(centerX, centerY);
    this.renderer.scale(this.zoom, this.zoom);
    this.renderer.translate(this.gridOffset.x, this.gridOffset.y);

    // Render tilemap
    this.tilemapEditor.render(this.renderer);

    // Render entities
    this.entityPlacer.render(this.renderer);

    // Render grid (only within 256x256 area)
    this.renderGrid();

    this.renderer.restore();
  }

  private renderGrid(): void {
    const tileSize = this.currentLevel.tilemap.tileSize;
    const GRID_SIZE = 256; // 8x8 tiles * 32px
    
    // Only render grid within the 256x256 area
    const startX = 0;
    const endX = GRID_SIZE;
    const startY = 0;
    const endY = GRID_SIZE;

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
    ctx.strokeRect(startX, startY, GRID_SIZE, GRID_SIZE);
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
    this.tilemapEditor = new TilemapEditor(level.tilemap);
    this.entityPlacer = new EntityPlacer(level);
  }

  saveLevel(): string {
    return JSON.stringify(this.currentLevel.toJSON(), null, 2);
  }
}

