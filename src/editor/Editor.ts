import { Game } from '../engine/Game';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { TilemapEditor } from './TilemapEditor';
import { EntityPlacer } from './EntityPlacer';
import { PropertyInspector } from './PropertyInspector';
import { Level } from '../data/Level';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';

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

  private tilemapEditor: TilemapEditor;
  private entityPlacer: EntityPlacer;
  private propertyInspector: PropertyInspector;

  constructor(canvas: HTMLCanvasElement) {
    this.game = new Game(canvas);
    this.renderer = this.game.getRenderer();
    this.currentLevel = new Level('Layout 1');
    this.camera = new Camera();
    this.tilemapEditor = new TilemapEditor(this.currentLevel.tilemap);
    this.entityPlacer = new EntityPlacer(this.currentLevel);
    this.propertyInspector = new PropertyInspector();
    this.setupUI();
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
    const canvas = this.renderer.getCanvas();
    this.mousePosition = Input.getMousePosition();

    // Handle panning
    if (Input.getMouseButton(2)) {
      // Middle mouse button
      if (!this.panning) {
        this.panning = true;
        this.panStart = this.mousePosition.copy();
      } else {
        const delta = Vector2.subtract(this.panStart, this.mousePosition);
        this.camera.position.add(Vector2.multiply(delta, 1 / this.zoom));
        this.panStart = this.mousePosition.copy();
      }
    } else {
      this.panning = false;
    }

    // Handle zoom with mouse wheel
    // (Would need to add wheel event listener)

    // Update tools
    const viewportWidth = this.renderer.getWidth();
    const viewportHeight = this.renderer.getHeight();
    
    if (this.currentTool === EditorTool.Paint || this.currentTool === EditorTool.Erase) {
      this.tilemapEditor.update(deltaTime, this.mousePosition, this.camera, this.zoom, viewportWidth, viewportHeight);
    } else if (this.currentTool === EditorTool.Entity) {
      this.entityPlacer.update(deltaTime, this.mousePosition, this.camera, this.zoom, viewportWidth, viewportHeight);
    }
  }

  render(): void {
    this.renderer.clear('#2a2a2a');

    // Apply camera transform
    this.renderer.save();
    this.renderer.translate(
      this.renderer.getWidth() / 2 - this.camera.position.x * this.zoom,
      this.renderer.getHeight() / 2 - this.camera.position.y * this.zoom
    );
    this.renderer.scale(this.zoom, this.zoom);

    // Render tilemap
    this.tilemapEditor.render(this.renderer);

    // Render entities
    this.entityPlacer.render(this.renderer);

    // Render grid
    this.renderGrid();

    this.renderer.restore();
  }

  private renderGrid(): void {
    const tileSize = this.currentLevel.tilemap.tileSize;
    const startX = Math.floor(this.camera.position.x / tileSize) * tileSize;
    const endX = startX + (this.renderer.getWidth() / this.zoom / tileSize + 2) * tileSize;
    const startY = Math.floor(this.camera.position.y / tileSize) * tileSize;
    const endY = startY + (this.renderer.getHeight() / this.zoom / tileSize + 2) * tileSize;

    this.renderer.getContext().strokeStyle = '#444444';
    this.renderer.getContext().lineWidth = 1;

    for (let x = startX; x <= endX; x += tileSize) {
      this.renderer.getContext().beginPath();
      this.renderer.getContext().moveTo(x, startY);
      this.renderer.getContext().lineTo(x, endY);
      this.renderer.getContext().stroke();
    }

    for (let y = startY; y <= endY; y += tileSize) {
      this.renderer.getContext().beginPath();
      this.renderer.getContext().moveTo(startX, y);
      this.renderer.getContext().lineTo(endX, y);
      this.renderer.getContext().stroke();
    }
  }

  getLevel(): Level {
    return this.currentLevel;
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

