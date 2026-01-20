import { Game } from '../engine/Game';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Vector2 } from '../utils/Vector2';
import { Level } from '../data/Level';
import { Tilemap } from '../data/Tilemap';
import { TilemapEditor } from './TilemapEditor';
import { EntityPlacer } from './EntityPlacer';
import { PropertyInspector } from './PropertyInspector';
import { AssetManager } from './AssetManager';
import { TileSelector } from './TileSelector';

export enum EditorTool {
  Select = 'select',
  Paint = 'paint',
  Erase = 'erase',
  Entity = 'entity',
  Collision = 'collision'
}

export class Editor {
  private game: Game;
  private renderer: Renderer;
  private level: Level | null = null;
  private currentTool: EditorTool = EditorTool.Select;
  private cameraPosition: Vector2 = Vector2.zero();
  private cameraZoom: number = 1;
  private isPanning: boolean = false;
  private lastMousePos: Vector2 = Vector2.zero();

  private tilemapEditor: TilemapEditor;
  private entityPlacer: EntityPlacer;
  private propertyInspector: PropertyInspector;
  private tileSelector: TileSelector | null = null;

  constructor(game: Game) {
    this.game = game;
    this.renderer = game.getRenderer();
    this.tilemapEditor = new TilemapEditor(this);
    this.entityPlacer = new EntityPlacer(this);
    this.propertyInspector = new PropertyInspector(this);
    this.initializeEditor();
  }

  private async initializeEditor(): Promise<void> {
    await AssetManager.initialize();
    this.setupUI();
    this.setupAssetBrowser();
    this.setupTileSelector();
  }

  private setupUI(): void {
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'editor-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: #2a2a3e;
      border-bottom: 2px solid #444;
      display: flex;
      align-items: center;
      padding: 0 20px;
      z-index: 1000;
      gap: 10px;
    `;

    // Tool buttons
    const tools = [
      { tool: EditorTool.Select, label: 'Select', icon: '👆' },
      { tool: EditorTool.Paint, label: 'Paint', icon: '🖌️' },
      { tool: EditorTool.Erase, label: 'Erase', icon: '🧹' },
      { tool: EditorTool.Entity, label: 'Entity', icon: '👤' },
      { tool: EditorTool.Collision, label: 'Collision', icon: '⬛' }
    ];

    tools.forEach(({ tool, label, icon }) => {
      const btn = document.createElement('button');
      btn.textContent = `${icon} ${label}`;
      btn.style.cssText = `
        padding: 8px 16px;
        background: #3a3a4e;
        color: white;
        border: 1px solid #555;
        cursor: pointer;
        border-radius: 4px;
      `;
      btn.onclick = () => this.setTool(tool);
      toolbar.appendChild(btn);
    });

    // Save/Load buttons
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    saveBtn.style.cssText = `
      padding: 8px 16px;
      background: #4a8;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      margin-left: auto;
    `;
    saveBtn.onclick = () => this.saveLevel();
    toolbar.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = '📂 Load';
    loadBtn.style.cssText = saveBtn.style.cssText;
    loadBtn.style.background = '#48a';
    loadBtn.onclick = () => this.loadLevel();
    toolbar.appendChild(loadBtn);

    document.body.appendChild(toolbar);

    // Create side panels
    this.createLayerPanel();
    this.propertyInspector.createPanel();
  }

  private createLayerPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'editor-layer-panel';
    panel.style.cssText = `
      position: fixed;
      left: 0;
      top: 50px;
      width: 200px;
      bottom: 0;
      background: #1a1a2e;
      border-right: 2px solid #444;
      padding: 20px;
      overflow-y: auto;
      z-index: 999;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Layers';
    title.style.color = 'white';
    panel.appendChild(title);

    document.body.appendChild(panel);
  }

  private setupAssetBrowser(): void {
    const treeContainer = document.getElementById('projectTree');
    if (!treeContainer) return;

    // Clear existing content
    treeContainer.innerHTML = '';

    // Build tree from assets
    const assets = AssetManager.getAssets();
    this.renderAssetTree(assets, treeContainer, 0);

    // Setup search
    const searchInput = document.getElementById('projectSearch') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.filterAssetTree(query);
      });
    }
  }

  private renderAssetTree(assets: any[], container: HTMLElement, level: number): void {
    for (const asset of assets) {
      const item = document.createElement('div');
      item.className = `tree-item ${asset.type}`;
      item.setAttribute('data-level', level.toString());
      item.setAttribute('data-path', asset.path);
      
      if (asset.type === 'folder') {
        const expand = document.createElement('span');
        expand.className = 'tree-expand';
        expand.textContent = '▶';
        
        const icon = document.createElement('span');
        icon.className = 'tree-item-icon';
        icon.textContent = '📁';
        
        const name = document.createElement('span');
        name.textContent = asset.name;
        
        item.appendChild(expand);
        item.appendChild(icon);
        item.appendChild(name);
        
        item.classList.add('collapsed');
        
        let isExpanded = false;
        const childrenContainer = document.createElement('div');
        childrenContainer.style.display = 'none';
        
        // Render children into a container
        if (asset.children && asset.children.length > 0) {
          this.renderAssetTree(asset.children, childrenContainer, level + 1);
          item.appendChild(childrenContainer);
        }
        
        expand.addEventListener('click', (e) => {
          e.stopPropagation();
          isExpanded = !isExpanded;
          expand.textContent = isExpanded ? '▼' : '▶';
          item.classList.toggle('collapsed');
          childrenContainer.style.display = isExpanded ? 'block' : 'none';
        });
      } else {
        const icon = AssetManager.isTilemapFile(asset.path) ? '🖼️' : 
                    AssetManager.isImageFile(asset.path) ? '🖼️' : '📄';
        item.innerHTML = `
          <span class="tree-item-icon">${icon}</span>
          <span>${asset.name}</span>
        `;
        
        // Handle file click
        item.addEventListener('click', () => {
          if (AssetManager.isTilemapFile(asset.path)) {
            this.loadTileset(asset.path);
            // Switch to Paint tool when tileset is loaded
            this.setTool(EditorTool.Paint);
          }
          
          // Update selection
          document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });
      }

      container.appendChild(item);
    }
  }

  private filterAssetTree(query: string): void {
    const treeContainer = document.getElementById('projectTree');
    if (!treeContainer) return;

    if (!query) {
      treeContainer.innerHTML = '';
      this.renderAssetTree(AssetManager.getAssets(), treeContainer, 0);
      return;
    }

    const results = AssetManager.searchAssets(query);
    treeContainer.innerHTML = '';
    this.renderAssetTree(results, treeContainer, 0);
  }

  private async loadTileset(imagePath: string): Promise<void> {
    const canvas = document.getElementById('tileSelectorCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    if (!this.tileSelector) {
      this.tileSelector = new TileSelector(canvas);
      this.tileSelector.setOnTileSelected((tileId) => {
        this.tilemapEditor.setSelectedTile(tileId);
      });
    }

    // Extract tile size from filename (e.g., "16x16" = 16)
    const tileSizeMatch = imagePath.match(/(\d+)x\d+/);
    const tileSize = tileSizeMatch ? parseInt(tileSizeMatch[1]) : 16;

    await this.tileSelector.loadTileset(imagePath, tileSize);
    
    // Update tilemap tileset and tile size if level exists
    if (this.level && this.tileSelector.getTileset()) {
      const tileset = this.tileSelector.getTileset();
      this.level.tilemap.tileset = tileset;
      // Update tile size to match tileset
      if (tileset) {
        this.level.tilemap.tileSize = tileset.tileWidth;
      }
    }
  }

  private setupTileSelector(): void {
    const canvas = document.getElementById('tileSelectorCanvas') as HTMLCanvasElement;
    if (canvas) {
      this.tileSelector = new TileSelector(canvas);
      this.tileSelector.setOnTileSelected((tileId) => {
        this.tilemapEditor.setSelectedTile(tileId);
      });
    }
  }

  setTool(tool: EditorTool): void {
    this.currentTool = tool;
    // Update UI to show selected tool
    document.querySelectorAll('#editor-toolbar button').forEach((btn, index) => {
      if (index < 5) { // Tool buttons
        (btn as HTMLElement).style.background = 
          index === Object.values(EditorTool).indexOf(tool) ? '#5a5a6e' : '#3a3a4e';
      }
    });
  }

  getTool(): EditorTool {
    return this.currentTool;
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level): void {
    this.level = level;
    this.tilemapEditor.setTilemap(level.tilemap);
  }

  createNewLevel(width: number, height: number, tileSize: number = 32): void {
    const tilemap = new Tilemap(width, height, tileSize);
    tilemap.addLayer('background');
    tilemap.addLayer('foreground');
    this.level = new Level('New Level', tilemap);
    this.setLevel(this.level);
  }

  update(deltaTime: number): void {
    if (!this.level) return;

    // Handle camera panning
    if (Input.getMouseButton(2) || (Input.getMouseButton(0) && Input.getKey('Space'))) {
      if (!this.isPanning) {
        this.isPanning = true;
        this.lastMousePos = Input.getMousePosition();
      } else {
        const currentMouse = Input.getMousePosition();
        const delta = currentMouse.subtract(this.lastMousePos);
        this.cameraPosition = this.cameraPosition.subtract(delta.divide(this.cameraZoom));
        this.lastMousePos = currentMouse;
      }
    } else {
      this.isPanning = false;
    }

    // Handle zoom
    const wheelDelta = Input.getMouseWheelDelta();
    if (wheelDelta !== 0) {
      const zoomFactor = wheelDelta > 0 ? 0.9 : 1.1;
      this.cameraZoom = Math.max(0.1, Math.min(5, this.cameraZoom * zoomFactor));
    }

    // Update renderer camera
    this.renderer.setCamera(this.cameraPosition, this.cameraZoom);

    // Update tools
    if (this.currentTool === EditorTool.Paint || this.currentTool === EditorTool.Erase) {
      this.tilemapEditor.update(deltaTime);
    } else if (this.currentTool === EditorTool.Entity) {
      this.entityPlacer.update(deltaTime);
    }
  }

  render(): void {
    if (!this.level) {
      this.renderer.clear('#ffffff');
      this.renderer.drawText(
        'No level loaded. Create a new level or load an existing one.',
        this.renderer.getWidth() / 2 - 200,
        this.renderer.getHeight() / 2,
        '#333333',
        '18px'
      );
      return;
    }

    // White background to match Construct 3 style
    this.renderer.clear('#ffffff');

    // Render tilemap
    this.tilemapEditor.render(this.renderer);

    // Render entities
    this.entityPlacer.render(this.renderer);

    // Render demo "Show message" button (matching the image)
    this.renderDemoButton();

    // Render grid (lighter grid for white background)
    this.renderGrid();
  }

  private renderDemoButton(): void {
    // Render a blue button similar to the image (positioned slightly left of center)
    const buttonX = this.renderer.getWidth() / 2 - 150;
    const buttonY = this.renderer.getHeight() / 2 - 20;
    const buttonWidth = 120;
    const buttonHeight = 40;

    // Draw button background
    this.renderer.fillRect(buttonX, buttonY, buttonWidth, buttonHeight, '#0078d4');
    
    // Draw button text
    const ctx = this.renderer.getContext();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Show message', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    ctx.restore();

    // Draw selection handles if button is "selected" (for demo purposes)
    const handleSize = 6;
    const handles = [
      { x: buttonX, y: buttonY }, // top-left
      { x: buttonX + buttonWidth / 2, y: buttonY }, // top-center
      { x: buttonX + buttonWidth, y: buttonY }, // top-right
      { x: buttonX, y: buttonY + buttonHeight / 2 }, // left-center
      { x: buttonX + buttonWidth, y: buttonY + buttonHeight / 2 }, // right-center
      { x: buttonX, y: buttonY + buttonHeight }, // bottom-left
      { x: buttonX + buttonWidth / 2, y: buttonY + buttonHeight }, // bottom-center
      { x: buttonX + buttonWidth, y: buttonY + buttonHeight }, // bottom-right
    ];

    handles.forEach(handle => {
      this.renderer.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize,
        '#ffffff'
      );
      this.renderer.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize,
        '#0078d4',
        1
      );
    });
  }

  private renderGrid(): void {
    if (!this.level) return;

    const tilemap = this.level.tilemap;
    const tileSize = tilemap.tileSize;
    const cameraX = this.cameraPosition.x;
    const cameraY = this.cameraPosition.y;
    const viewWidth = this.renderer.getWidth() / this.cameraZoom;
    const viewHeight = this.renderer.getHeight() / this.cameraZoom;

    const startX = Math.floor(cameraX / tileSize) * tileSize;
    const startY = Math.floor(cameraY / tileSize) * tileSize;
    const endX = Math.ceil((cameraX + viewWidth) / tileSize) * tileSize;
    const endY = Math.ceil((cameraY + viewHeight) / tileSize) * tileSize;

    this.renderer.save();
    this.renderer.getContext().strokeStyle = '#e0e0e0';
    this.renderer.getContext().lineWidth = 1;

    for (let x = startX; x <= endX; x += tileSize) {
      const screenPos = this.renderer.worldToScreen({ x, y: startY } as any);
      const screenEnd = this.renderer.worldToScreen({ x, y: endY } as any);
      this.renderer.getContext().beginPath();
      this.renderer.getContext().moveTo(screenPos.x, screenPos.y);
      this.renderer.getContext().lineTo(screenPos.x, screenEnd.y);
      this.renderer.getContext().stroke();
    }

    for (let y = startY; y <= endY; y += tileSize) {
      const screenPos = this.renderer.worldToScreen({ x: startX, y } as any);
      const screenEnd = this.renderer.worldToScreen({ x: endX, y } as any);
      this.renderer.getContext().beginPath();
      this.renderer.getContext().moveTo(screenPos.x, screenPos.y);
      this.renderer.getContext().lineTo(screenEnd.x, screenPos.y);
      this.renderer.getContext().stroke();
    }

    this.renderer.restore();
  }

  saveLevel(): void {
    if (!this.level) return;

    const data = JSON.stringify(this.level.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.level.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadLevel(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          const level = Level.fromJSON(data);
          this.setLevel(level);
        } catch (error) {
          alert('Failed to load level: ' + error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getCameraPosition(): Vector2 {
    return this.cameraPosition.clone();
  }

  getCameraZoom(): number {
    return this.cameraZoom;
  }

  getPropertyInspector(): PropertyInspector {
    return this.propertyInspector;
  }
}

