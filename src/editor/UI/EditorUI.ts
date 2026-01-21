import { TileSelector } from './TileSelector';
import { EditorTool } from '../Editor';

export class EditorUI {
  private container: HTMLElement;
  private topBar!: HTMLElement;
  private canvasContainer!: HTMLElement;
  private sidebar!: HTMLElement;
  private statusBar!: HTMLElement;
  private tabs!: HTMLElement;
  private tileSelector!: TileSelector;
  private toolButtons: Map<EditorTool, HTMLButtonElement> = new Map();
  private onToolChanged?: (tool: EditorTool) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupUI();
  }

  private setupUI(): void {
    // Top bar
    this.topBar = document.createElement('div');
    this.topBar.className = 'editor-top-bar';
    this.topBar.innerHTML = `
      <div class="top-bar-left">
        <button class="btn-menu">Menu</button>
        <div class="control-buttons">
          <button class="btn-control" id="btn-undo" title="Undo">↶</button>
          <button class="btn-control" id="btn-redo" title="Redo">↷</button>
          <button class="btn-control" id="btn-play" title="Play">▶</button>
          <button class="btn-control" id="btn-stop" title="Stop">■</button>
          <button class="btn-control" id="btn-pause" title="Pause">⏸</button>
        </div>
        <div class="tabs-container" id="tabs-container"></div>
      </div>
      <div class="top-bar-right">
        <button class="btn-buy">Buy now</button>
        <span class="edition-label">Free edition</span>
        <span class="username">Ethernaldev</span>
      </div>
    `;

    // Canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'editor-canvas-container';
    this.canvasContainer.innerHTML = '<canvas id="editor-canvas"></canvas>';

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'editor-sidebar';
    this.sidebar.innerHTML = `
      <div class="sidebar-section">
        <h3>Tools</h3>
        <div class="tool-buttons">
          <button class="tool-btn active" id="tool-select" title="Select (1)">Select</button>
          <button class="tool-btn" id="tool-paint" title="Paint (2)">Paint</button>
          <button class="tool-btn" id="tool-erase" title="Erase (3)">Erase</button>
          <button class="tool-btn" id="tool-entity" title="Entity (4)">Entity</button>
        </div>
      </div>
      <div class="sidebar-section">
        <h3>Layers</h3>
        <select class="layer-select" id="layer-select">
          <option value="0">Layer 0</option>
        </select>
        <button class="btn-small" id="btn-add-layer">Add Layer</button>
      </div>
      <div class="sidebar-section">
        <h3>Level</h3>
        <input type="text" class="level-name-input" id="level-name-input" placeholder="Level name" value="Layout 1">
        <div class="level-buttons">
          <button class="btn-small" id="btn-save">Save</button>
          <button class="btn-small" id="btn-load">Load</button>
        </div>
      </div>
      <div class="sidebar-section">
        <h3>Assets</h3>
        <input type="text" class="search-input" placeholder="Search assets...">
      </div>
      <div class="sidebar-section">
        <h3>Tile Selector</h3>
        <select class="tileset-select" id="tileset-select">
          <option>Select a tileset...</option>
        </select>
        <div class="tile-preview" id="tile-preview"></div>
        <div class="tile-info">No tile selected</div>
      </div>
    `;

    // Status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'editor-status-bar';
    this.statusBar.innerHTML = `
      <span id="mouse-pos">Mouse: (0, 0)</span>
      <span id="active-layer">Active layer: Layer 0</span>
      <span id="zoom-level">Zoom: 100%</span>
    `;

    // Assemble
    this.container.appendChild(this.topBar);
    this.container.appendChild(this.canvasContainer);
    this.container.appendChild(this.sidebar);
    this.container.appendChild(this.statusBar);

    // Initialize tabs
    this.tabs = document.getElementById('tabs-container')!;
    this.addTab('Layout 1', true);

    // Initialize tile selector
    this.tileSelector = new TileSelector(this.sidebar);
    
    // Initialize tool buttons
    this.setupToolButtons();
  }

  private setupToolButtons(): void {
    const selectBtn = document.getElementById('tool-select') as HTMLButtonElement;
    const paintBtn = document.getElementById('tool-paint') as HTMLButtonElement;
    const eraseBtn = document.getElementById('tool-erase') as HTMLButtonElement;
    const entityBtn = document.getElementById('tool-entity') as HTMLButtonElement;

    if (selectBtn) {
      this.toolButtons.set(EditorTool.Select, selectBtn);
      selectBtn.addEventListener('click', () => this.setTool(EditorTool.Select));
    }
    if (paintBtn) {
      this.toolButtons.set(EditorTool.Paint, paintBtn);
      paintBtn.addEventListener('click', () => this.setTool(EditorTool.Paint));
    }
    if (eraseBtn) {
      this.toolButtons.set(EditorTool.Erase, eraseBtn);
      eraseBtn.addEventListener('click', () => this.setTool(EditorTool.Erase));
    }
    if (entityBtn) {
      this.toolButtons.set(EditorTool.Entity, entityBtn);
      entityBtn.addEventListener('click', () => this.setTool(EditorTool.Entity));
    }
  }

  setTool(tool: EditorTool): void {
    console.log(`EditorUI.setTool called with: ${tool}`);
    // Update button states
    this.toolButtons.forEach((btn, toolType) => {
      if (btn) {
        btn.classList.toggle('active', toolType === tool);
      }
    });
    
    if (this.onToolChanged) {
      console.log(`Calling onToolChanged callback with: ${tool}`);
      this.onToolChanged(tool);
    } else {
      console.warn('onToolChanged callback not set!');
    }
  }

  setOnToolChanged(callback: (tool: EditorTool) => void): void {
    this.onToolChanged = callback;
  }

  getToolButtons(): Map<EditorTool, HTMLButtonElement> {
    return this.toolButtons;
  }

  getLayerSelect(): HTMLSelectElement | null {
    return document.getElementById('layer-select') as HTMLSelectElement;
  }

  getLevelNameInput(): HTMLInputElement | null {
    return document.getElementById('level-name-input') as HTMLInputElement;
  }

  getSaveButton(): HTMLButtonElement | null {
    return document.getElementById('btn-save') as HTMLButtonElement;
  }

  getLoadButton(): HTMLButtonElement | null {
    return document.getElementById('btn-load') as HTMLButtonElement;
  }

  getAddLayerButton(): HTMLButtonElement | null {
    return document.getElementById('btn-add-layer') as HTMLButtonElement;
  }

  updateLayerSelect(layers: Array<{ name: string; index: number }>, activeIndex: number): void {
    const select = this.getLayerSelect();
    if (!select) return;

    select.innerHTML = '';
    layers.forEach((layer) => {
      const option = document.createElement('option');
      option.value = layer.index.toString();
      option.textContent = layer.name;
      if (layer.index === activeIndex) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  getTileSelector(): TileSelector {
    return this.tileSelector;
  }

  addTab(name: string, active: boolean = false): void {
    const tab = document.createElement('div');
    tab.className = `tab ${active ? 'active' : ''}`;
    tab.innerHTML = `
      <span>${name}</span>
      <button class="tab-close">×</button>
    `;
    this.tabs.appendChild(tab);
  }

  updateMousePosition(x: number, y: number): void {
    const mousePos = document.getElementById('mouse-pos');
    if (mousePos) {
      mousePos.textContent = `Mouse: (${Math.round(x)}, ${Math.round(y)})`;
    }
  }

  updateActiveLayer(layer: number): void {
    const activeLayer = document.getElementById('active-layer');
    if (activeLayer) {
      activeLayer.textContent = `Active layer: Layer ${layer}`;
    }
  }

  updateZoom(zoom: number): void {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
    }
  }

  getCanvas(): HTMLCanvasElement {
    const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    return canvas;
  }
}

