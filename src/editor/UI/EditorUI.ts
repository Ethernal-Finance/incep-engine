export class EditorUI {
  private container: HTMLElement;
  private topBar: HTMLElement;
  private canvasContainer: HTMLElement;
  private sidebar: HTMLElement;
  private statusBar: HTMLElement;
  private tabs: HTMLElement;

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
    return document.getElementById('editor-canvas') as HTMLCanvasElement;
  }
}

